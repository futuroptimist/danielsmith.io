#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const CHART = 'charts/danielsmith/Chart.yaml';
const CHANGELOG = 'docs/changelog.md';
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function chartVersions(text) {
  const field = (name) => {
    const matches = [
      ...text.matchAll(
        new RegExp(`^${name}:\\s*['"]?([^'"\\s]+)['"]?\\s*$`, 'gm')
      ),
    ];
    if (matches.length !== 1 || !SEMVER.test(matches[0][1])) {
      throw new Error(
        `${CHART}: ${name} must be one stable MAJOR.MINOR.PATCH version.`
      );
    }
    return matches[0][1];
  };
  return { app: field('appVersion'), chart: field('version') };
}

function greater(next, previous) {
  const a = next.split('.').map(BigInt);
  const b = previous.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

function releaseEntry(changelog, version) {
  const sections = changelog.split(/^## /m).slice(1);
  const matching = sections.filter((section) =>
    section.startsWith(`v${version} - `)
  );
  if (matching.length !== 1 || !/^\s*- \S.+/m.test(matching[0])) {
    throw new Error(
      `${CHANGELOG}: require exactly one ## v${version} - status entry with change bullets.`
    );
  }
  return matching[0].trim();
}

function runtimePath(file) {
  // Unknown paths fail closed. These exclusions are review/test/documentation tooling only.
  if (file.startsWith('docs/resume/')) return true;
  if (
    /^\.github\/workflows\/(ci-image|resume|resume-gcs|05-favicon)\.yml$/.test(
      file
    )
  )
    return true;
  if (/^(docs\/|\.github\/|\.agents\/|playwright\/|scripts\/__)/.test(file))
    return false;
  if (/^(src\/tests\/|.*\/__tests__\/)|\.(test|spec)\.[cm]?[jt]sx?$/.test(file))
    return false;
  if (/^(AGENTS|CLAUDE|README|CONTRIBUTING|LICENSE)(\.|$)/.test(file))
    return false;
  if (
    /^(\.gitignore|\.editorconfig|\.prettier.*|\.eslint.*|\.pre-commit-config.yaml|vitest.config.ts|playwright.*config.ts|tsconfig.typecheck.json)$/.test(
      file
    )
  )
    return false;
  if (
    /^scripts\/(check-|scan-secrets|collider|sceneScaleAudit|rectangleGeometry|miniatureManifest|performance-history|capture-performance-route|run-promotion-smoke)/.test(
      file
    )
  )
    return false;
  if (/^scripts\/generate-(floorplan-diagram|press-kit)\.ts$/.test(file))
    return false;
  return true;
}

function validate({ read, changed = [], before }) {
  const current = chartVersions(read(CHART));
  const entry = releaseEntry(read(CHANGELOG), current.app);
  if (!before) return;
  const previous = chartVersions(before(CHART));
  const appChanged = current.app !== previous.app;
  const chartChanged = changed.some((file) =>
    file.startsWith('charts/danielsmith/')
  );
  const runtimeChanged = changed.some((file) => {
    if (file.startsWith('charts/danielsmith/')) return false;
    if (file === 'package.json') {
      const runtimePackage = (text) => {
        // Build/lifecycle scripts can invoke any other script. Keep the whole map
        // rather than trying to infer a shell-dependent transitive call graph.
        const { version, ...rest } = JSON.parse(text);
        return JSON.stringify(rest);
      };
      return runtimePackage(read(file)) !== runtimePackage(before(file));
    }
    return runtimePath(file);
  });
  if (runtimeChanged && !greater(current.app, previous.app)) {
    throw new Error(
      'Site changes require an appVersion increase and a matching changelog entry.'
    );
  }
  if (appChanged && !greater(current.app, previous.app)) {
    throw new Error(
      'appVersion must increase; downgrades are not release metadata updates.'
    );
  }
  if (
    appChanged &&
    entry.split('\n')[0].trim() !== `v${current.app} - unreleased`
  ) {
    throw new Error(
      'New application versions must be marked unreleased; record release evidence later.'
    );
  }
  if (chartChanged && !greater(current.chart, previous.chart)) {
    throw new Error(
      'All chart content changes, including appVersion, require a chart version increase.'
    );
  }
  if (runtimeChanged || appChanged || chartChanged) {
    if (!changed.includes(CHANGELOG))
      throw new Error('Release changes require docs/changelog.md in the diff.');
    const previousText = before(CHANGELOG);
    const previousSections = previousText.split(/^## /m).slice(1);
    if (previousSections.some((section) => section.trim() === entry)) {
      throw new Error(
        'Update the current version entry, not only historical changelog text.'
      );
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--base' || !args[1])) {
    throw new Error('Usage: node scripts/check-release.cjs [--base <git-ref>]');
  }
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
  const read = (file) => readFileSync(file, 'utf8');
  if (!args.length) return validate({ read });
  // Resolve to a commit first; never interpolate refs into a shell command.
  const base = git(
    'rev-parse',
    '--verify',
    '--end-of-options',
    `${args[1]}^{commit}`
  ).trim();
  const changed = git('diff', '--name-only', '--no-renames', '-z', base, '--')
    .split('\0')
    .filter(Boolean);
  changed.push(
    ...git('ls-files', '--others', '--exclude-standard', '-z')
      .split('\0')
      .filter(Boolean)
  );
  validate({ read, changed, before: (file) => git('show', `${base}:${file}`) });
}

if (require.main === module) {
  try {
    main();
    console.log('Release metadata check passed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { validate, runtimePath, chartVersions };
