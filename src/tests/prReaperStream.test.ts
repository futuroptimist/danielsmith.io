import { describe, expect, it } from 'vitest';

import {
  PR_REAPER_CIRCLE_RADIUS,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_STREAM_CATCH_UP_SPAWN_CAP,
  PR_REAPER_STREAM_END_Y,
  PR_REAPER_STREAM_INTERVAL_MAX_SECONDS,
  PR_REAPER_STREAM_INTERVAL_MIN_SECONDS,
  PR_REAPER_STREAM_START_Y,
} from '../scene/structures/prReaperInstallationContract';
import { createPrReaperStream } from '../scene/structures/prReaperStream';

function run(seed: string, steps = 700, delta = 1 / 30) {
  const stream = createPrReaperStream({ seed });
  for (let i = 0; i < steps; i += 1) stream.advance(delta);
  return stream.getDebugState();
}

describe('prReaperStream', () => {
  it('produces identical schedules and active states for identical seeds', () => {
    expect(run('same-seed')).toEqual(run('same-seed'));
  });

  it('changes schedule or horizontal positions for different seeds', () => {
    const a = run('seed-a');
    const b = run('seed-b');
    expect({ history: a.spawnHistory, active: a.activeCandidates }).not.toEqual(
      {
        history: b.spawnHistory,
        active: b.activeCandidates,
      }
    );
  });

  it('keeps every completed shuffled batch at exactly three red and one green', () => {
    const debug = run('batch-seed', 2200);
    for (let i = 0; i + 3 < debug.spawnHistory.length; i += 4) {
      const batch = debug.spawnHistory.slice(i, i + 4);
      expect(batch.filter((type) => type === 'red')).toHaveLength(3);
      expect(batch.filter((type) => type === 'green')).toHaveLength(1);
    }
    const completed = Math.floor(debug.spawnHistory.length / 4) * 4;
    expect(
      debug.spawnHistory.slice(0, completed).filter((t) => t === 'red')
    ).toHaveLength((completed / 4) * 3);
  });

  it('keeps all spawn intervals including the first inside the contract', () => {
    const debug = run('interval-seed', 1200);
    debug.spawnIntervals.forEach((interval) => {
      expect(interval).toBeGreaterThanOrEqual(
        PR_REAPER_STREAM_INTERVAL_MIN_SECONDS
      );
      expect(interval).toBeLessThanOrEqual(
        PR_REAPER_STREAM_INTERVAL_MAX_SECONDS
      );
    });
  });

  it('keeps horizontal centers fully inside screen margins', () => {
    const debug = run('x-seed', 900);
    debug.activeCandidates.forEach((candidate) => {
      const xFromLeft = candidate.normalizedX * PR_REAPER_SCREEN_WIDTH;
      expect(xFromLeft).toBeGreaterThanOrEqual(PR_REAPER_CIRCLE_RADIUS);
      expect(xFromLeft).toBeLessThanOrEqual(
        PR_REAPER_SCREEN_WIDTH - PR_REAPER_CIRCLE_RADIUS
      );
    });
  });

  it('descends monotonically and expires only below the bottom exit', () => {
    const stream = createPrReaperStream({ seed: 'descent' });
    const seen = new Map<number, number>();
    for (let i = 0; i < 420; i += 1) {
      stream.advance(1 / 30);
      const debug = stream.getDebugState();
      debug.activeCandidates.forEach((candidate) => {
        expect(candidate.center.y).toBeLessThanOrEqual(
          PR_REAPER_STREAM_START_Y
        );
        expect(candidate.center.y).toBeGreaterThanOrEqual(
          PR_REAPER_STREAM_END_Y
        );
        const previous = seen.get(candidate.id);
        if (previous !== undefined)
          expect(candidate.center.y).toBeLessThanOrEqual(previous);
        seen.set(candidate.id, candidate.center.y);
      });
    }
    const debug = stream.getDebugState();
    expect(debug.totalExpiredRed + debug.totalExpiredGreen).toBeGreaterThan(0);
  });

  it('bounds large deltas and ignores negative or nonfinite deltas', () => {
    const stream = createPrReaperStream({ seed: 'guarded' });
    stream.advance(-1);
    stream.advance(Number.NaN);
    stream.advance(Number.POSITIVE_INFINITY);
    expect(stream.getDebugState().totalSpawned).toBe(0);
    stream.advance(600);
    const debug = stream.getDebugState();
    expect(debug.totalSpawned).toBeLessThanOrEqual(
      PR_REAPER_STREAM_CATCH_UP_SPAWN_CAP
    );
    expect(debug.droppedCappedSpawnCount).toBeGreaterThan(0);
    debug.activeCandidates.forEach((candidate) => {
      expect(Number.isFinite(candidate.center.x)).toBe(true);
      expect(Number.isFinite(candidate.center.y)).toBe(true);
    });
  });
});
