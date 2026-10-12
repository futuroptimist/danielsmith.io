import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { validate, runtimePath } = require('../../../scripts/check-release.cjs');
const chartPath = 'charts/danielsmith/Chart.yaml';
const changelogPath = 'docs/changelog.md';
const chart = (app = '0.2.0', version = '0.2.9') =>
  `version: ${version}\nappVersion: '${app}'\n`;
const notes = (version = '0.2.0', text = 'Synthetic site change.') =>
  `# Changelog\n\n## v${version} - unreleased\n\n- ${text}\n`;
const fixture = (
  changed: string[],
  app = '0.2.1',
  version = '0.2.10',
  changelog = notes(app)
) => ({
  changed,
  read: (file: string) =>
    file === chartPath ? chart(app, version) : changelog,
  before: (file: string) => (file === chartPath ? chart() : notes()),
});

describe('release metadata policy with synthetic snapshots', () => {
  const releaseFiles = ['src/main.ts', chartPath, changelogPath];
  it('accepts coordinated runtime, app, chart and changelog updates', () => {
    expect(() => validate(fixture(releaseFiles))).not.toThrow();
  });
  it('rejects runtime changes with an unchanged appVersion', () => {
    expect(() => validate(fixture(releaseFiles, '0.2.0'))).toThrow(
      'appVersion increase'
    );
  });
  it('rejects appVersion changes without a new chart package', () => {
    expect(() => validate(fixture(releaseFiles, '0.2.1', '0.2.9'))).toThrow(
      'chart version increase'
    );
  });
  it('requires a changelog diff and a matching populated entry', () => {
    expect(() => validate(fixture(['src/main.ts', chartPath]))).toThrow(
      'in the diff'
    );
    expect(() =>
      validate(fixture(releaseFiles, '0.2.1', '0.2.10', notes()))
    ).toThrow('exactly one');
    expect(() =>
      validate(
        fixture(releaseFiles, '0.2.1', '0.2.10', '## v0.2.1 - unreleased\n')
      )
    ).toThrow('change bullets');
  });
  it('rejects duplicate version entries, malformed versions and downgrades', () => {
    expect(() =>
      validate(
        fixture(
          releaseFiles,
          '0.2.1',
          '0.2.10',
          notes('0.2.1') + notes('0.2.1')
        )
      )
    ).toThrow('exactly one');
    for (const version of ['v0.2.1', '0.02.1', '0.2', '0.2.1-rc.1']) {
      expect(() => validate(fixture(releaseFiles, version))).toThrow(
        'MAJOR.MINOR.PATCH'
      );
    }
    expect(() =>
      validate(fixture([chartPath, changelogPath], '0.1.9'))
    ).toThrow('must increase');
  });
  it('allows docs/tests/tooling-only work without version churn', () => {
    expect(() =>
      validate(
        fixture(
          [
            'AGENTS.md',
            'CLAUDE.md',
            'docs/ops/versioning.md',
            'src/tests/example.test.ts',
            'scripts/check-release.cjs',
            '.github/workflows/01-lint-format.yml',
          ],
          '0.2.0',
          '0.2.9',
          notes()
        )
      )
    ).not.toThrow();
  });
  it('requires chart packaging changes to advance chart version and current notes', () => {
    const paths = [
      'charts/danielsmith/templates/deployment.yaml',
      chartPath,
      changelogPath,
    ];
    expect(() =>
      validate(
        fixture(
          paths,
          '0.2.0',
          '0.2.10',
          notes('0.2.0', 'Synthetic chart fix.')
        )
      )
    ).not.toThrow();
    expect(() => validate(fixture(paths, '0.2.0', '0.2.9'))).toThrow(
      'chart version increase'
    );
    expect(() =>
      validate(
        fixture(paths, '0.2.0', '0.2.10', notes() + '\nHistorical correction.')
      )
    ).toThrow('current version change bullet');
    expect(() =>
      validate(
        fixture(
          paths,
          '0.2.0',
          '0.2.10',
          notes() + '\n## v0.1.0 - historical\n- Correction.'
        )
      )
    ).toThrow('current version change bullet');
    for (const text of [
      'Synthetic  site change.',
      'Synthetic\n  site change.',
    ]) {
      expect(() =>
        validate(fixture(paths, '0.2.0', '0.2.10', notes('0.2.0', text)))
      ).toThrow('current version change bullet');
    }
    expect(() =>
      validate(
        fixture(
          paths,
          '0.2.0',
          '0.2.10',
          notes() + '\n- Synthetic chart packaging change.'
        )
      )
    ).not.toThrow();
  });
  it.each([
    'scripts/generate-floorplan-diagram.ts',
    'scripts/generate-press-kit.ts',
    'scripts/assert-dist.cjs',
    'scripts/static-asset-expectations.cjs',
    'scripts/resume-ats-smoke.py',
    'docs/resume/README.md',
    'docs/resume/ats-smoke.json',
    'outages/synthetic.md',
    'outages/synthetic.json',
    'examples/showcase/demo.html',
    'examples/showcase/assets/model_uncompressed.gltf',
    'scripts/generate_showcase_gltf.py',
  ])(
    'allows maintenance of documentation/test helper %s without version churn',
    (file) => {
      expect(() =>
        validate(fixture([file], '0.2.0', '0.2.9', notes()))
      ).not.toThrow();
    }
  );
  it('compares multi-digit SemVer components numerically', () => {
    expect(() => validate(fixture(releaseFiles, '0.2.10'))).not.toThrow();
  });
  it.each([
    'public/model.glb',
    'src/new.ts',
    'Dockerfile',
    'docker/nginx/default.conf',
    'vite.config.ts',
    'package-lock.json',
    'docs/resume/active.tex',
    'scripts/resume-docx.py',
    'scripts/generate-favicon.ts',
    '.github/workflows/ci-image.yml',
    '.github/workflows/resume.yml',
    'new-build-config.json',
  ])('treats %s as a runtime input', (path) => {
    expect(runtimePath(path)).toBe(true);
  });
  it('keeps private package version independent but checks all package scripts', () => {
    const check = fixture(['package.json'], '0.2.0', '0.2.9', notes());
    const pkg = (version: string, build = 'vite build') =>
      JSON.stringify({
        name: 'synthetic',
        version,
        private: true,
        scripts: { build },
      });
    const read = check.read;
    const before = check.before;
    check.read = (file) =>
      file === 'package.json' ? pkg('9.0.0') : read(file);
    check.before = (file) =>
      file === 'package.json' ? pkg('1.0.0') : before(file);
    expect(() => validate(check)).not.toThrow();
    check.read = (file) =>
      file === 'package.json' ? pkg('9.0.0', 'another-build') : read(file);
    expect(() => validate(check)).toThrow('appVersion increase');
    check.read = (file) =>
      file === 'package.json'
        ? JSON.stringify({
            ...JSON.parse(pkg('9.0.0')),
            scripts: { build: 'vite build', generate: 'changed-generator' },
          })
        : read(file);
    expect(() => validate(check)).toThrow('appVersion increase');
  });
  it('rejects premature release claims for newly introduced application versions', () => {
    for (const status of [
      'released',
      'deployed to production',
      'unreleased - staging passed',
    ]) {
      expect(() =>
        validate(
          fixture(
            releaseFiles,
            '0.2.1',
            '0.2.10',
            notes('0.2.1').replace('unreleased', status)
          )
        )
      ).toThrow('must be marked unreleased');
    }
  });
  it('ignores only root package-version metadata in npm lockfiles', () => {
    const check = fixture(
      ['package.json', 'package-lock.json'],
      '0.2.0',
      '0.2.9',
      notes()
    );
    const pkg = (version: string) =>
      JSON.stringify({ name: 'synthetic', version, private: true });
    const dependency = {
      version: '1.0.0',
      resolved: 'https://example.invalid/library.tgz',
      integrity: 'synthetic-integrity',
    };
    const lock = (version: string, overrides = {}) =>
      JSON.stringify({
        name: 'synthetic',
        version,
        lockfileVersion: 3,
        packages: {
          '': { name: 'synthetic', version },
          'node_modules/synthetic': { ...dependency, ...overrides },
        },
      });
    const read = check.read;
    const before = check.before;
    check.before = (file) =>
      file === 'package.json'
        ? pkg('1.0.0')
        : file === 'package-lock.json'
          ? lock('1.0.0')
          : before(file);
    check.read = (file) =>
      file === 'package.json'
        ? pkg('2.0.0')
        : file === 'package-lock.json'
          ? lock('2.0.0')
          : read(file);
    expect(() => validate(check)).not.toThrow();
    for (const overrides of [
      { version: '1.0.1' },
      { resolved: 'https://example.invalid/changed.tgz' },
      { integrity: 'changed-integrity' },
    ]) {
      check.read = (file) =>
        file === 'package.json'
          ? pkg('2.0.0')
          : file === 'package-lock.json'
            ? lock('2.0.0', overrides)
            : read(file);
      expect(() => validate(check)).toThrow('appVersion increase');
    }
  });
  it('allows later evidence-only documentation updates without a new application version', () => {
    expect(() =>
      validate(
        fixture(
          [changelogPath],
          '0.2.0',
          '0.2.9',
          notes().replace('unreleased', 'tagged source milestone')
        )
      )
    ).not.toThrow();
  });
});

