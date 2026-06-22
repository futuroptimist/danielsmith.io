import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

const runAudit = (args: string[]) =>
  JSON.parse(
    execFileSync(
      'npx',
      ['tsx', 'scripts/colliderReachabilityAudit.ts', ...args, '--json'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_BASE_URL:
            process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173',
        },
        encoding: 'utf8',
        timeout: 120_000,
      }
    )
  );

test('reports a semantic physical boundary as directly load-bearing', () => {
  const [report] = runAudit([
    '--source-id',
    'ground.backyard.perimeter.backFence.boundary',
  ]);
  expect(report.classification).toBe('directly-load-bearing');
  expect(report.candidate.sourceId).toBe(
    'ground.backyard.perimeter.backFence.boundary'
  );
});

test('reports a semantic visual-only source from policy intent', () => {
  const [report] = runAudit([
    '--source-id',
    'ground.livingRoom.mediaWall.futuroptimist',
  ]);
  expect(report.classification).toBe('visual-only-by-policy');
  expect(report.note).toContain(
    'intentionally has no floor-level interaction footprint'
  );
});
