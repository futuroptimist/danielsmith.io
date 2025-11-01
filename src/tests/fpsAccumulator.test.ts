import { describe, expect, it } from 'vitest';

import { createFpsAccumulator } from '../systems/performance/fpsAccumulator';

describe('createFpsAccumulator', () => {
  it('ignores non-finite values and tracks summary statistics', () => {
    const accumulator = createFpsAccumulator();
    accumulator.record(Number.NaN);
    accumulator.record(Number.POSITIVE_INFINITY);
    accumulator.record(-5);
    accumulator.record(12);
    accumulator.record(18);
    accumulator.record(24);

    const summary = accumulator.getSummary();
    expect(summary).not.toBeNull();
    expect(summary?.count).toBe(4);
    expect(summary?.minFps).toBeCloseTo(0); // negative value clamped to 0
    expect(summary?.maxFps).toBeCloseTo(24);
    expect(summary?.averageFps).toBeCloseTo((0 + 12 + 18 + 24) / 4, 5);
    expect(summary?.p95Fps).toBeCloseTo(24);
    expect(summary?.medianFps).toBeCloseTo((12 + 18) / 2, 5);
  });

  it('computes percentile using ceiling semantics and resets state', () => {
    const accumulator = createFpsAccumulator();
    accumulator.record(30);
    accumulator.record(28);
    accumulator.record(18);
    accumulator.record(20);

    const summaryBeforeReset = accumulator.getSummary();
    expect(summaryBeforeReset?.p95Fps).toBeCloseTo(30);
    expect(summaryBeforeReset?.medianFps).toBeCloseTo((20 + 28) / 2, 5);

    accumulator.reset();
    expect(accumulator.getSummary()).toBeNull();

    accumulator.record(22);
    accumulator.record(26);
    accumulator.record(24);
    const summaryAfterReset = accumulator.getSummary();
    expect(summaryAfterReset?.count).toBe(3);
    expect(summaryAfterReset?.minFps).toBeCloseTo(22);
    expect(summaryAfterReset?.maxFps).toBeCloseTo(26);
    expect(summaryAfterReset?.averageFps).toBeCloseTo((22 + 26 + 24) / 3, 5);
    expect(summaryAfterReset?.p95Fps).toBeCloseTo(26);
    expect(summaryAfterReset?.medianFps).toBeCloseTo(24);
  });
});
