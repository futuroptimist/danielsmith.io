#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const repoRoot = path.resolve(__dirname, '..');
const allowedSchemes = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const externalTimeoutMs = 10_000;
const externalRetries = 1;

const externalAllowlist = [
  {
    pattern: /^https:\/\/img\.shields\.io\//,
    reason: 'Badge CDN can rate-limit CI; syntax is still validated.',
  },
  {
    pattern: /^https:\/\/codecov\.io\//,
    reason: 'Coverage badge host can rate-limit unauthenticated CI checks.',
  },
  {
    pattern: /^https:\/\/discord\.gg\//,
    reason: 'Invite pages can vary by region or anti-abuse checks.',
  },
];

function isSkippedDirectory(entryName) {
  return new Set(['.git', 'node_modules', 'dist', 'coverage', 'site']).has(
    entryName
  );
}

async function walkFiles(root, predicate, out = []) {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') return out;
    throw error;
  }

  for (const entry of entries) {
    if (isSkippedDirectory(entry.name)) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, predicate, out);
      continue;
    }
    if (entry.isFile() && predicate(fullPath)) out.push(fullPath);
  }
  return out;
}

function stripWrapping(value) {
  return value.trim().replace(/^<(.+)>$/, '$1');
}

function stripAnchor(value) {
  const hashIndex = value.indexOf('#');
  return hashIndex === -1 ? value : value.slice(0, hashIndex);
}

function isExternal(url) {
  return /^https?:\/\//i.test(url);
}

function isNetworkSkipped(url) {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(
      parsed.hostname
    );
  } catch {
    return false;
  }
}

function classifyAllowlist(url) {
  return externalAllowlist.find((entry) => entry.pattern.test(url));
}

function normalizeMarkdownTarget(rawTarget) {
  const target = stripWrapping(rawTarget.trim());
  if (!target || target.startsWith('#')) return null;
  if (/^(data|javascript):/i.test(target)) return target;
  return target;
}

function collectMarkdownLinksFromText(text, filePath) {
  const links = [];
  const inlinePattern = /!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g;
  const referencePattern = /^\s*\[[^\]\n]+\]:\s+(\S+)/gm;
  const htmlPattern = /\b(?:href|src)=["']([^"']+)["']/gi;

  for (const pattern of [inlinePattern, referencePattern, htmlPattern]) {
    for (const match of text.matchAll(pattern)) {
      const href = normalizeMarkdownTarget(match[1] ?? '');
      if (!href) continue;
      links.push({ href, filePath, sourceType: 'docs-markdown' });
    }
  }
  return links;
}

async function collectMarkdownLinks({ root = repoRoot } = {}) {
  const readmePath = path.join(root, 'README.md');
  const docsRoot = path.join(root, 'docs');
  const markdownFiles = [
    readmePath,
    ...(await walkFiles(docsRoot, (filePath) => filePath.endsWith('.md'))),
  ];

  const links = [];
  for (const filePath of markdownFiles) {
    const text = await fs.readFile(filePath, 'utf8');
    links.push(
      ...collectMarkdownLinksFromText(text, path.relative(root, filePath))
    );
  }
  return links;
}

function extractPoiBlock(text) {
  const marker = '\n  poi: {';
  const start = text.indexOf(marker);
  if (start === -1) return '';
  return text.slice(start);
}

