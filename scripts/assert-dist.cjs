#!/usr/bin/env node
const { access, readFile } = require('fs/promises');
const path = require('path');
const {
  manualBinaryExtensions,
  runtimeAssetExpectations,
} = require('./static-asset-expectations.cjs');

const projectRoot = path.join(__dirname, '..');
const publicRoot = path.join(projectRoot, 'public');
const distRoot = path.join(projectRoot, 'dist');
const distIndexPath = path.join(distRoot, 'index.html');
const strictManualAssetMode = process.env.REQUIRE_MANUAL_STATIC_ASSETS === '1';

const assetReferenceRegex =
  /<(script|link)\b[^>]*(src|href)=['\"]([^'\"]+)['\"][^>]*>/gi;
const absolutePathRegex =
  /(?:href|src)=['\"](\/(?!\/)[^'\"?#]+(?:\?[^'\"]*)?)['\"]/gi;

const isHttpUrl = (value) => /^(?:https?:)?\/\//i.test(value);
const stripQuery = (value) => value.split('?')[0].split('#')[0];
const normalizeToRuntimeAbsolute = (value) => {
  const cleaned = stripQuery(value);
  if (cleaned.startsWith('./')) {
    return `/${cleaned.slice(2)}`;
  }
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
};
const toRelativeFromRoot = (absolutePath) =>
  stripQuery(absolutePath).replace(/^\//, '');
const hasStaticFileExtension = (runtimePath) =>
  Boolean(path.extname(stripQuery(runtimePath)));

const isManualBinaryAsset = (assetPath) => {
  const extension = path.extname(stripQuery(assetPath)).toLowerCase();
  return manualBinaryExtensions.has(extension);
};

const formatPaths = (paths) =>
  paths.length > 0
    ? paths.map((assetPath) => `  - ${assetPath}`).join('\n')
    : '  - none';

(async () => {
  const failures = [];
  const warnings = [];

  try {
    await access(distIndexPath);
  } catch {
    failures.push('Missing dist/index.html.');
  }

  if (failures.length > 0) {
    console.error('Smoke check failed.');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  const distIndexHtml = await readFile(distIndexPath, 'utf8');
  const bundledAssetReferences = new Set();
  for (const match of distIndexHtml.matchAll(assetReferenceRegex)) {
    const reference = match[3];
    if (!reference || isHttpUrl(reference)) {
      continue;
    }

    const normalizedReference = normalizeToRuntimeAbsolute(reference);
    if (normalizedReference.includes('/assets/')) {
      const assetsIndex = normalizedReference.indexOf('/assets/');
      bundledAssetReferences.add(normalizedReference.slice(assetsIndex));
    }
  }

  if (bundledAssetReferences.size === 0) {
    failures.push(
      'No bundled /assets references found in dist/index.html. Vite output may be broken.'
    );
  }

  const missingBundledAssets = [];
  for (const bundledPath of bundledAssetReferences) {
    const relativePath = toRelativeFromRoot(bundledPath);
    const distAssetPath = path.join(distRoot, relativePath);
    try {
      await access(distAssetPath);
    } catch {
      missingBundledAssets.push(bundledPath);
    }
  }

  if (missingBundledAssets.length > 0) {
    failures.push(
      `Missing generated assets referenced by dist/index.html:\n${formatPaths(missingBundledAssets)}`
    );
  }

  const runtimeAbsoluteReferences = new Set();
  for (const match of distIndexHtml.matchAll(absolutePathRegex)) {
    const reference = stripQuery(match[1]);
    if (!reference || isHttpUrl(reference) || reference === '/src/main.ts') {
      continue;
    }
    runtimeAbsoluteReferences.add(reference);
  }

  for (const expectation of runtimeAssetExpectations) {
    runtimeAbsoluteReferences.add(expectation.path);
  }

  const runtimeChecks = [];
  for (const runtimePath of [...runtimeAbsoluteReferences].sort()) {
    const relativePath = toRelativeFromRoot(runtimePath);
    const sourcePath = path.join(publicRoot, relativePath);
    const distPath = path.join(distRoot, relativePath);

    const sourceExists = await access(sourcePath)
      .then(() => true)
      .catch(() => false);
    const distExists = await access(distPath)
      .then(() => true)
      .catch(() => false);
    const manualBinary = isManualBinaryAsset(runtimePath);

    runtimeChecks.push({ runtimePath, sourceExists, distExists, manualBinary });

    if (manualBinary && (!sourceExists || !distExists)) {
      const message =
        `Manual static asset missing for ${runtimePath} ` +
        `(source: ${sourceExists ? 'present' : 'missing'}: ${relativePath}, ` +
        `dist: ${distExists ? 'present' : 'missing'}: dist/${relativePath}).`;
      if (strictManualAssetMode) {
        failures.push(message);
      } else {
        warnings.push(
          `${message} Run REQUIRE_MANUAL_STATIC_ASSETS=1 npm run smoke after adding it.`
        );
      }
      continue;
    }

    if (
      !manualBinary &&
      hasStaticFileExtension(runtimePath) &&
      !runtimePath.startsWith('/assets/')
    ) {
      if (!sourceExists || !distExists) {
        failures.push(
          `Missing first-party runtime static asset for ${runtimePath} ` +
            `(source: ${sourceExists ? 'present' : 'missing'}: ${relativePath}, ` +
            `dist: ${distExists ? 'present' : 'missing'}: dist/${relativePath}).`
        );
      }
    }
  }

  console.log('Runtime static references summary:');
  for (const check of runtimeChecks) {
    const type = check.manualBinary ? 'manual-binary' : 'text/static';
    console.log(
      `- ${check.runtimePath} [${type}] source=${check.sourceExists ? 'yes' : 'no'} dist=${check.distExists ? 'yes' : 'no'}`
    );
  }

  if (warnings.length > 0) {
    console.warn('\nSmoke check warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.error('\nSmoke check failed.');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    '\nSmoke check passed: dist build artifact references look valid.'
  );
})();
