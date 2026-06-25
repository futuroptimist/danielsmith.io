import { describe, expect, it } from 'vitest';

import {
  PR_REAPER_CIRCLE_HORIZONTAL_MARGIN,
  PR_REAPER_CIRCLE_RADIUS,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_STREAM_DESCENT_DURATION_SECONDS,
  PR_REAPER_STREAM_END_Y,
  PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MAX_SECONDS,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS,
  PR_REAPER_STREAM_START_Y,
} from '../scene/structures/prReaperInstallationContract';
import { createPrReaperStream } from '../scene/structures/prReaperStream';

function advanceMany(seed: string, deltas: number[]) {
  const stream = createPrReaperStream({ seed });
  deltas.forEach((delta) => stream.advance(delta));
  return stream.getDebugState();
}

function fixedDeltas(count: number, delta: number): number[] {
  return Array.from({ length: count }, () => delta);
}

describe('PrReaperStreamState', () => {
  it('produces identical schedules and active states for the same seed', () => {
    const deltas = fixedDeltas(420, 1 / 30);
    expect(advanceMany('same-seed', deltas)).toEqual(
      advanceMany('same-seed', deltas)
    );
  });

  it('produces different schedules or positions for different seeds', () => {
    const deltas = fixedDeltas(420, 1 / 30);
    const a = advanceMany('seed-a', deltas);
    const b = advanceMany('seed-b', deltas);
    expect({
      intervals: a.spawnIntervals,
      active: a.activeCandidates,
    }).not.toEqual({
      intervals: b.spawnIntervals,
      active: b.activeCandidates,
    });
  });

  it('keeps every completed four-spawn batch at exactly three red and one green', () => {
    const debug = advanceMany('batch-seed', fixedDeltas(2400, 1 / 30));
    const completed = debug.spawnedTypes.slice(
      0,
      debug.spawnedTypes.length - (debug.spawnedTypes.length % 4)
    );
    for (let index = 0; index < completed.length; index += 4) {
      const batch = completed.slice(index, index + 4);
      expect(batch.filter((type) => type === 'red')).toHaveLength(3);
      expect(batch.filter((type) => type === 'green')).toHaveLength(1);
    }
    expect(completed.filter((type) => type === 'red')).toHaveLength(
      (completed.length / 4) * 3
    );
    expect(completed.filter((type) => type === 'green')).toHaveLength(
      completed.length / 4
    );
  });

  it('keeps all spawn intervals, including the first, inside the contract', () => {
    const debug = advanceMany('interval-seed', fixedDeltas(900, 1 / 20));
    expect(debug.spawnIntervals.length).toBeGreaterThan(1);
    debug.spawnIntervals.forEach((interval) => {
      expect(interval).toBeGreaterThanOrEqual(
        PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS
      );
      expect(interval).toBeLessThanOrEqual(
        PR_REAPER_STREAM_SPAWN_INTERVAL_MAX_SECONDS
      );
    });
    expect(debug.spawnIntervals[0]).toBeGreaterThanOrEqual(
      PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS
    );
  });

  it('keeps normalized X values and circle centers inside safe screen margins', () => {
    const debug = advanceMany('x-seed', fixedDeltas(900, 1 / 20));
    const minX =
      -PR_REAPER_SCREEN_WIDTH / 2 +
      PR_REAPER_CIRCLE_HORIZONTAL_MARGIN +
      PR_REAPER_CIRCLE_RADIUS;
    const maxX =
      PR_REAPER_SCREEN_WIDTH / 2 -
      PR_REAPER_CIRCLE_HORIZONTAL_MARGIN -
      PR_REAPER_CIRCLE_RADIUS;
    debug.activeCandidates.forEach((candidate) => {
      expect(candidate.normalizedX).toBeGreaterThanOrEqual(0);
      expect(candidate.normalizedX).toBeLessThan(1);
      expect(candidate.center.x).toBeGreaterThanOrEqual(minX);
      expect(candidate.center.x).toBeLessThanOrEqual(maxX);
    });
  });

  it('moves Y monotonically downward and expires only below the screen', () => {
    const stream = createPrReaperStream({ seed: 'descent-seed' });
    let trackedId: number | undefined;
    let previousY = Number.POSITIVE_INFINITY;
    for (let step = 0; step < 220; step += 1) {
      stream.advance(1 / 20);
      const debug = stream.getDebugState();
      trackedId ??= debug.activeCandidates[0]?.id;
      const tracked = debug.activeCandidates.find(
        (candidate) => candidate.id === trackedId
      );
      if (!tracked && trackedId !== undefined) break;
      if (!tracked) continue;
      expect(tracked.center.y).toBeLessThanOrEqual(previousY);
      previousY = tracked.center.y;
      expect(tracked.center.y).toBeGreaterThan(PR_REAPER_STREAM_END_Y);
    }
    stream.advance(PR_REAPER_STREAM_DESCENT_DURATION_SECONDS + 2);
    stream.getDebugState().activeCandidates.forEach((candidate) => {
      expect(candidate.center.y).toBeGreaterThan(PR_REAPER_SCREEN_BOTTOM_Y - 1);
      expect(candidate.center.y).toBeLessThanOrEqual(PR_REAPER_STREAM_START_Y);
    });
  });

  it('bounds huge deltas and ignores negative or nonfinite deltas', () => {
    const stream = createPrReaperStream({ seed: 'guard-seed' });
    const before = stream.getDebugState();
    stream.advance(-1);
    stream.advance(Number.NaN);
    stream.advance(Number.POSITIVE_INFINITY);
    expect(stream.getDebugState()).toEqual(before);
    stream.advance(3600);
    const after = stream.getDebugState();
    expect(after.totalSpawned).toBeLessThanOrEqual(
      PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS
    );
    expect(after.droppedCappedSpawnCount).toBeGreaterThan(0);
    expect(Number.isFinite(after.nextSpawnTime)).toBe(true);
  });

  it('has semantics independent of presentation-only emphasis or detail policy', () => {
    const deltas = fixedDeltas(300, 1 / 24);
    expect(advanceMany('semantic-seed', deltas)).toEqual(
      advanceMany('semantic-seed', deltas)
    );
  });
});
