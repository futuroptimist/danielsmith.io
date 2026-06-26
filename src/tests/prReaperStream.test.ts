import { describe, expect, it } from 'vitest';

import {
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_STREAM_CIRCLE_RADIUS,
  PR_REAPER_STREAM_DESCENT_DURATION_SECONDS,
  PR_REAPER_STREAM_END_Y,
  PR_REAPER_STREAM_HORIZONTAL_MARGIN,
  PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MAX_SECONDS,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS,
  PR_REAPER_STREAM_START_Y,
} from '../scene/structures/prReaperInstallationContract';
import {
  createPrReaperStream,
  PR_REAPER_STREAM_DEBUG_HISTORY_LIMIT,
} from '../scene/structures/prReaperStream';

function run(seed: string, steps = 800, delta = 0.1) {
  const stream = createPrReaperStream({ seed });
  for (let i = 0; i < steps; i += 1) stream.advance(delta);
  return stream.getDebugState();
}

describe('PR Reaper deterministic stream', () => {
  it('replays identical schedules and active states for the same seed', () => {
    expect(run('same-seed')).toEqual(run('same-seed'));
  });

  it('varies schedules or positions for different seeds', () => {
    const a = run('seed-a');
    const b = run('seed-b');
    expect(a.spawnHistory).not.toEqual(b.spawnHistory);
  });

  it('shuffles exact three-red/one-green batches and preserves the ratio', () => {
    const state = run('ratio-seed', 1200, 0.1);
    const completed = state.spawnHistory.slice(
      0,
      state.spawnHistory.length - (state.spawnHistory.length % 4)
    );
    expect(completed.length).toBeGreaterThanOrEqual(64);
    for (let i = 0; i < completed.length; i += 4) {
      const batch = completed.slice(i, i + 4);
      expect(batch.filter((entry) => entry.type === 'red')).toHaveLength(3);
      expect(batch.filter((entry) => entry.type === 'green')).toHaveLength(1);
    }
    expect(completed.filter((entry) => entry.type === 'red')).toHaveLength(
      completed.filter((entry) => entry.type === 'green').length * 3
    );
  });

  it('keeps every interval, including the first, inside the contract range', () => {
    const state = run('interval-seed', 500, 0.1);
    state.spawnHistory.forEach((entry) => {
      expect(entry.interval).toBeGreaterThanOrEqual(
        PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS
      );
      expect(entry.interval).toBeLessThanOrEqual(
        PR_REAPER_STREAM_SPAWN_INTERVAL_MAX_SECONDS
      );
    });
  });

  it('keeps normalized X positions fully inside horizontal screen margins', () => {
    const state = run('x-seed', 500, 0.1);
    const min =
      (PR_REAPER_STREAM_HORIZONTAL_MARGIN + PR_REAPER_STREAM_CIRCLE_RADIUS) /
      PR_REAPER_SCREEN_WIDTH;
    const max = 1 - min;
    state.spawnHistory.forEach((entry) => {
      expect(entry.normalizedX).toBeGreaterThanOrEqual(min);
      expect(entry.normalizedX).toBeLessThanOrEqual(max);
    });
  });

  it('descends monotonically and expires only below the bottom exit', () => {
    const stream = createPrReaperStream({ seed: 'descent-seed' });
    let previousY = PR_REAPER_STREAM_START_Y;
    let trackedId: number | null = null;
    for (let i = 0; i < 80; i += 1) {
      stream.advance(0.1);
      const candidates = stream.getDebugState().activeCandidates;
      if (trackedId === null) trackedId = candidates[0]?.id ?? null;
      const first = candidates.find((candidate) => candidate.id === trackedId);
      if (!first) continue;
      expect(first.center.y).toBeLessThanOrEqual(previousY);
      previousY = first.center.y;
      expect(first.center.y).toBeGreaterThan(PR_REAPER_STREAM_END_Y);
    }
    stream.advance(PR_REAPER_STREAM_DESCENT_DURATION_SECONDS * 2);
    const state = stream.getDebugState();
    expect(state.totalExpiredRed + state.totalExpiredGreen).toBeGreaterThan(0);
    state.activeCandidates.forEach((candidate) => {
      expect(candidate.center.y).toBeGreaterThan(PR_REAPER_STREAM_END_Y);
    });
  });

  it('keeps debug history bounded while aggregate spawn/expiry counters accumulate', () => {
    const stream = createPrReaperStream({ seed: 'bounded-history-seed' });
    for (let i = 0; i < 2400; i += 1) stream.advance(0.1);

    const state = stream.getDebugState();
    const totalExpired = state.totalExpiredRed + state.totalExpiredGreen;

    expect(state.spawnHistory).toHaveLength(
      PR_REAPER_STREAM_DEBUG_HISTORY_LIMIT
    );
    expect(state.totalSpawned).toBeGreaterThan(
      PR_REAPER_STREAM_DEBUG_HISTORY_LIMIT
    );
    expect(state.totalSpawned).toBe(
      state.totalSpawnedRed + state.totalSpawnedGreen
    );
    expect(totalExpired).toBeGreaterThan(PR_REAPER_STREAM_DEBUG_HISTORY_LIMIT);
    expect(state.totalSpawned).toBeGreaterThanOrEqual(
      totalExpired + state.activeCandidateCount
    );
  });

  it('exposes active-only lifecycle values for current candidates', () => {
    const state = run('active-only-lifecycle-seed', 140, 0.1);

    expect(state.activeCandidateCount).toBeGreaterThan(0);
    expect(
      state.activeCandidates.every(
        (candidate) => candidate.lifecycle === 'active'
      )
    ).toBe(true);
  });

  it('reaps active red candidates without incrementing expired counters', () => {
    const stream = createPrReaperStream({ seed: 'reap-red-seed' });
    for (let i = 0; i < 40; i += 1) stream.advance(0.1);
    const red = stream
      .getDebugState()
      .activeCandidates.find((candidate) => candidate.type === 'red');
    expect(red).toBeDefined();
    const before = stream.getDebugState();
    const reaped = stream.reapCandidate(red!.id, 4);
    const after = stream.getDebugState();
    expect(reaped?.id).toBe(red!.id);
    expect(
      after.activeCandidates.some((candidate) => candidate.id === red!.id)
    ).toBe(false);
    expect(after.totalReapedRed).toBe(before.totalReapedRed + 1);
    expect(after.totalExpiredRed).toBe(before.totalExpiredRed);
    expect(stream.reapCandidate(red!.id)).toBeNull();
    expect(stream.getDebugState().totalReapedRed).toBe(after.totalReapedRed);
  });

  it('rejects green and missing reap attempts while preserving candidates', () => {
    const stream = createPrReaperStream({ seed: 'reap-green-seed' });
    for (let i = 0; i < 80; i += 1) stream.advance(0.1);
    const green = stream
      .getDebugState()
      .activeCandidates.find((candidate) => candidate.type === 'green');
    expect(green).toBeDefined();
    expect(stream.reapCandidate(green!.id)).toBeNull();
    expect(stream.getCandidateById(green!.id)).not.toBeNull();
    expect(stream.reapCandidate(999999)).toBeNull();
    expect(stream.getDebugState().attemptedGreenReapCount).toBe(1);
  });

  it('keeps future spawn history unchanged after reaping', () => {
    const a = createPrReaperStream({ seed: 'sequence-stable' });
    const b = createPrReaperStream({ seed: 'sequence-stable' });
    for (let i = 0; i < 50; i += 1) {
      a.advance(0.1);
      b.advance(0.1);
    }
    const red = a
      .getDebugState()
      .activeCandidates.find((candidate) => candidate.type === 'red');
    expect(red).toBeDefined();
    a.reapCandidate(red!.id);
    for (let i = 0; i < 100; i += 1) {
      a.advance(0.1);
      b.advance(0.1);
    }
    expect(a.getDebugState().spawnHistory).toEqual(
      b.getDebugState().spawnHistory
    );
  });

  it('bounds large deltas and ignores negative or nonfinite deltas', () => {
    const stream = createPrReaperStream({ seed: 'delta-seed' });
    const before = stream.getDebugState();
    stream.advance(-1);
    stream.advance(Number.NaN);
    stream.advance(Number.POSITIVE_INFINITY);
    expect(stream.getDebugState()).toEqual(before);
    stream.advance(9999);
    const after = stream.getDebugState();
    expect(after.activeCandidateCount).toBeLessThanOrEqual(
      PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS
    );
    expect(after.cappedSpawnCount).toBeGreaterThanOrEqual(0);
    after.activeCandidates.forEach((candidate) => {
      expect(Number.isFinite(candidate.center.x)).toBe(true);
      expect(Number.isFinite(candidate.center.y)).toBe(true);
      expect(Number.isFinite(candidate.progress)).toBe(true);
    });
  });
});
