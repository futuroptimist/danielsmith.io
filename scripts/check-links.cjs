#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRIES = 2;

const allowedSchemes = new Set(['http:', 'https:', 'mailto:']);
const externalAllowlist = [
  {
    pattern: /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(?:\/|$)/i,
    reason: 'local preview URLs are environment-specific',
  },
  {
    pattern: /^https?:\/\/chatgpt\.com\/codex\/tasks\/task_123(?:\b|$)/i,
    reason: 'illustrative Codex task placeholder in docs',
  },
  {
    pattern: /^https?:\/\/chatgpt\.com\/share\/abcdefg(?:\b|$)/i,
    reason: 'illustrative shared-chat placeholder in docs',
  },
  {
    pattern: /^https?:\/\/relay\.cloudflare\.workers\.dev\/api\/v1(?:\b|$)/i,
    reason: 'example Cloudflare Worker relay URL from upstream docs',
  },
];

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dir, predicate) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listFiles(fullPath, predicate)));
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function addLink(links, source, target, kind) {
  const trimmed = target.trim();
  if (!trimmed || trimmed === '#') {
    return;
  }
  links.push({
    source: normalizeSlashes(path.relative(repoRoot, source)),
    target: trimmed,
    kind,
  });
}

function findInlineMarkdownDestinationEnd(text, startIndex) {
  let depth = 0;
  let escaped = false;
  let quote = null;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') {
      depth += 1;
      continue;
    }
    if (char === ')') {
      if (depth === 0) {
        return index;
      }
      depth -= 1;
    }
  }

  return -1;
}