async function collectPoiLinks({ root = repoRoot } = {}) {
  const localeRoot = path.join(root, 'src', 'assets', 'i18n', 'locales');
  const localeFiles = await walkFiles(localeRoot, (filePath) =>
    filePath.endsWith('.ts')
  );
  const links = [];
  const hrefPattern = /href:\s*(['"`])([^'"`]+)\1/g;

  for (const filePath of localeFiles) {
    const text = await fs.readFile(filePath, 'utf8');
    const poiBlock = extractPoiBlock(text);
    for (const match of poiBlock.matchAll(hrefPattern)) {
      links.push({
        href: match[2] ?? '',
        filePath: path.relative(root, filePath),
        sourceType: 'poi-locale',
      });
    }
  }
  return links;
}

async function collectLinks(options = {}) {
  const [markdownLinks, poiLinks] = await Promise.all([
    collectMarkdownLinks(options),
    collectPoiLinks(options),
  ]);
  return [...markdownLinks, ...poiLinks];
}

function validateSyntax(link) {
  const href = link.href.trim();
  if (!href) return { ok: false, message: 'empty link target' };

  if (isExternal(href) || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
    try {
      const parsed = new URL(href);
      if (!allowedSchemes.has(parsed.protocol)) {
        return { ok: false, message: `disallowed scheme ${parsed.protocol}` };
      }
    } catch (error) {
      return { ok: false, message: `invalid URL syntax: ${error.message}` };
    }
  }

  return { ok: true };
}

async function validateLocalLink(link, root = repoRoot) {
  const href = link.href.trim();
  if (isExternal(href) || /^[a-z][a-z0-9+.-]*:/i.test(href))
    return { ok: true };
  const targetWithoutAnchor = stripAnchor(href);
  if (!targetWithoutAnchor) return { ok: true };
  const baseDir = path.dirname(path.join(root, link.filePath));
  const resolved = path.resolve(
    baseDir,
    decodeURIComponent(targetWithoutAnchor)
  );
  if (!resolved.startsWith(root)) {
    return { ok: false, message: 'relative link escapes repository root' };
  }
  try {
    await fs.access(resolved);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: `missing local target ${path.relative(root, resolved)}`,
    };
  }
}

async function fetchWithTimeout(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), externalTimeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'danielsmith.io-link-check/1.0',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function curlStatus(url, method) {
  try {
    const args = [
      '--location',
      '--silent',
      '--show-error',
      '--output',
      '/dev/null',
      '--max-time',
      `${Math.ceil(externalTimeoutMs / 1000)}`,
      '--user-agent',
      'danielsmith.io-link-check/1.0',
      '--write-out',
      '%{http_code}',
    ];
    if (method === 'HEAD') {
      args.push('--head');
    } else {
      args.push('--request', method);
    }
    args.push(url);

    const { stdout } = await execFileAsync('curl', args, {
      timeout: externalTimeoutMs + 2_000,
    });
    const status = Number.parseInt(stdout.trim(), 10);
    return Number.isFinite(status) ? { status } : undefined;
  } catch (error) {
    return { error };
  }
}

async function checkExternalLink(link) {
  const href = link.href.trim();
  if (!isExternal(href) || isNetworkSkipped(href)) return { ok: true };

  const allowlistEntry = classifyAllowlist(href);
  let lastError;
  let response;
  for (let attempt = 0; attempt <= externalRetries; attempt += 1) {
    try {
      response = await fetchWithTimeout(href, 'HEAD');
      if ([405, 501, 403].includes(response.status)) {
        response = await fetchWithTimeout(href, 'GET');
      }
      break;
    } catch (error) {
      lastError = error;
      if (attempt === externalRetries) break;
    }
  }

  if (!response) {
    let curlResponse = await curlStatus(href, 'HEAD');
    if (curlResponse?.status && [405, 501, 403].includes(curlResponse.status)) {
      curlResponse = await curlStatus(href, 'GET');
    }
    if (curlResponse?.status) {
      response = curlResponse;
    }
  }

  if (!response) {
    return {
      ok: true,
      warning: allowlistEntry
        ? `${allowlistEntry.reason} (${lastError?.message ?? lastError})`
        : `request unavailable: ${lastError?.message ?? lastError}`,
    };
  }

  if ([404, 410].includes(response.status)) {
    return { ok: false, message: `HTTP ${response.status}` };
  }

  if (response.status >= 400) {
    return {
      ok: true,
      warning: allowlistEntry
        ? `${allowlistEntry.reason} (HTTP ${response.status})`
        : `non-fatal HTTP ${response.status}`,
    };
  }

  return { ok: true };
}

async function validateLinks(
  links,
  { root = repoRoot, checkExternal = true } = {}
) {
  const failures = [];
  const warnings = [];
  const seen = new Set();

  for (const link of links) {
    const key = `${link.href}\0${link.filePath}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const syntax = validateSyntax(link);
    if (!syntax.ok) {
      failures.push({ ...link, message: syntax.message });
      continue;
    }

    const local = await validateLocalLink(link, root);
    if (!local.ok) {
      failures.push({ ...link, message: local.message });
      continue;
    }

    if (checkExternal) {
      const external = await checkExternalLink(link);
      if (!external.ok) failures.push({ ...link, message: external.message });
      if (external.warning)
        warnings.push({ ...link, message: external.warning });
    }
  }

  return { failures, warnings, checked: seen.size };
}

async function main() {
  const checkExternal = !process.argv.includes('--no-external');
  const links = await collectLinks();
  const result = await validateLinks(links, { checkExternal });

  for (const warning of result.warnings) {
    console.warn(
      `Link check warning: ${warning.filePath} -> ${warning.href}: ${warning.message}`
    );
  }

  if (result.failures.length > 0) {
    for (const failure of result.failures) {
      console.error(
        `Link check failed: ${failure.filePath} -> ${failure.href}: ${failure.message}`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Link check passed (${result.checked} unique links; ${checkExternal ? 'external checked' : 'external skipped'}).`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Link check crashed:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  allowedSchemes,
  collectLinks,
  collectMarkdownLinks,
  collectPoiLinks,
  validateLinks,
  validateSyntax,
};
