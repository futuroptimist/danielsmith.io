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
  if (!trimmed || trimmed.startsWith('#')) {
    return;
  }
  links.push({
    source: normalizeSlashes(path.relative(repoRoot, source)),
    target: trimmed,
    kind,
  });
}

function extractMarkdownLinks(source, text) {
  const links = [];
  const markdownLinkPattern = /!?(?:\[[^\]]*\])\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const referenceDefinitionPattern = /^\s*\[[^\]]+\]:\s+(\S+)/gm;
  const autolinkPattern = /<((?:https?:|mailto:)[^>\s]+)>/g;

  for (const match of text.matchAll(markdownLinkPattern)) {
    addLink(links, source, match[1], 'docs');
  }
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

async function validateLocalLink(link, cleanTarget) {
  const sourcePath = path.join(repoRoot, link.source);
  const [withoutHash] = cleanTarget.split('#', 1);
  const [withoutQuery] = withoutHash.split('?', 1);
  if (!withoutQuery) {
    return { ok: true };
  }
  const resolvedPath = path.resolve(path.dirname(sourcePath), withoutQuery);
  if (!resolvedPath.startsWith(repoRoot)) {
    return {
      ok: false,
      message: `${link.source}: local link escapes repo: ${link.target}`,
    };
  }
  if (await fileExists(resolvedPath)) {
    return { ok: true };
  }
  return {
    ok: false,
    message: `${link.source}: missing local link target: ${link.target}`,
  };
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

async function validateLinks(links, options = {}) {
  const failures = [];
  const warnings = [];
  let skipped = 0;
  for (const link of links) {
    const result = await validateLink(link, options);
    if (!result.ok) {
      failures.push(result.message);
    } else if (result.warning) {
      warnings.push(result.message);
    } else if (result.skipped) {
      skipped += 1;
    }
  }
  return { failures, warnings, skipped };
}

async function main() {
  const links = await collectLinks();
  const poiCount = links.filter((link) => link.kind === 'poi').length;
  const docsCount = links.filter((link) => link.kind === 'docs').length;
  const { failures, warnings, skipped } = await validateLinks(links);

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
  console.log(
    `Link check passed: ${links.length} links (${poiCount} POI, ${docsCount} docs, ${skipped} allowlisted).`
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
};
