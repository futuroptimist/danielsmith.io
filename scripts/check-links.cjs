#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const REQUEST_TIMEOUT_MS = Number(process.env.LINK_CHECK_TIMEOUT_MS ?? 8_000);
const REQUEST_RETRIES = Number(process.env.LINK_CHECK_RETRIES ?? 1);
const USER_AGENT =
  'danielsmith.io-link-check/1.0 (+https://github.com/futuroptimist/danielsmith.io)';
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const externalAllowlist = [
  {
    pattern: /^https:\/\/token\.place\/?$/,
    reason:
      'Project homepage is public repo metadata, but the service can be temporarily unavailable.',
  },
  {
    pattern: /^https:\/\/www\.npmjs\.com\/package\//,
    reason: 'npmjs.com intermittently blocks automated HEAD/GET probes.',
  },
  {
    pattern: /^https:\/\/pypa\.github\.io\/pipx\//,
    reason: 'External packaging docs occasionally throttle CI link probes.',
  },
];

function walkFiles(dir, predicate, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist'
    ) {
      continue;
    }
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(filePath, predicate, results);
    } else if (predicate(filePath)) {
      results.push(filePath);
    }
  }
  return results;
}

function lineForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

function normalizeMarkdownHref(href) {
  return href.trim().replace(/^<|>$/g, '');
}

function collectMarkdownLinks() {
  const files = [path.join(repoRoot, 'README.md')];
  const docsDir = path.join(repoRoot, 'docs');
  if (fs.existsSync(docsDir)) {
    files.push(...walkFiles(docsDir, (filePath) => filePath.endsWith('.md')));
  }

  const links = [];
  const inlineLinkPattern = /(?<!!)\[[^\]\n]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const referenceLinkPattern = /^\s*\[[^\]]+\]:\s*(\S+)/gm;

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(repoRoot, filePath);
    for (const pattern of [inlineLinkPattern, referenceLinkPattern]) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        const href = normalizeMarkdownHref(match[1]);
        if (!href || href.startsWith('#')) {
          continue;
        }
        links.push({
          href,
          source: 'docs',
          filePath: relativePath,
          line: lineForIndex(text, match.index ?? 0),
        });
      }
    }
  }

  return links;
}

function collectPoiLinks() {
  const localeDir = path.join(repoRoot, 'src', 'assets', 'i18n', 'locales');
  const files = walkFiles(localeDir, (filePath) => filePath.endsWith('.ts'));
  const links = [];
  const hrefPattern = /href:\s*['"]([^'"]+)['"]/g;

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(repoRoot, filePath);
    for (const match of text.matchAll(hrefPattern)) {
      links.push({
        href: match[1],
        source: 'poi',
        filePath: relativePath,
        line: lineForIndex(text, match.index ?? 0),
      });
    }
  }

  return links;
}

function collectLinks() {
  return [...collectPoiLinks(), ...collectMarkdownLinks()];
}

function isLikelyLocalhost(url) {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
}

function findAllowlistEntry(href) {
  return externalAllowlist.find((entry) => entry.pattern.test(href));
}

function validateStaticLink(link) {
  if (/\s/.test(link.href)) {
    return `contains whitespace: ${link.href}`;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(link.href)) {
    let url;
    try {
      url = new URL(link.href);
    } catch (error) {
      return `invalid URL syntax: ${error instanceof Error ? error.message : error}`;
    }

    if (!ALLOWED_SCHEMES.has(url.protocol)) {
      return `unsupported URL scheme: ${url.protocol}`;
    }

    return null;
  }

  if (link.href.startsWith('/')) {
    return null;
  }

  const [target] = link.href.split('#');
  if (!target) {
    return null;
  }

  const resolved = path.resolve(repoRoot, path.dirname(link.filePath), target);
  if (!resolved.startsWith(repoRoot) || !fs.existsSync(resolved)) {
    return `missing local target: ${link.href}`;
  }

  return null;
}

function curlProbe(url, method) {
  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    const args = [
      '--location',
      '--silent',
      '--show-error',
      '--max-time',
      String(Math.ceil(REQUEST_TIMEOUT_MS / 1000)),
      '--user-agent',
      USER_AGENT,
      '--output',
      '/dev/null',
      '--write-out',
      '%{http_code}',
    ];

    if (method === 'HEAD') {
      args.push('--head');
    }
    args.push(url);

    const child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const status = Number(stdout.trim().slice(-3));
      if (Number.isFinite(status) && status > 0) {
        resolve({ status, statusText: `curl exit ${code ?? 0}` });
        return;
      }
      reject(new Error(stderr.trim() || `curl exited with ${code}`));
    });
  });
}

async function probeExternalUrl(href) {
  const url = new URL(href);
  if (isLikelyLocalhost(url)) {
    return { ok: true, skipped: true, reason: 'local development URL' };
  }

  const allowlistEntry = findAllowlistEntry(href);
  let lastError;
  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    for (const method of ['HEAD', 'GET']) {
      try {
        const response = await curlProbe(href, method);
        if (
          (response.status >= 200 && response.status < 400) ||
          [401, 403, 405, 429].includes(response.status)
        ) {
          return { ok: true };
        }
        if (allowlistEntry && ![404, 410].includes(response.status)) {
          return { ok: true, skipped: true, reason: allowlistEntry.reason };
        }
        lastError = `${method} ${response.status} ${response.statusText}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  return { ok: false, error: lastError ?? 'unknown link probe failure' };
}

async function validateLinks({ checkExternal = true } = {}) {
  const links = collectLinks();
  const failures = [];
  const warnings = [];

  for (const link of links) {
    const staticFailure = validateStaticLink(link);
    if (staticFailure) {
      failures.push({ ...link, error: staticFailure });
      continue;
    }

    if (!checkExternal || !/^https?:/i.test(link.href)) {
      continue;
    }

    const result = await probeExternalUrl(link.href);
    if (!result.ok) {
      failures.push({ ...link, error: result.error });
    } else if (result.skipped) {
      warnings.push({ ...link, reason: result.reason });
    }
  }

  return { links, failures, warnings };
}

async function main() {
  const { links, failures, warnings } = await validateLinks();

  for (const warning of warnings) {
    console.warn(
      `Link check warning (${warning.reason}): ${warning.filePath}:${warning.line} ${warning.href}`
    );
  }

  if (failures.length > 0) {
    console.error(`Link check failed with ${failures.length} failure(s):`);
    for (const failure of failures) {
      console.error(
        `- ${failure.filePath}:${failure.line} ${failure.href} — ${failure.error}`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Link check passed: validated ${links.length} links from POI locale data and docs.`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  ALLOWED_SCHEMES,
  collectLinks,
  collectMarkdownLinks,
  collectPoiLinks,
  validateStaticLink,
  validateLinks,
};