function extractDestination(rawDestination) {
  const trimmed = rawDestination.trim();
  if (trimmed.startsWith('<')) {
    const closingIndex = trimmed.indexOf('>');
    return closingIndex > 0 ? trimmed.slice(1, closingIndex) : null;
  }

  const titleMatch = trimmed.match(/^(\S+)(?:\s+['"(].*)?$/s);
  return titleMatch?.[1] ?? null;
}

function extractInlineMarkdownLinks(source, text) {
  const links = [];
  const linkOpenPattern = /!?\[[^\]]*\]\(/g;

  for (const match of text.matchAll(linkOpenPattern)) {
    const destinationStart = match.index + match[0].length;
    const destinationEnd = findInlineMarkdownDestinationEnd(
      text,
      destinationStart
    );
    if (destinationEnd === -1) {
      continue;
    }

    const destination = extractDestination(
      text.slice(destinationStart, destinationEnd)
    );
    if (destination) {
      addLink(links, source, destination, 'docs');
    }
  }

  return links;
}

function extractMarkdownLinks(source, text) {
  const links = extractInlineMarkdownLinks(source, text);
  const referenceDefinitionPattern = /^\s*\[[^\]]+\]:\s+(\S+)/gm;
  const autolinkPattern = /<((?:https?:|mailto:)[^>\s]+)>/g;

  for (const match of text.matchAll(referenceDefinitionPattern)) {
    addLink(links, source, match[1], 'docs');
  }
  for (const match of text.matchAll(autolinkPattern)) {
    addLink(links, source, match[1], 'docs');
  }
  return links;
}

function extractPoiLinks(source, text) {
  const links = [];
  const hrefPattern = /href:\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(hrefPattern)) {
    addLink(links, source, match[1], 'poi');
  }
  return links;
}

async function collectMarkdownLinks() {
  const docsDir = path.join(repoRoot, 'docs');
  const files = [path.join(repoRoot, 'README.md')];
  if (await fileExists(docsDir)) {
    files.push(
      ...(await listFiles(docsDir, (filePath) => filePath.endsWith('.md')))
    );
  }
  const links = [];
  for (const filePath of files) {
    const text = await fs.readFile(filePath, 'utf8');
    links.push(...extractMarkdownLinks(filePath, text));
  }
  return links;
}

async function collectPoiLinks() {
  const localeDir = path.join(repoRoot, 'src', 'assets', 'i18n', 'locales');
  const files = await listFiles(localeDir, (filePath) =>
    filePath.endsWith('.ts')
  );
  const links = [];
  for (const filePath of files) {
    const text = await fs.readFile(filePath, 'utf8');
    links.push(...extractPoiLinks(filePath, text));
  }
  return links;
}

async function collectLinks() {
  const [poiLinks, docsLinks] = await Promise.all([
    collectPoiLinks(),
    collectMarkdownLinks(),
  ]);
  return [...poiLinks, ...docsLinks];
}

function stripTrailingPunctuation(target) {
  return target.replace(/[.,;:]+$/g, '');
}

function allowlistReason(target) {
  return (
    externalAllowlist.find((entry) => entry.pattern.test(target))?.reason ??
    null
  );
}

function parseTarget(target) {
  const cleanTarget = stripTrailingPunctuation(target);
  try {
    return { cleanTarget, url: new URL(cleanTarget) };
  } catch {
    return { cleanTarget, url: null };
  }
}

function parseLocalTarget(cleanTarget) {
  const hashIndex = cleanTarget.indexOf('#');
  const beforeHash =
    hashIndex === -1 ? cleanTarget : cleanTarget.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : cleanTarget.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const fileTarget =
    queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  return { fileTarget, hash };
}

function slugifyHeading(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/&/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function collectMarkdownAnchors(text) {
  const anchors = new Set();
  const headingCounts = new Map();
  const headingPattern = /^#{1,6}\s+(.+?)\s*#*\s*$/gm;
  const explicitAnchorPattern =
    /<a\s+[^>]*(?:id|name)=["']([^"']+)["'][^>]*>/gi;

  for (const match of text.matchAll(headingPattern)) {
    const baseSlug = slugifyHeading(match[1]);
    if (!baseSlug) {
      continue;
    }
    const count = headingCounts.get(baseSlug) ?? 0;
    headingCounts.set(baseSlug, count + 1);
    anchors.add(count === 0 ? baseSlug : `${baseSlug}-${count}`);
  }
  for (const match of text.matchAll(explicitAnchorPattern)) {
    anchors.add(match[1]);
  }

  return anchors;
}

async function validateLocalAnchor(link, resolvedPath, hash) {
  if (!hash) {
    return { ok: true };
  }
  let decodedHash = hash;
  try {
    decodedHash = decodeURIComponent(hash);
  } catch {
    return {
      ok: false,
      message: `${link.source}: invalid local anchor #${hash} in ${link.target}`,
    };
  }
  const text = await fs.readFile(resolvedPath, 'utf8');
  const anchors = collectMarkdownAnchors(text);
  if (anchors.has(decodedHash)) {
    return { ok: true };
  }
  return {
    ok: false,
    message: `${link.source}: missing local anchor #${hash} in ${link.target}`,
  };
}

async function validateLocalLink(link, cleanTarget) {
  const sourcePath = path.join(repoRoot, link.source);
  const { fileTarget, hash } = parseLocalTarget(cleanTarget);
  const targetPath = fileTarget || link.source;
  const resolvedPath = path.resolve(path.dirname(sourcePath), targetPath);
  const repoRootWithSeparator = `${repoRoot}${path.sep}`;
  if (
    resolvedPath !== repoRoot &&
    !resolvedPath.startsWith(repoRootWithSeparator)
  ) {
    return {
      ok: false,
      message: `${link.source}: local link escapes repo: ${link.target}`,
    };
  }
  if (!(await fileExists(resolvedPath))) {
    return {
      ok: false,
      message: `${link.source}: missing local link target: ${link.target}`,
    };
  }
  if (!resolvedPath.endsWith('.md')) {
    return hash
      ? {
          ok: true,
          warning: true,
          message: `${link.source}: skipped non-Markdown anchor ${link.target}`,
        }
      : { ok: true };
  }
  return validateLocalAnchor(link, resolvedPath, hash);
}

async function fetchWithTimeout(url, method, timeoutMs) {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'danielsmith-io-link-check/1.0',
      Accept: '*/*',
    },
  });
}

