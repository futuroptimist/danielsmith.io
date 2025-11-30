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
    accumulator.getSummary();

    expect(onSort).toHaveBeenCalledTimes(1);
    expect(accumulator.getSummary()).toEqual(summary);

    accumulator.record(4);
    accumulator.getSummary();

    expect(onSort).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cache after reset', () => {
    const onSort = vi.fn();
    const accumulator = createSampleAccumulator({ onSort });

    accumulator.record(2);
    accumulator.record(8);
    accumulator.getSummary();

    expect(onSort).toHaveBeenCalledTimes(1);

    accumulator.reset();
    accumulator.record(1);
    accumulator.getSummary();

    expect(onSort).toHaveBeenCalledTimes(2);
  });
});
