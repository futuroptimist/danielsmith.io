import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

const runReachabilityAudit = (args: string[]) => {
  const stdout = execFileSync(
    'npm',
    ['run', 'collider:audit:reachability', '--', ...args, '--json'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL:
          process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173',
      },
      timeout: 90_000,
    }
  );
  const jsonStart = stdout.indexOf('[\n');
  if (jsonStart === -1) throw new Error(`Audit did not print JSON: ${stdout}`);
  return JSON.parse(stdout.slice(jsonStart));
};

test('reports semantic collider reachability evidence without historical IDs', () => {
  const [report] = runReachabilityAudit([
    '--source-id',
    'upper.stairwell.landingGuard.shoulderEast',
  ]);

  expect(['dominated', 'directly-load-bearing', 'ambiguous']).toContain(
    report.classification
  );
  expect(report.candidate?.sourceId).toBe(
    'upper.stairwell.landingGuard.shoulderEast'
  );
});

test('reports a semantic visual-only policy without inventing a collider', () => {
  const [report] = runReachabilityAudit([
    '--source-id',
    'ground.livingRoom.mediaWall.futuroptimist',
  ]);

  expect(report.classification).toBe('visual-only-by-policy');
  expect(report.sourcePolicy?.rationale).toContain(
    'intentionally has no floor-level'
  );
  expect(report.candidate).toBeUndefined();
});
