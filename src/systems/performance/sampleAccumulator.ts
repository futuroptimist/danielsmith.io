export interface SampleSummary {
  count: number;
  average: number;
  min: number;
  max: number;
  p95: number;
  median: number;
}

export interface SampleAccumulator {
  record(value: number): void;
  reset(): void;
  getSummary(): SampleSummary | null;
}

export interface SampleAccumulatorOptions {
  onSort?: (values: ReadonlyArray<number>) => void;
  onCompact?: (values: ReadonlyArray<number>) => void;
  /** Maximum number of samples to retain; older entries are evicted first. */
  maxSamples?: number;
}

export function createSampleAccumulator(
  options: SampleAccumulatorOptions = {}
): SampleAccumulator {
  let sum = 0;
  let samples: number[] = [];
  let startIndex = 0;
  let sortedCache: number[] | null = null;
  let isDirty = true;

  const normalizedMaxSamples = Number.isFinite(options.maxSamples)
    ? Math.max(0, Math.floor(options.maxSamples as number))
    : 0;

  const getActiveCount = () => samples.length - startIndex;

  const compactSamples = () => {
    if (startIndex === 0) {
      return;
    }
    const activeCount = getActiveCount();
    if (activeCount === 0) {
      samples.length = 0;
      startIndex = 0;
      return;
    }
    if (startIndex < 1024 && startIndex < samples.length / 2) {
      return;
    }
    samples = samples.slice(startIndex);
    startIndex = 0;
    if (options.onCompact) {
      options.onCompact(samples);
    }
  };

  const trimOldestSamples = () => {
    if (normalizedMaxSamples <= 0) {
      return;
    }
    while (getActiveCount() >= normalizedMaxSamples) {
      const removed = samples[startIndex];
      if (typeof removed === 'number') {
        sum -= removed;
      }
      startIndex += 1;
      isDirty = true;
    }
    compactSamples();
  };

  const computeSorted = (): number[] => {
    if (!isDirty && sortedCache) {
      return sortedCache;
    }
    const target = sortedCache ?? [];
    target.length = 0;
    const activeCount = getActiveCount();
    for (let index = 0; index < activeCount; index += 1) {
      target[index] = samples[startIndex + index];
    }
    target.sort((a, b) => a - b);
    sortedCache = target;
    options.onSort?.(target);
    isDirty = false;
    return sortedCache;
  };

  const record = (value: number) => {
    trimOldestSamples();
    samples.push(value);
    sum += value;
    isDirty = true;
  };

  const reset = () => {
    sum = 0;
    samples.length = 0;
    startIndex = 0;
    if (sortedCache) {
      sortedCache.length = 0;
    }
    isDirty = true;
  };

  const getSummary = (): SampleSummary | null => {
    const activeCount = getActiveCount();
    if (activeCount === 0) {
      return null;
    }
    const average = sum / activeCount;
    const sorted = computeSorted();
    const percentileIndex = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil(sorted.length * 0.95) - 1)
    );
    const p95 = sorted[percentileIndex];
    const midIndex = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[midIndex - 1] + sorted[midIndex]) / 2
        : sorted[midIndex];
    return {
      count: activeCount,
      average,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95,
      median,
    } satisfies SampleSummary;
  };

  return {
    record,
    reset,
    getSummary,
  };
}
