// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

const runner = createRequire(import.meta.url)(
  '../../../../scripts/performance-history.cjs'
) as {
  parseArgs(args: string[]): {
    refs: string[];
    routeProfile: string;
    checkOnly: boolean;
    smoke: boolean;
  };
  resolveRefs(
    repo: string,
    refs: string[]
  ): Array<{ ref: string; commit: string }>;
  inspectRef(
    repo: string,
    commit: string
  ): { compatible: boolean; reasons: string[]; lockSha256: string };
  reserveOutput(repo: string, output: string): string;
  createOwnedWorktree(
    repo: string,
    output: string,
    commit: string
  ): { worktree: string };
  cleanupOwnedWorktree(owned: unknown): { state: string; reason?: string };
  resultState(
    results: Array<{ exitCode: number; result: { state: string } }>,
    sourceClean: boolean,
    smoke: boolean
  ): string;
  artifactChecksums(
    root: string
  ): Array<{ path: string; sha256: string; bytes: number }>;
  summarize(
    entries: Array<Record<string, unknown>>
  ): Array<{ checkpoints: Array<{ profile: string | null }> }>;
  run(
    args: string[],
    options: { cwd: string }
  ): Promise<{
    output: string;
    success: boolean;
    manifest: {
      runnerSha256: string;
      callerSourceCommit: string;
      callerTreeDirty: boolean;
      entries: Array<{
        state: string;
        routeProfile: string;
        skippedRouteCapabilities: Array<{ capability: string }>;
      }>;
    };
  }>;
};
const fixtures: string[] = [];
function git(repo: string, ...args: string[]) {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
function put(repo: string, name: string, text: string) {
  const file = path.join(repo, name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}
function fixture(basement = false, exterior = false, garage = false) {
  const repo = mkdtempSync(path.join(tmpdir(), 'performance-history-test-'));
  fixtures.push(repo);
  git(repo, 'init');
  put(
    repo,
    '.gitignore',
    '.performance-history/\nnode_modules\ntest-results/\n.env\n'
  );
  put(repo, 'package-lock.json', '{"lockfileVersion":3}\n');
  for (const name of [
    'playwright.config.ts',
    'playwright/immersive-performance.spec.ts',
    'playwright/helpers/performanceResult.ts',
    'src/app/performanceResult.ts',
    'src/scene/performance/performanceDiagnostics.ts',
  ])
    put(repo, name, '// fixed measurement contract\n');
  put(
    repo,
    'src/immersiveScene.ts',
    'stepPlayerForTest getPlayerPosition getStairMetrics getFloorVisibilitySnapshot\n'
  );
  if (basement) {
    put(
      repo,
      'src/scene/level/basementStair.ts',
      "export const id = 'basement-ground';\n"
    );
    put(
      repo,
      'scripts/capture-performance-route.cjs',
      '// versioned --basement route\n'
    );
  }
  if (exterior) {
    put(
      repo,
      'src/scene/level/exteriorLayout.ts',
      "export const id = 'front-door';\n"
    );
    put(
      repo,
      'scripts/capture-performance-route.cjs',
      '// versioned --basement --exterior routes\n'
    );
  }
  if (garage) {
    put(
      repo,
      'src/scene/level/garageLayout.ts',
      "export const id = 'house-garage-door';\n"
    );
    put(
      repo,
      'scripts/capture-performance-route.cjs',
      '// versioned --basement --exterior --garage routes\n'
    );
  }
  git(repo, 'add', '.');
  // These commits exist only in newly-created disposable test repositories.
  git(
    repo,
    '-c',
    'user.name=Performance Test',
    '-c',
    'user.email=performance@example.invalid',
    'commit',
    '-m',
    'fixture'
  );
  return repo;
}
afterEach(() => {
  for (const repo of fixtures.splice(0))
    rmSync(repo, { recursive: true, force: true });
});

describe('performance history command', () => {
  it('names the actual capture helper in its missing-argument usage error', () => {
    const result = spawnSync(
      process.execPath,
      [path.resolve('scripts/capture-performance-route.cjs')],
      { encoding: 'utf8' }
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(
      'Usage: node scripts/capture-performance-route.cjs OUTPUT_DIRECTORY'
    );
  });

  it('accepts a commit list and explicit route profile', () => {
    expect(
      runner.parseArgs([
        '--check-only',
        '--route-profile',
        'basement',
        'HEAD',
        'main~1',
      ])
    ).toMatchObject({
      refs: ['HEAD', 'main~1'],
      checkOnly: true,
      routeProfile: 'basement',
    });
  });

  it.each([
    [],
    ['--unknown'],
    ['HEAD;touch'],
    ['--output'],
    ['--route-profile', 'unknown'],
    ['--output', 'a', '--output', 'b', 'HEAD'],
  ])('rejects invalid arguments %j', (args) => {
    expect(() => runner.parseArgs(args)).toThrow();
  });

  it('marks a one-attempt smoke explicitly instead of a full measurement series', () => {
    expect(runner.parseArgs(['--smoke', 'HEAD']).smoke).toBe(true);
    expect(runner.parseArgs(['HEAD']).smoke).toBe(false);
  });

  it('never labels smoke, failed results, or source drift as a completed series', () => {
    const valid = [{ exitCode: 0, result: { state: 'completed' } }];
    expect(runner.resultState(valid, true, true)).toBe('smoke-completed');
    expect(runner.resultState(valid, true, false)).toBe('completed');
    expect(runner.resultState(valid, false, false)).toBe('failed-source-drift');
    expect(
      runner.resultState(
        [{ exitCode: 1, result: { state: 'completed' } }],
        true,
        false
      )
    ).toBe('failed-or-unavailable');
  });

  it('preserves actual per-run route identities instead of only a capability label', () => {
    const [summary] = runner.summarize([
      {
        commit: 'source',
        routeProfile: 'basement',
        routes: [
          {
            attempt: 1,
            result: {
              state: 'completed',
              profile: 'house-basement-route-v1',
              checkpoints: [],
            },
          },
          {
            attempt: 2,
            result: {
              state: 'completed',
              profile: 'house-career-museum-route-v1',
              checkpoints: [],
            },
          },
          { attempt: 3 },
        ],
      },
    ]);
    expect(summary.checkpoints.map((run) => run.profile)).toEqual([
      'house-basement-route-v1',
      'house-career-museum-route-v1',
      null,
    ]);
  });

  it('checksums generated evidence without following worktrees or symlinks', () => {
    const repo = fixture();
    const output = runner.reserveOutput(repo, '.performance-history/hash-test');
    put(output, 'result.json', '{}');
    put(output, 'worktree/private.txt', 'not an artifact');
    symlinkSync(
      path.join(repo, 'package-lock.json'),
      path.join(output, 'linked-file')
    );
    expect(runner.artifactChecksums(output)).toEqual([
      {
        path: 'result.json',
        sha256: createHash('sha256').update('{}').digest('hex'),
        bytes: 2,
      },
    ]);
  });

  it('resolves exact commits and rejects duplicate resolutions', () => {
    const repo = fixture();
    const sha = git(repo, 'rev-parse', 'HEAD');
    expect(runner.resolveRefs(repo, ['HEAD'])).toEqual([
      { ref: 'HEAD', commit: sha },
    ]);
    expect(() => runner.resolveRefs(repo, ['HEAD', sha])).toThrow(/Duplicate/);
  });

  it('rejects invalid refs before creating any output or worktree', async () => {
    const repo = fixture();
    const before = git(repo, 'worktree', 'list', '--porcelain');
    await expect(
      runner.run(['--check-only', 'does-not-exist'], { cwd: repo })
    ).rejects.toThrow(/rev-parse/);
    expect(existsSync(path.join(repo, '.performance-history'))).toBe(false);
    expect(git(repo, 'worktree', 'list', '--porcelain')).toBe(before);
  });

  it('records original lockfile bytes and reports incompatible dependencies or harness', () => {
    const repo = fixture();
    const sha = git(repo, 'rev-parse', 'HEAD');
    expect(runner.inspectRef(repo, sha)).toMatchObject({
      compatible: true,
      lockSha256: createHash('sha256')
        .update(readFileSync(path.join(repo, 'package-lock.json')))
        .digest('hex'),
    });
    put(repo, 'package-lock.json', '{"lockfileVersion":2}\n');
    put(repo, 'playwright.config.ts', '// changed harness\n');
    const result = runner.inspectRef(repo, sha);
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'lockfile mismatch: dependencies are not comparable',
        'harness mismatch: playwright.config.ts',
      ])
    );
  });

  it('refuses existing output directories without overwriting their files', () => {
    const repo = fixture();
    const output = runner.reserveOutput(repo, '.performance-history/saved');
    put(output, 'keep.txt', 'original evidence');
    expect(() =>
      runner.reserveOutput(repo, '.performance-history/saved')
    ).toThrow(/EEXIST/);
    expect(readFileSync(path.join(output, 'keep.txt'), 'utf8')).toBe(
      'original evidence'
    );
  });

  it('rejects nonignored output, traversal, repository root, and symlink escapes', () => {
    const repo = fixture();
    expect(() => runner.reserveOutput(repo, 'public-output')).toThrow(
      /not gitignored/
    );
    expect(() => runner.reserveOutput(repo, '..')).toThrow(
      /inside this repository/
    );
    expect(() => runner.reserveOutput(repo, '.')).toThrow(
      /inside this repository/
    );
    mkdirSync(path.join(repo, '.performance-history'));
    symlinkSync(tmpdir(), path.join(repo, '.performance-history/link'), 'dir');
    expect(() =>
      runner.reserveOutput(repo, '.performance-history/link/capture')
    ).toThrow(/symlinks/);
  });

  it('removes only a clean worktree created by this invocation', () => {
    const repo = fixture();
    const sha = git(repo, 'rev-parse', 'HEAD');
    const originalList = git(repo, 'worktree', 'list', '--porcelain');
    const output = runner.reserveOutput(repo, '.performance-history/clean');
    const owned = runner.createOwnedWorktree(repo, output, sha);
    expect(runner.cleanupOwnedWorktree(owned)).toEqual({ state: 'removed' });
    expect(existsSync(owned.worktree)).toBe(false);
    expect(git(repo, 'worktree', 'list', '--porcelain')).toBe(originalList);
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(sha);
    expect(() => runner.cleanupOwnedWorktree(owned)).toThrow(/unowned/);
    expect(() =>
      runner.cleanupOwnedWorktree({ repo, worktree: repo, output, commit: sha })
    ).toThrow(/unowned/);
  });

  it('cleans its generated artifacts without following dependency symlinks', () => {
    const repo = fixture();
    const output = runner.reserveOutput(repo, '.performance-history/generated');
    const owned = runner.createOwnedWorktree(
      repo,
      output,
      git(repo, 'rev-parse', 'HEAD')
    );
    put(repo, 'node_modules/keep.txt', 'shared dependency');
    symlinkSync(
      path.join(repo, 'node_modules'),
      path.join(owned.worktree, 'node_modules'),
      'dir'
    );
    put(owned.worktree, 'test-results/trace.zip', 'generated fixture artifact');
    put(output, 'retained-output.txt', 'retained evidence');
    expect(runner.cleanupOwnedWorktree(owned).state).toBe('removed');
    expect(readFileSync(path.join(repo, 'node_modules/keep.txt'), 'utf8')).toBe(
      'shared dependency'
    );
    expect(readFileSync(path.join(output, 'retained-output.txt'), 'utf8')).toBe(
      'retained evidence'
    );
  });

  it.each(['untracked.txt', '.env'])(
    'preserves worktree with unexpected user content: %s',
    (filename) => {
      const repo = fixture();
      const owned = runner.createOwnedWorktree(
        repo,
        runner.reserveOutput(repo, '.performance-history/dirty'),
        git(repo, 'rev-parse', 'HEAD')
      );
      put(owned.worktree, filename, 'preserve this');
      expect(runner.cleanupOwnedWorktree(owned).state).toBe('preserved');
      expect(readFileSync(path.join(owned.worktree, filename), 'utf8')).toBe(
        'preserve this'
      );
    }
  );

  it('generates ignored check-only metadata without starting a browser or worktree', async () => {
    const repo = fixture();
    const before = git(repo, 'worktree', 'list', '--porcelain');
    const result = await runner.run(
      ['--check-only', '--output', '.performance-history/check', 'HEAD'],
      { cwd: repo }
    );
    expect(result.success).toBe(true);
    expect(result.manifest.runnerSha256).toBe(
      createHash('sha256')
        .update(readFileSync(path.resolve('scripts/performance-history.cjs')))
        .digest('hex')
    );
    expect(result.manifest.callerSourceCommit).toBe(
      git(repo, 'rev-parse', 'HEAD')
    );
    expect(result.manifest.callerTreeDirty).toBe(false);
    expect(result.manifest.entries[0].state).toBe('compatible-not-measured');
    expect(existsSync(path.join(result.output, 'manifest.json'))).toBe(true);
    expect(git(repo, 'status', '--porcelain', '--untracked-files=all')).toBe(
      ''
    );
    expect(git(repo, 'worktree', 'list', '--porcelain')).toBe(before);
    expect(
      git(
        process.cwd(),
        'check-ignore',
        '--no-index',
        '.performance-history/generated/manifest.json'
      )
    ).toBe('.performance-history/generated/manifest.json');
  });

  it('excludes retained generated worktrees from ESLint discovery', async () => {
    const { ESLint } = createRequire(import.meta.url)('eslint') as {
      ESLint: new (options: { cwd: string }) => {
        isPathIgnored(file: string): Promise<boolean>;
      };
    };
    const eslint = new ESLint({ cwd: process.cwd() });
    expect(readFileSync('.eslintignore', 'utf8')).toContain(
      '.performance-history/'
    );
    expect(
      await eslint.isPathIgnored(
        path.resolve('.performance-history/retained/worktree/src/example.ts')
      )
    ).toBe(true);
  });

  it('reports unavailable basement additions instead of silently claiming that route', async () => {
    const result = await runner.run(
      ['--check-only', '--route-profile', 'basement', 'HEAD'],
      { cwd: fixture() }
    );
    expect(result.manifest.entries[0]).toMatchObject({
      routeProfile: 'common',
      skippedRouteCapabilities: [{ capability: 'basement' }],
    });
  });

  it('retains common routes and explicit skips for unavailable exterior additions', async () => {
    const result = await runner.run(
      ['--check-only', '--route-profile', 'exterior', 'HEAD'],
      { cwd: fixture(true) }
    );
    expect(result.manifest.entries[0]).toMatchObject({
      routeProfile: 'common',
      skippedRouteCapabilities: [{ capability: 'exterior' }],
    });
  });

  it('recognizes a versioned exterior helper and its actual source definition', async () => {
    const result = await runner.run(
      ['--check-only', '--route-profile', 'exterior', 'HEAD'],
      { cwd: fixture(true, true) }
    );
    expect(result.manifest.entries[0]).toMatchObject({
      routeProfile: 'exterior',
      skippedRouteCapabilities: [],
    });
  });

  it('retains common routes when a historical ref has no garage', async () => {
    const result = await runner.run(
      ['--check-only', '--route-profile', 'garage', 'HEAD'],
      { cwd: fixture(true, true) }
    );
    expect(result.manifest.entries[0]).toMatchObject({
      routeProfile: 'common',
      skippedRouteCapabilities: [{ capability: 'garage' }],
    });
  });
  it('recognizes the versioned garage helper and source definition', async () => {
    const result = await runner.run(
      ['--check-only', '--route-profile', 'garage', 'HEAD'],
      { cwd: fixture(true, true, true) }
    );
    expect(result.manifest.entries[0]).toMatchObject({
      routeProfile: 'garage',
      skippedRouteCapabilities: [],
    });
  });

  it('recognizes the versioned stage2 basement capability', async () => {
    const result = await runner.run(
      ['--check-only', '--route-profile', 'basement', 'HEAD'],
      { cwd: fixture(true) }
    );
    expect(result.manifest.entries[0]).toMatchObject({
      routeProfile: 'basement',
      skippedRouteCapabilities: [],
    });
  });
});
