import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

const execFileAsync = promisify(execFile);

const runAudit = async (args: string[]) => {
  const { stdout } = await execFileAsync(
    'npx',
    ['tsx', 'scripts/colliderReachabilityAudit.ts', ...args],
    {
      env: { ...process.env, PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:5173' },
      timeout: 120_000,
    }
  );
  return JSON.parse(stdout) as Array<{
    classification: string;
    approaches: Array<{
      status: string;
      pathLength: number;
      start?: { x: number; z: number; floorId: string };
    }>;
  }>;
};

test.describe('collider reachability audit CLI', () => {
  test('reports a semantic physical boundary as directly load-bearing', async () => {
    const [report] = await runAudit([
      '--source-id',
      'ground.backyard.perimeter.backFence.boundary',
      '--json',
    ]);

    expect(report.classification).toBe('directly-load-bearing');
    expect(
      report.approaches.some(
        (approach) =>
          approach.status === 'candidate-first' &&
          approach.pathLength > 0 &&
          Boolean(approach.start)
      )
    ).toBe(true);
  });

  test('reports a visual-only policy from source intent without a fake collider', async () => {
    const [report] = await runAudit([
      '--source-id',
      'ground.livingRoom.mediaWall.futuroptimist',
      '--json',
    ]);

    expect(report.classification).toBe('visual-only-by-policy');
    expect(report.approaches).toEqual([]);
  });
});
