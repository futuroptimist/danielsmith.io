#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const distRoot = path.join(repoRoot, 'dist');
const distIndexPath = path.join(distRoot, 'index.html');
const strictManualAssets = process.env.REQUIRE_MANUAL_STATIC_ASSETS === '1';
const MANUAL_BINARY_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.ico',
  '.webp',
  '.gif',
  '.avif',
  '.svgz',
]);

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');
const exists = (filePath) => fs.existsSync(filePath);
const toRepoRelative = (absolutePath) =>
  path.relative(repoRoot, absolutePath).replace(/\\/g, '/');

const collectRuntimePaths = (html) => {
  const paths = new Set();
  const attributeRegex = /\b(?:src|href)=(["'])(.*?)\1/g;

  for (const match of html.matchAll(attributeRegex)) {
    const value = match[2].trim();
    if (!value.startsWith('/')) {
      continue;
    }
    if (value.startsWith('//')) {
      continue;
    }
    const withoutHash = value.split('#')[0];
    const withoutQuery = withoutHash.split('?')[0];
    if (!withoutQuery) {
      continue;
    }
    paths.add(withoutQuery);
  }

  return [...paths].sort();
};

const isManualBinaryPath = (runtimePath) => {
  const ext = path.extname(runtimePath).toLowerCase();
  return MANUAL_BINARY_EXTENSIONS.has(ext);
};

(() => {
  const errors = [];
  const warnings = [];

  if (!exists(distIndexPath)) {
    errors.push('dist/index.html missing. Run `npm run build` first.');
  }

  if (errors.length > 0) {
    console.error('Smoke check failed.');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const distIndex = readText(distIndexPath);
  const distRuntimePaths = collectRuntimePaths(distIndex);
  const builtAssetPaths = distRuntimePaths.filter((runtimePath) =>
    runtimePath.startsWith('/assets/')
  );
  if (builtAssetPaths.length === 0) {
    errors.push(
      'No /assets/* references found in dist/index.html. Vite output looks broken.'
    );
  }

  const missingBuiltAssets = builtAssetPaths.filter(
    (runtimePath) => !exists(path.join(distRoot, runtimePath.slice(1)))
  );
  for (const runtimePath of missingBuiltAssets) {
    errors.push(`Missing bundled asset in dist: ${runtimePath}`);
  }

  const sourceIndexPath = path.join(repoRoot, 'index.html');
  const sourceRuntimePaths = collectRuntimePaths(readText(sourceIndexPath));
  const firstPartyStaticPaths = sourceRuntimePaths.filter(
    (runtimePath) =>
      !runtimePath.startsWith('/src/') && !runtimePath.startsWith('/@')
  );

  const reportRows = [];

  for (const runtimePath of firstPartyStaticPaths) {
    const sourcePath = path.join(repoRoot, runtimePath.slice(1));
    const distPath = path.join(distRoot, runtimePath.slice(1));
    const sourceExists = exists(sourcePath);
    const distExists = exists(distPath);
    const manualBinary = isManualBinaryPath(runtimePath);

    reportRows.push({ runtimePath, sourceExists, distExists, manualBinary });

    if (manualBinary && (!sourceExists || !distExists)) {
      const message =
        `Manual binary asset missing for ${runtimePath}. ` +
        `Expected source=${toRepoRelative(sourcePath)} and dist=${toRepoRelative(distPath)}.`;
      if (strictManualAssets) {
        errors.push(message);
      } else {
        warnings.push(`${message} Daniel must add/copy this asset manually.`);
      }
      continue;
    }

    if (!manualBinary && !sourceExists) {
      errors.push(
        `Missing first-party static source file ${toRepoRelative(sourcePath)} (from ${runtimePath}).`
      );
      continue;
    }

    if (!manualBinary && sourceExists && !distExists) {
      errors.push(
        `Missing first-party static dist file ${toRepoRelative(distPath)} (from ${runtimePath}).`
      );
    }
  }

  console.log('Static runtime reference summary (from source index.html):');
  if (reportRows.length === 0) {
    console.log('- none detected');
  } else {
    for (const row of reportRows) {
      const tag = row.manualBinary ? 'manual-binary' : 'text/static';
      console.log(
        `- ${row.runtimePath} [${tag}] source=${row.sourceExists ? 'ok' : 'missing'} dist=${row.distExists ? 'ok' : 'missing'}`
      );
    }
  }

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (errors.length > 0) {
    console.error('Smoke check failed.');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    if (!strictManualAssets) {
      console.error(
        'Tip: default smoke mode allows missing manual binaries as warnings only.'
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Smoke check passed: ${toRepoRelative(distIndexPath)} and referenced assets look valid.`
  );
  if (!strictManualAssets) {
    console.log(
      'Tip: run `REQUIRE_MANUAL_STATIC_ASSETS=1 npm run smoke` after adding manual binaries.'
    );
  }
})();
