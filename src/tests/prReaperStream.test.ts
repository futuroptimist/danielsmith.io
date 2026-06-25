import { describe, expect, it } from 'vitest';

import {
  PR_REAPER_PR_CIRCLE_HORIZONTAL_MARGIN,
  PR_REAPER_PR_CIRCLE_RADIUS,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_STREAM_DESCENT_DURATION,
  PR_REAPER_STREAM_END_Y,
  PR_REAPER_STREAM_MAX_SPAWNS_PER_ADVANCE,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MAX,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MIN,
  PR_REAPER_STREAM_START_Y,
} from '../scene/structures/prReaperInstallationContract';
import { createPrReaperStream } from '../scene/structures/prReaperStream';

function runStream(seed: string, seconds = 24, delta = 0.1) {
  const stream = createPrReaperStream({ seed });
  for (let elapsed = 0; elapsed < seconds; elapsed += delta) {
    stream.advance(delta);
  }
  return stream.getDebugState();
}

describe('PrReaper deterministic stream', () => {
  it('produces identical schedules and active states for the same seed', () => {
    expect(runStream('repeatable')).toEqual(runStream('repeatable'));
  });

  it('varies schedule or x positions for different seeds', () => {
    const a = runStream('seed-a');
    const b = runStream('seed-b');

    expect(a.spawnLog).not.toEqual(b.spawnLog);
  });

  it('shuffles completed four-spawn batches while preserving exactly three red and one green', () => {
    const debug = runStream('ratio', 80);
    const completedBatchCount = Math.floor(debug.spawnLog.length / 4);

    for (let i = 0; i < completedBatchCount; i += 1) {
      const batch = debug.spawnLog.slice(i * 4, i * 4 + 4);
      expect(
        batch.filter((candidate) => candidate.type === 'red')
      ).toHaveLength(3);
      expect(
        batch.filter((candidate) => candidate.type === 'green')
      ).toHaveLength(1);
    }

    const completed = debug.spawnLog.slice(0, completedBatchCount * 4);
    expect(
      completed.filter((candidate) => candidate.type === 'red')
    ).toHaveLength(completedBatchCount * 3);
    expect(
      completed.filter((candidate) => candidate.type === 'green')
    ).toHaveLength(completedBatchCount);
  });

  it('keeps every spawn interval, including the first, within the configured bounds', () => {
    const debug = runStream('intervals', 48);

    debug.spawnLog.forEach((spawn) => {
      expect(spawn.interval).toBeGreaterThanOrEqual(
        PR_REAPER_STREAM_SPAWN_INTERVAL_MIN
      );
      expect(spawn.interval).toBeLessThanOrEqual(
        PR_REAPER_STREAM_SPAWN_INTERVAL_MAX
      );
    });
  });

  it('keeps normalized x values inside screen-safe margins', () => {
    const debug = runStream('x-safe', 36);
    const safeHalfWidth =
      PR_REAPER_SCREEN_WIDTH / 2 -
      PR_REAPER_PR_CIRCLE_RADIUS -
      PR_REAPER_PR_CIRCLE_HORIZONTAL_MARGIN;

    debug.spawnLog.forEach((spawn) => {
      expect(spawn.normalizedX).toBeGreaterThanOrEqual(0);
      expect(spawn.normalizedX).toBeLessThanOrEqual(1);
    });
    debug.activeCandidates.forEach((candidate) => {
      expect(Math.abs(candidate.center.x)).toBeLessThanOrEqual(safeHalfWidth);
    });
  });

  it('descends monotonically and expires only after exiting below the screen', () => {
    const stream = createPrReaperStream({ seed: 'descent' });
    let previousY = Number.POSITIVE_INFINITY;
    let trackedId: number | undefined;

    for (let i = 0; i < 80; i += 1) {
      stream.advance(0.1);
      const candidates = stream.getDebugState().activeCandidates;
      trackedId ??= candidates[0]?.id;
      const first = candidates.find((candidate) => candidate.id === trackedId);
      if (!first) continue;
      expect(first.center.y).toBeLessThanOrEqual(previousY);
      expect(first.center.y).toBeLessThanOrEqual(PR_REAPER_STREAM_START_Y);
      expect(first.center.y).toBeGreaterThan(PR_REAPER_STREAM_END_Y);
      previousY = first.center.y;
    }

    stream.advance(PR_REAPER_STREAM_DESCENT_DURATION);
    const debug = stream.getDebugState();
    expect(debug.totalExpiredRed + debug.totalExpiredGreen).toBeGreaterThan(0);
    debug.activeCandidates.forEach((candidate) => {
      expect(candidate.center.y).toBeGreaterThan(
        PR_REAPER_SCREEN_BOTTOM_Y - PR_REAPER_PR_CIRCLE_RADIUS
      );
    });
  });

  it('bounds huge deltas and ignores negative or nonfinite deltas', () => {
    const stream = createPrReaperStream({ seed: 'delta-guards' });
    stream.advance(-1);
    stream.advance(Number.NaN);
    stream.advance(Number.POSITIVE_INFINITY);
    expect(stream.getDebugState().totalSpawned).toBe(0);

    stream.advance(999);
    const debug = stream.getDebugState();
    expect(debug.totalSpawned).toBeLessThanOrEqual(
      PR_REAPER_STREAM_MAX_SPAWNS_PER_ADVANCE
    );
    expect(debug.droppedCappedSpawnCount).toBeGreaterThan(0);
    expect(Number.isFinite(debug.nextSpawnTime)).toBe(true);
  });

  it('has no detail-policy or emphasis inputs in the pure stream semantics', () => {
    const stream = createPrReaperStream({ seed: 'pure' });
    stream.advance(1);
    expect(Object.keys(stream.getDebugState()).sort()).not.toEqual(
      expect.arrayContaining(['detailLevel', 'emphasis'])
    );
  });
});