describe('release checker CLI with a synthetic Git repository', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'release-policy-'));
  const script = path.resolve('scripts/check-release.cjs');
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: directory });
  const write = (file: string, text: string) => {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    writeFileSync(path.join(directory, file), text);
  };
  git('init');
  write(chartPath, chart());
  write(changelogPath, notes());
  write('src/old.ts', '// synthetic runtime fixture\n');
  git('add', '.');
  git(
    '-c',
    'user.name=Synthetic Test',
    '-c',
    'user.email=synthetic@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'Synthetic baseline'
  );
  afterAll(() => rmSync(directory, { recursive: true, force: true }));

  const run = (base: string) =>
    spawnSync(process.execPath, [script, '--base', base], {
      cwd: directory,
      encoding: 'utf8',
    });
  it('fails closed for a missing comparison base', () => {
    expect(run('missing-synthetic-base').status).toBe(1);
  });
  it('includes new untracked runtime files in the local comparison', () => {
    write('src/new.ts', '// synthetic addition\n');
    const result = run('HEAD');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('appVersion increase');
    rmSync(path.join(directory, 'src/new.ts'));
  });
  it('detects removal of runtime files and accepts a coordinated release', () => {
    rmSync(path.join(directory, 'src/old.ts'));
    expect(run('HEAD').status).toBe(1);
    write(chartPath, chart('0.2.1', '0.2.10'));
    write(changelogPath, notes('0.2.1'));
    expect(run('HEAD').status).toBe(0);
  });
});
