import {
  createSampleAccumulator,
  type SampleAccumulator,
  type SampleSummary,
} from './sampleAccumulator';

export interface FpsSampleSummary {
  count: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  p95Fps: number;
  medianFps: number;
}

export interface FpsAccumulator {
  record(fps: number): void;
  reset(): void;
  getSummary(): FpsSampleSummary | null;
}

const MAX_SAMPLES = 600;

const clampNonNegative = (value: number): number | null => {
  if (!Number.isFinite(value)) {
    return null;
  }
  if (value < 0) {
    return 0;
  }
  return value;
};

const mapSummary = (summary: SampleSummary): FpsSampleSummary => ({
  count: summary.count,
  averageFps: summary.average,
  minFps: summary.min,
  maxFps: summary.max,
  p95Fps: summary.p95,
  medianFps: summary.median,
});

export function createFpsAccumulator(): FpsAccumulator {
  const accumulator: SampleAccumulator = createSampleAccumulator({
    maxSamples: MAX_SAMPLES,
  });

  const record = (fps: number) => {
    const normalized = clampNonNegative(fps);
    if (normalized === null) {
      return;
    }
    accumulator.record(normalized);
  };

  const reset = () => {
    accumulator.reset();
  };

  const getSummary = (): FpsSampleSummary | null => {
    const summary = accumulator.getSummary();
    if (!summary) {
      return null;
    }
    return mapSummary(summary);
  };

  return {
    record,
    reset,
    getSummary,
  };
}
