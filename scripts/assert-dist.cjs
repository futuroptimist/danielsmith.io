#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_ROOT = path.join(PROJECT_ROOT, 'dist');
const DIST_INDEX = path.join(DIST_ROOT, 'index.html');
const REQUIRE_MANUAL_STATIC_ASSETS =
  process.env.REQUIRE_MANUAL_STATIC_ASSETS === '1';

const MANUAL_BINARY_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.ico',
  '.webp',
]);

const EXIT = {
  OK: 0,
  FAIL: 1,
};

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function normalizePathname(raw) {
  if (!raw || !raw.startsWith('/')) {
    return null;
  }

  const withoutHash = raw.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  return withoutQuery || '/';
}

function extractRootRelativeReferences(html) {
  const refs = new Set();
  const attrRegex = /(?:href|src)=(["'])(.*?)\1/g;

  for (const match of html.matchAll(attrRegex)) {
    const normalized = normalizePathname(match[2]);
    if (normalized) {
      refs.add(normalized);
    }
  }

  return [...refs].sort();
}

function isManualBinaryPath(pathname) {
  const extension = path.extname(pathname).toLowerCase();
  return MANUAL_BINARY_EXTENSIONS.has(extension);
}

function checkDistIndex() {
  if (!fileExists(DIST_INDEX)) {
    throw new Error(
      'Smoke check failed: dist/index.html is missing. Run npm run build first.'
    );
  }
}

function checkViteBuiltAssets(indexHtml) {
  const missing = [];
  const refs = extractRootRelativeReferences(indexHtml).filter((pathname) =>
    pathname.startsWith('/assets/')
  );

  for (const pathname of refs) {
    const distTarget = path.join(DIST_ROOT, pathname.slice(1));
    if (!fileExists(distTarget)) {
      missing.push(pathname);
    }
  }

  return { refs, missing };
}

function checkFirstPartyStaticReferences(indexHtml) {
  const refs = extractRootRelativeReferences(indexHtml).filter(
    (pathname) => !pathname.startsWith('/assets/')
  );

  const report = refs.map((pathname) => {
    const sourcePath = path.join(PROJECT_ROOT, pathname.slice(1));
    const distPath = path.join(DIST_ROOT, pathname.slice(1));
    const manualBinary = isManualBinaryPath(pathname);

    return {
      pathname,
      sourceExists: fileExists(sourcePath),
      distExists: fileExists(distPath),
      manualBinary,
    };
  });

  return report;
}

function printStaticReferenceSummary(report) {
  if (report.length === 0) {
    console.log(
      'No first-party root-relative static references found in dist/index.html.'
    );
    return;
  }

  console.log(
    'First-party root-relative static references from dist/index.html:'
  );
  for (const item of report) {
    const kind = item.manualBinary ? 'manual-binary' : 'text/static';
    const source = item.sourceExists ? 'source:ok' : 'source:missing';
    const dist = item.distExists ? 'dist:ok' : 'dist:missing';
    console.log(` - ${item.pathname} [${kind}] (${source}, ${dist})`);
  }
}

(function main() {
  try {
    checkDistIndex();
    const indexHtml = readText(DIST_INDEX);

    const viteAssets = checkViteBuiltAssets(indexHtml);
    if (viteAssets.refs.length === 0) {
      throw new Error(
        'Smoke check failed: no /assets/* references found in dist/index.html.'
      );
    }

    if (viteAssets.missing.length > 0) {
      throw new Error(
        `Smoke check failed: missing built Vite assets:\n${viteAssets.missing
          .map((asset) => ` - ${asset}`)
          .join('\n')}`
      );
    }

    const staticRefs = checkFirstPartyStaticReferences(indexHtml);
    printStaticReferenceSummary(staticRefs);

    const missingManual = staticRefs.filter(
      (item) => item.manualBinary && (!item.sourceExists || !item.distExists)
    );

    if (missingManual.length > 0) {
      const message = [
        'Manual static binary asset checks:',
        ...missingManual.map(
          (item) =>
            ` - ${item.pathname} (source:${item.sourceExists ? 'ok' : 'missing'}, dist:${
              item.distExists ? 'ok' : 'missing'
            })`
        ),
      ].join('\n');

      if (REQUIRE_MANUAL_STATIC_ASSETS) {
        throw new Error(
          `${message}\nFailing because REQUIRE_MANUAL_STATIC_ASSETS=1 is enabled.`
        );
      }

      console.warn(
        `${message}\nWarning only (default mode). Set REQUIRE_MANUAL_STATIC_ASSETS=1 to fail on these.`
      );
    }

    console.log(
      'Smoke check passed: dist artifact references look consistent.'
    );
    process.exitCode = EXIT.OK;
  } catch (error) {
    console.error(error.message);
    process.exitCode = EXIT.FAIL;
  }
})();
