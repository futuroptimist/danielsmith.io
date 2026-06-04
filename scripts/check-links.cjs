#!/usr/bin/env node
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execFileAsync = promisify(execFile);

const repoRoot = path.resolve(__dirname, '..');
const DEFAULT_TIMEOUT_MS = Number(process.env.LINK_CHECK_TIMEOUT_MS ?? 10000);
const DEFAULT_RETRIES = Number(process.env.LINK_CHECK_RETRIES ?? 1);
const USER_AGENT =
  'danielsmith.io-link-check/1.0 (+https://github.com/futuroptimist/danielsmith.io)';

const ALLOWLIST = [
  {
    test: (url) =>
      url.hostname === 'img.shields.io' || url.hostname === 'codecov.io',
    reason:
      'badge and coverage hosts are frequently rate-limited or anti-bot in CI',
  },
  {
    test: (url) =>
      url.hostname === 'raw.githubusercontent.com' &&
      url.pathname.endsWith('.svg'),
    reason:
      'coverage SVG badges can lag repo permissions and should not block content checks',
  },
  {
    test: (url) => url.hostname === 'discord.gg',
    reason:
      'Discord invite endpoints often block automated HEAD/GET validation',
  },
  {
    test: (url) =>
      url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com',
    reason: 'YouTube commonly blocks automated proxy validation in CI',
  },
  {
    test: (url) => ['localhost', '127.0.0.1', '::1'].includes(url.hostname),
    reason:
      'local preview URLs are examples and are not expected to be running in CI',
  },
];

const LOCAL_ALLOWLIST = [
  {
    test: (targetPath) => targetPath.endsWith('docs/resume/2025-09/resume.pdf'),
    reason:
      'manual binary resume artifact is intentionally produced outside Codex changes',
  },
];

function walkFiles(root, predicate, files = []) {
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === '.git'
    )
      continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, files);
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripAnchor(value) {
  return value.split('#')[0];
}

function markdownFiles() {
  return [
    path.join(repoRoot, 'README.md'),
    ...walkFiles(path.join(repoRoot, 'docs'), (file) => file.endsWith('.md')),
  ];
}

function localeFiles() {
  return walkFiles(
    path.join(repoRoot, 'src', 'assets', 'i18n', 'locales'),
    (file) => file.endsWith('.ts')
  );
}

function collectMarkdownLinks() {
  const links = [];
  const markdownLinkPattern = /!??\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const referenceDefinitionPattern = /^\s*\[[^\]]+\]:\s*(\S+)/gm;
  const autolinkPattern = /<((?:https?:|mailto:)[^>\s]+)>/g;

  for (const file of markdownFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const relativeFile = path.relative(repoRoot, file);
    for (const pattern of [
      markdownLinkPattern,
      referenceDefinitionPattern,
      autolinkPattern,
    ]) {
      for (const match of source.matchAll(pattern)) {
        const href = match[1].trim().replace(/^<|>$/g, '');
        if (!href || href.startsWith('#')) continue;
        links.push({ href, source: relativeFile, type: 'docs' });
      }
    }
  }
  return links;
}

function collectPoiLinks() {
  const links = [];
  const hrefPattern = /href:\s*['`]([^'`]+)['`]/g;
  for (const file of localeFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const relativeFile = path.relative(repoRoot, file);
    for (const match of source.matchAll(hrefPattern)) {
      links.push({ href: match[1], source: relativeFile, type: 'poi' });
    }
  }
  return links;
}

