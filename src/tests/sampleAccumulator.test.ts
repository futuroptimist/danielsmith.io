import { describe, expect, it, vi } from 'vitest';

import { createSampleAccumulator } from '../systems/performance/sampleAccumulator';

describe('createSampleAccumulator', () => {
  it('reuses cached sorting when no new samples arrive', () => {
    const onSort = vi.fn();
    const accumulator = createSampleAccumulator({ onSort });

    accumulator.record(5);
    accumulator.record(1);
    accumulator.record(3);

    const summary = accumulator.getSummary();
    expect(summary).not.toBeNull();
    expect(summary?.count).toBe(3);
    expect(summary?.average).toBe(3);
    expect(summary?.median).toBe(3);
    expect(summary?.p95).toBe(5);
    expect(summary?.min).toBe(1);
    expect(summary?.max).toBe(5);
    accumulator.getSummary();

    expect(onSort).toHaveBeenCalledTimes(1);
    expect(accumulator.getSummary()).toEqual(summary);

    accumulator.record(4);
    accumulator.getSummary();

    expect(onSort).toHaveBeenCalledTimes(2);
  });

  it('reuses the sorted cache array between recomputations', () => {
    const onSort = vi.fn();
    const accumulator = createSampleAccumulator({ onSort });

    accumulator.record(4);
    accumulator.record(2);

    accumulator.getSummary();
    const firstSorted = onSort.mock.calls[0][0] as ReadonlyArray<number>;

    accumulator.record(8);
    accumulator.getSummary();
    const secondSorted = onSort.mock.calls[1][0] as ReadonlyArray<number>;

    expect(secondSorted).toBe(firstSorted);
    expect([...secondSorted]).toEqual([2, 4, 8]);

    accumulator.reset();
    accumulator.record(1);
    accumulator.getSummary();
    const thirdSorted = onSort.mock.calls[2][0] as ReadonlyArray<number>;

    expect(thirdSorted).toBe(secondSorted);
    expect([...thirdSorted]).toEqual([1]);
  });

  it('invalidates the cache after reset', () => {
    const onSort = vi.fn();
    const accumulator = createSampleAccumulator({ onSort });

    accumulator.record(2);
    accumulator.record(8);
    accumulator.getSummary();

    expect(onSort).toHaveBeenCalledTimes(1);

    accumulator.reset();
    expect(accumulator.getSummary()).toBeNull();
    accumulator.record(1);
    accumulator.getSummary();

    expect(onSort).toHaveBeenCalledTimes(2);
  });

  it('evicts the oldest samples when a maxSamples cap is provided', () => {
    const accumulator = createSampleAccumulator({ maxSamples: 3 });

    accumulator.record(4);
    accumulator.record(8);
    accumulator.record(12);
    accumulator.record(20);

    const summary = accumulator.getSummary();

    expect(summary).not.toBeNull();
    expect(summary?.count).toBe(3);
    expect(summary?.min).toBe(8);
    expect(summary?.max).toBe(20);
    expect(summary?.median).toBe(12);
    expect(summary?.average).toBeCloseTo((8 + 12 + 20) / 3, 6);
  });

  it('ignores invalid maxSamples values and keeps accumulating', () => {
    const accumulator = createSampleAccumulator({ maxSamples: 0 });

    accumulator.record(1);
    accumulator.record(2);
    accumulator.record(3);
    accumulator.record(4);

    const summary = accumulator.getSummary();

    expect(summary?.count).toBe(4);
    expect(summary?.min).toBe(1);
  });

  it('returns null for an empty accumulator', () => {
    const accumulator = createSampleAccumulator();

    expect(accumulator.getSummary()).toBeNull();
  });
});