async function checkExternalUrl(
  target,
  { retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  const reason = allowlistReason(target);
  if (reason) {
    return { ok: true, skipped: true, message: `${target} (${reason})` };
  }

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    for (const method of ['HEAD', 'GET']) {
      try {
        const response = await fetchWithTimeout(target, method, timeoutMs);
        if (response.status === 405 && method === 'HEAD') {
          continue;
        }
        if ([404, 410].includes(response.status)) {
          if (method === 'HEAD') {
            lastError = new Error(`${target} returned ${response.status}`);
            continue;
          }
          return {
            ok: false,
            message: `${target} returned ${response.status}`,
          };
        }
        if (response.status >= 200 && response.status < 400) {
          return { ok: true };
        }
        if ([401, 403, 429].includes(response.status)) {
          return {
            ok: true,
            warning: true,
            message: `${target} returned ${response.status}; treated as private/rate-limited`,
          };
        }
        lastError = new Error(`${target} returned ${response.status}`);
      } catch (error) {
        lastError = error;
      }
    }
  }
  return {
    ok: true,
    warning: true,
    message: `${target} could not be reached: ${lastError?.message ?? 'unknown error'}`,
  };
}

async function validateLink(link, options) {
  const { cleanTarget, url } = parseTarget(link.target);
  if (url) {
    if (!allowedSchemes.has(url.protocol)) {
      return {
        ok: false,
        message: `${link.source}: unsupported scheme in ${link.target}`,
      };
    }
    if (url.protocol === 'mailto:') {
      return { ok: true };
    }
    const external = await checkExternalUrl(cleanTarget, options);
    return external.ok
      ? {
          ...external,
          message: external.message
            ? `${link.source}: ${external.message}`
            : undefined,
        }
      : { ok: false, message: `${link.source}: ${external.message}` };
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(cleanTarget)) {
    return {
      ok: false,
      message: `${link.source}: invalid or unsupported URL: ${link.target}`,
    };
  }
  return validateLocalLink(link, cleanTarget);
}

function dedupeLinks(links) {
  const seen = new Map();
  for (const link of links) {
    const { url } = parseTarget(link.target);
    const key = url
      ? `${link.kind}:${link.target}`
      : `${link.kind}:${link.source}:${link.target}`;
    const existing = seen.get(key);
    if (existing) {
      existing.sources.push(link.source);
    } else {
      seen.set(key, { ...link, sources: [link.source] });
    }
  }
  return [...seen.values()];
}

async function validateLinks(links, options = {}) {
  const failures = [];
  const warnings = [];
  let skipped = 0;
  const concurrency = Math.max(1, options.concurrency ?? 6);
  const queue = dedupeLinks(links);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < queue.length) {
      const index = nextIndex;
      nextIndex += 1;
      const link = queue[index];
      const result = await validateLink(link, options);
      if (!result.ok) {
        failures.push(result.message);
      } else if (result.warning) {
        warnings.push(result.message);
      } else if (result.skipped) {
        skipped += 1;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, () => worker())
  );

  return { failures, warnings, skipped, checked: queue.length };
}

async function main() {
  const links = await collectLinks();
  const poiCount = links.filter((link) => link.kind === 'poi').length;
  const docsCount = links.filter((link) => link.kind === 'docs').length;
  const { failures, warnings, skipped, checked } = await validateLinks(links);

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`Error: ${failure}`);
    }
    console.error(`Link check failed: ${failures.length} failure(s).`);
    process.exitCode = 1;
    return;
  }
  const checkedSummary =
    checked === links.length ? `${links.length}` : `${checked}/${links.length}`;
  console.log(
    `Link check passed: ${checkedSummary} links checked (${poiCount} POI, ${docsCount} docs, ${skipped} allowlisted).`
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
  allowedSchemes,
  collectLinks,
  collectMarkdownLinks,
  collectPoiLinks,
  extractMarkdownLinks,
  extractPoiLinks,
  validateLinks,
  collectMarkdownAnchors,
};
