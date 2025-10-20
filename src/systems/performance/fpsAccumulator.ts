export interface FpsSampleSummary {
  count: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  p95Fps: number;
}

export interface FpsAccumulator {
  record(fps: number): void;
  reset(): void;
  getSummary(): FpsSampleSummary | null;
}

const clampNonNegative = (value: number): number | null => {
  if (!Number.isFinite(value)) {
    return null;
  }
  if (value < 0) {
    return 0;
  }
  return value;
};

export function createFpsAccumulator(): FpsAccumulator {
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const samples: number[] = [];

  const record = (fps: number) => {
    const normalized = clampNonNegative(fps);
    if (normalized === null) {
      return;
    }
    samples.push(normalized);
    sum += normalized;
    if (normalized < min) {
      min = normalized;
    }
    if (normalized > max) {
      max = normalized;
    }
  };

  const reset = () => {
    sum = 0;
    min = Number.POSITIVE_INFINITY;
    max = Number.NEGATIVE_INFINITY;
    samples.length = 0;
  };

  const getSummary = (): FpsSampleSummary | null => {
    if (samples.length === 0) {
      return null;
    }
    const averageFps = sum / samples.length;
    const sorted = [...samples].sort((a, b) => a - b);
    const percentileIndex = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil(sorted.length * 0.95) - 1)
    );
    const p95Fps = sorted[percentileIndex];
    return {
      count: samples.length,
      averageFps,
      minFps: min === Number.POSITIVE_INFINITY ? sorted[0] : min,
      maxFps:
        max === Number.NEGATIVE_INFINITY ? sorted[sorted.length - 1] : max,
      p95Fps,
    } satisfies FpsSampleSummary;
  };

  return {
    record,
    reset,
    getSummary,
  };
}