function collectLinks() {
  const seen = new Set();
  const result = [];
  for (const link of [...collectPoiLinks(), ...collectMarkdownLinks()]) {
    const key = `${link.href}\0${link.source}\0${link.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(link);
    }
  }
  return result;
}

function classifyLink(link) {
  const { href, source } = link;
  if (/^(mailto:|tel:)/i.test(href)) return { kind: 'allowed-scheme' };
  if (/^https?:\/\//i.test(href)) {
    try {
      return { kind: 'http', url: new URL(href) };
    } catch (error) {
      return { kind: 'invalid', message: `Invalid URL syntax: ${href}` };
    }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return { kind: 'invalid', message: `Unsupported URL scheme: ${href}` };
  }
  const sourceDir = path.dirname(path.join(repoRoot, source));
  const targetPath = path.resolve(sourceDir, stripAnchor(href));
  if (!targetPath.startsWith(repoRoot)) {
    return { kind: 'invalid', message: `Local link escapes repo: ${href}` };
  }
  return { kind: 'local', targetPath };
}

function allowlistReason(url) {
  return ALLOWLIST.find((entry) => entry.test(url))?.reason;
}

function localAllowlistReason(targetPath) {
  const normalized = path.relative(repoRoot, targetPath).replace(/\\/g, '/');
  return LOCAL_ALLOWLIST.find((entry) => entry.test(normalized))?.reason;
}

async function requestWithCurl(url, method) {
  const args = [
    '--location',
    '--silent',
    '--show-error',
    '--output',
    process.platform === 'win32' ? 'NUL' : '/dev/null',
    '--write-out',
    '%{http_code}',
    '--user-agent',
    USER_AGENT,
    '--max-time',
    String(Math.ceil(DEFAULT_TIMEOUT_MS / 1000)),
    '--retry',
    String(DEFAULT_RETRIES),
    '--retry-delay',
    '1',
  ];
  if (method === 'HEAD') {
    args.push('--head');
  } else {
    args.push('--request', 'GET');
  }
  args.push(url.toString());

  try {
    const { stdout } = await execFileAsync('curl', args, {
      timeout: DEFAULT_TIMEOUT_MS * (DEFAULT_RETRIES + 2),
      maxBuffer: 1024 * 1024,
    });
    const status = Number(stdout.trim().slice(-3));
    if (!Number.isFinite(status) || status <= 0) {
      throw new Error(
        `curl returned invalid status ${stdout.trim() || '(empty)'}`
      );
    }
    return { status };
  } catch (error) {
    const stderr =
      error && typeof error === 'object' && 'stderr' in error
        ? String(error.stderr).trim()
        : '';
    throw new Error(
      stderr || (error instanceof Error ? error.message : String(error))
    );
  }
}

async function checkHttp(link, url) {
  const allowed = allowlistReason(url);
  if (allowed) return { status: 'allowed', reason: allowed };

  let lastError;
  for (let attempt = 0; attempt <= DEFAULT_RETRIES; attempt += 1) {
    for (const method of ['HEAD', 'GET']) {
      try {
        const response = await requestWithCurl(url, method);
        if (response.status === 405 && method === 'HEAD') continue;
        if (response.status >= 200 && response.status < 400)
          return { status: 'ok' };
        if (response.status === 404 || response.status === 410) {
          return {
            status: 'fail',
            message: `${response.status} for ${link.href}`,
          };
        }
        if (response.status === 429 || response.status >= 500) {
          lastError = `${response.status} for ${link.href}`;
          continue;
        }
        return {
          status: 'fail',
          message: `${response.status} for ${link.href}`,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
  }
  return {
    status: 'warn',
    message: lastError ?? `Unable to validate ${link.href}`,
  };
}

async function validateLinks(links) {
  const failures = [];
  const warnings = [];
  let checked = 0;
  let allowed = 0;

  for (const link of links) {
    const classification = classifyLink(link);
    if (classification.kind === 'invalid') {
      failures.push(`${link.source}: ${classification.message}`);
      continue;
    }
    if (classification.kind === 'allowed-scheme') {
      checked += 1;
      continue;
    }
    if (classification.kind === 'local') {
      checked += 1;
      const reason = localAllowlistReason(classification.targetPath);
      if (reason) {
        allowed += 1;
        continue;
      }
      if (!fs.existsSync(classification.targetPath)) {
        failures.push(`${link.source}: Missing local target ${link.href}`);
      }
      continue;
    }
    checked += 1;
    const result = await checkHttp(link, classification.url);
    if (result.status === 'allowed') allowed += 1;
    if (result.status === 'fail')
      failures.push(`${link.source}: ${result.message}`);
    if (result.status === 'warn')
      warnings.push(`${link.source}: ${result.message}`);
  }

  return { checked, allowed, failures, warnings };
}

async function main() {
  const links = collectLinks();
  const poiCount = links.filter((link) => link.type === 'poi').length;
  const docsCount = links.filter((link) => link.type === 'docs').length;
  const result = await validateLinks(links);

  for (const warning of result.warnings)
    console.warn(`Link check warning: ${warning}`);
  if (result.failures.length > 0) {
    console.error(
      `Link check failed with ${result.failures.length} invalid link(s):`
    );
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Link check passed: ${result.checked} link(s), ${poiCount} POI link(s), ${docsCount} docs link(s), ${result.allowed} allowlisted.`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      'Link check failed:',
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  });
}

module.exports = {
  collectLinks,
  collectMarkdownLinks,
  collectPoiLinks,
  classifyLink,
  validateLinks,
};
