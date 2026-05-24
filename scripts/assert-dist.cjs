#!/usr/bin/env node
const { access, readFile } = require('fs/promises');
const path = require('path');
const {
  manualBinaryExtensions,
  runtimeAbsolutePaths,
} = require('./static-asset-expectations.cjs');

const repoRoot = path.join(__dirname, '..');
const distRoot = path.join(repoRoot, 'dist');
const distIndex = path.join(distRoot, 'index.html');
const requireManual = process.env.REQUIRE_MANUAL_STATIC_ASSETS === '1';

const bundledAssetPattern =
  /<(?:script|link)\b[^>]*\b(?:src|href)=['"]([^'"]+)['"][^>]*>/gi;
const absolutePathPattern = /\b(?:src|href)=['"](\/[^'"]+)['"]/gi;

const toDistPath = (urlPath) =>
  path.join(distRoot, urlPath.replace(/^\/+/, ''));
const toSourcePath = (urlPath) =>
  path.join(repoRoot, urlPath.replace(/^\/+/, ''));
const isHttpUrl = (value) => /^https?:\/\//i.test(value);

const gatherMatches = (html, pattern, predicate = () => true) => {
  const values = new Set();
  let match = pattern.exec(html);

  while (match) {
    const candidate = match[1];

    if (predicate(candidate)) {
      values.add(candidate);
    }

    match = pattern.exec(html);
  }

  return [...values].sort();
};

const hasManualExtension = (urlPath) => {
  const extension = path.extname(urlPath.split(/[?#]/)[0]).toLowerCase();
  return manualBinaryExtensions.has(extension);
};

const assertPathExists = async (filePath, message) => {
  try {
    await access(filePath);
    return true;
  } catch {
    if (message) {
      console.error(message);
    }
    return false;
  }
};

(async () => {
  let hasFailures = false;

  if (
    !(await assertPathExists(
      distIndex,
      'Smoke check failed: dist/index.html missing.'
    ))
  ) {
    process.exitCode = 1;
    return;
  }

  const distHtml = await readFile(distIndex, 'utf8');

  const bundledRefs = gatherMatches(
    distHtml,
    bundledAssetPattern,
    (value) => !isHttpUrl(value) && !value.startsWith('data:')
  );

  if (bundledRefs.length === 0) {
    console.error(
      'Smoke check failed: dist/index.html has no script/link bundle references.'
    );
    hasFailures = true;
  }

  for (const ref of bundledRefs) {
    const normalized = ref.startsWith('/') ? ref : `/${ref}`;
    const candidate = toDistPath(normalized);

    if (
      !(await assertPathExists(
        candidate,
        `Smoke check failed: built asset missing at ${normalized}`
      ))
    ) {
      hasFailures = true;
    }
  }

  const absoluteRefs = new Set(runtimeAbsolutePaths);
  for (const urlPath of gatherMatches(
    distHtml,
    absolutePathPattern,
    (value) => !isHttpUrl(value)
  )) {
    absoluteRefs.add(urlPath);
  }

  const report = [];
  for (const urlPath of [...absoluteRefs].sort()) {
    if (urlPath.includes('?') || urlPath.includes('#')) {
      report.push(
        `- ${urlPath} (route/query reference ignored for static file checks)`
      );
      continue;
    }

    if (urlPath === '/src/main.ts') {
      report.push(
        `- ${urlPath} (dev-only Vite source entry ignored in production checks)`
      );
      continue;
    }

    const sourcePath = toSourcePath(urlPath);
    const distPath = toDistPath(urlPath);
    const sourceExists = await assertPathExists(sourcePath, '');
    const distExists = await assertPathExists(distPath, '');
    const manualBinary = hasManualExtension(urlPath);

    if (!sourceExists && !distExists) {
      const status = manualBinary && !requireManual ? 'WARN' : 'FAIL';
      report.push(`- ${urlPath} (${status}: missing in source and dist)`);
      if (status === 'FAIL') {
        hasFailures = true;
      }
      continue;
    }

    if (sourceExists && !distExists) {
      const status = manualBinary && !requireManual ? 'WARN' : 'FAIL';
      report.push(
        `- ${urlPath} (${status}: present in source but missing from dist)`
      );
      if (status === 'FAIL') {
        hasFailures = true;
      }
      continue;
    }

    if (!sourceExists && distExists) {
      report.push(`- ${urlPath} (OK: present in dist only)`);
      continue;
    }

    report.push(`- ${urlPath} (OK: present in source and dist)`);
  }

  console.log('\nStatic runtime path summary:');
  for (const line of report) {
    console.log(line);
  }

  if (hasFailures) {
    if (requireManual) {
      console.error(
        '\nSmoke check failed in strict manual-asset mode. Fix missing runtime assets and rerun:\n' +
          'REQUIRE_MANUAL_STATIC_ASSETS=1 npm run smoke'
      );
    }
    process.exitCode = 1;
    return;
  }

  if (!requireManual && report.some((line) => line.includes('(WARN:'))) {
    console.warn(
      '\nSmoke check passed with warnings for manual binary assets.\n' +
        'After adding them, verify strictly with:\n' +
        'REQUIRE_MANUAL_STATIC_ASSETS=1 npm run smoke'
    );
  }

  console.log(
    '\nSmoke check passed: dist artifact and static runtime references look valid.'
  );
})();
