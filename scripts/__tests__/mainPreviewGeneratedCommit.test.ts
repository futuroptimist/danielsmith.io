/** @vitest-environment node */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const filename = '.github/workflows/build-preview-candidate.yml';
const workflow = readFileSync(filename, 'utf8');
const canonical = 'futuroptimist/danielsmith.io';
const main = 'refs/heads/main';
const sha = 'a'.repeat(40);

function workflowStep(name: string) {
  const match = workflow.match(
    new RegExp(
      `^      - name: ${name}\\n        shell: bash\\n        run: \\|\\n((?: {10}[^\\n]*\\n)+)`,
      'm'
    )
  );
  if (!match) throw new Error(`Missing runnable bash block: ${name}`);
  return match[1].replace(/^ {10}/gm, '');
}

function runStep(
  name: string,
  env: Record<string, string>,
  cwd = process.cwd()
) {
  const result = spawnSync(
    'bash',
    ['-e', '-o', 'pipefail', '-c', workflowStep(name)],
    {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    }
  );
  if (result.error) throw result.error;
  return result.status;
}

const generated = {
  MAIN_PREVIEW_SHA: sha,
  MAIN_PREVIEW_SOURCE_KIND: 'generated',
  GITHUB_REPOSITORY: canonical,
  GITHUB_REF: main,
  GITHUB_EVENT_NAME: 'push',
  GITHUB_WORKFLOW_REF: `${canonical}/.github/workflows/04-launch-screenshot.yml@${main}`,
};
const recovery = {
  ...generated,
  MAIN_PREVIEW_SOURCE_KIND: 'recovery',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_WORKFLOW_REF: `${canonical}/.github/workflows/main-preview-candidate.yml@${main}`,
};

describe('Main Preview generated commit workflow', () => {
  it('only accepts well-formed exact generated or manually recovered sources from the right callers', () => {
    const step = 'Validate source request';
    expect(runStep(step, generated)).toBe(0);
    expect(runStep(step, recovery)).toBe(0);
    expect(
      runStep(step, {
        ...generated,
        GITHUB_EVENT_NAME: 'workflow_dispatch',
        GITHUB_WORKFLOW_REF: `${canonical}/.github/workflows/floorplan-diagram.yml@${main}`,
      })
    ).toBe(0);
    for (const disallowed of [
      { MAIN_PREVIEW_SHA: '' },
      { MAIN_PREVIEW_SHA: sha.slice(0, 7) },
      { MAIN_PREVIEW_SHA: sha.toUpperCase() },
      { GITHUB_REPOSITORY: 'other/danielsmith.io' },
      { GITHUB_REF: 'refs/heads/Main' },
      { GITHUB_EVENT_NAME: 'pull_request' },
      { GITHUB_WORKFLOW_REF: recovery.GITHUB_WORKFLOW_REF },
    ]) {
      expect(runStep(step, { ...generated, ...disallowed })).toBe(1);
    }
    expect(runStep(step, { ...recovery, GITHUB_EVENT_NAME: 'push' })).toBe(1);
  });

  it('retains direct PR and main-push checkouts', () => {
    const direct = { ...generated, MAIN_PREVIEW_SOURCE_KIND: 'direct' };
    expect(runStep('Validate source request', direct)).toBe(0);
    expect(
      runStep('Validate source request', {
        ...direct,
        GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_REF: 'refs/pull/12/merge',
      })
    ).toBe(0);
    expect(
      runStep('Validate source request', {
        ...direct,
        GITHUB_REF: 'refs/heads/topic',
      })
    ).toBe(1);
  });

  it('accepts the exact earlier main commit without substituting the tip or a merged side parent', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'preview-generated-test-'));
    try {
      const repo = path.join(tmp, 'origin');
      const checkout = path.join(tmp, 'checkout');
      const git = (cwd: string, args: string[], input?: string) =>
        execFileSync(
          'git',
          [
            '-c',
            'user.name=Fixture',
            '-c',
            'user.email=fixture@example.invalid',
            ...args,
          ],
          {
            cwd,
            input,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        ).trim();
      git(tmp, ['init', '--initial-branch=main', repo]);
      const emptyTree = git(repo, ['mktree'], '');
      const commit = (message: string, ...parents: string[]) =>
        git(repo, [
          'commit-tree',
          emptyTree,
          '-m',
          message,
          ...parents.flatMap((p) => ['-p', p]),
        ]);
      const base = commit('base');
      const pushed = commit('generated output', base);
      const feature = commit('feature', base);
      const tip = commit('later merge', pushed, feature);
      git(repo, ['update-ref', main, tip]);
      git(tmp, ['clone', repo, checkout]);
      const name = 'Verify checked-out commit before dependency installation';
      const env = {
        ...generated,
        GITHUB_SHA: base,
        GITHUB_STEP_SUMMARY: path.join(tmp, 'summary'),
      };
      git(checkout, ['checkout', '--detach', pushed]);
      expect(
        runStep(name, { ...env, MAIN_PREVIEW_SHA: pushed }, checkout)
      ).toBe(0);
      expect(readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8')).toContain(pushed);
      expect(runStep(name, { ...env, MAIN_PREVIEW_SHA: tip }, checkout)).toBe(
        1
      );
      git(checkout, ['checkout', '--detach', feature]);
      expect(
        runStep(name, { ...env, MAIN_PREVIEW_SHA: feature }, checkout)
      ).toBe(1);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
