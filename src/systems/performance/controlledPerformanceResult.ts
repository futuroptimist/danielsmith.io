import { createSampleAccumulator } from './sampleAccumulator';

export const CONTROLLED_PERFORMANCE_RESULT_VERSION = 1 as const;

const MAX_SAMPLES = 50;
const MAX_DURATION_MS = 120_000;
const MAX_IDENTITY_LENGTH = 64;

export type MeasurementState = 'available' | 'regression' | 'unavailable';
export type RenderingMode = 'hardware' | 'software' | 'text' | 'unsupported';

export interface BoundedMeasurementSummary {
  state: MeasurementState;
  sampleCount: number;
  medianMs: number | null;
  p95Ms: number | null;
}

export interface ControlledPerformanceResult {
  schemaVersion: typeof CONTROLLED_PERFORMANCE_RESULT_VERSION;
  applicationReady: BoundedMeasurementSummary;
  controlledInteraction: BoundedMeasurementSummary;
  frameTime: BoundedMeasurementSummary;
  rendering: {
    mode: RenderingMode;
    fallbackActive: boolean;
  };
  build: {
    environment: 'dev' | 'staging' | 'prod';
    tag: string;
  };
  environment: {
    browser: string;
    browserVersion: string;
    viewportWidth: number;
    viewportHeight: number;
  };
}

export interface ControlledPerformanceInput {
  applicationReadyMs: readonly number[];
  controlledInteractionMs: readonly number[];
  frameTimeMs?: readonly number[];
  baselinesMs?: {
    applicationReadyP95?: number;
    controlledInteractionP95?: number;
  };
  rendering: ControlledPerformanceResult['rendering'];
  build: ControlledPerformanceResult['build'];
  environment: ControlledPerformanceResult['environment'] & {
    supportsFrameTimeMeasurement: boolean;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const hasOnlyKeys = (
  value: Record<string, unknown>,
  keys: readonly string[]
): boolean => {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length && actual.every((key) => keys.includes(key))
  );
};

const boundedIdentity = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_IDENTITY_LENGTH) {
    throw new Error(
      `${label} must contain 1-${MAX_IDENTITY_LENGTH} characters`
    );
  }
  return normalized;
};

const summarize = (
  samples: readonly number[],
  baselineP95?: number
): BoundedMeasurementSummary => {
  if (samples.length === 0 || samples.length > MAX_SAMPLES) {
    throw new Error(`measurements must contain 1-${MAX_SAMPLES} samples`);
  }
  const accumulator = createSampleAccumulator({ maxSamples: MAX_SAMPLES });
  for (const sample of samples) {
    if (!Number.isFinite(sample) || sample < 0 || sample > MAX_DURATION_MS) {
      throw new Error(
        `measurement must be between 0 and ${MAX_DURATION_MS} ms`
      );
    }
    accumulator.record(sample);
  }
  if (
    baselineP95 !== undefined &&
    (!Number.isFinite(baselineP95) ||
      baselineP95 < 0 ||
      baselineP95 > MAX_DURATION_MS)
  ) {
    throw new Error('baseline must be a bounded nonnegative duration');
  }
  const summary = accumulator.getSummary();
  if (!summary) {
    throw new Error('measurement summary unavailable');
  }
  return {
    state:
      baselineP95 !== undefined && summary.p95 > baselineP95
        ? 'regression'
        : 'available',
    sampleCount: summary.count,
    medianMs: summary.median,
    p95Ms: summary.p95,
  };
};

const unavailable = (): BoundedMeasurementSummary => ({
  state: 'unavailable',
  sampleCount: 0,
  medianMs: null,
  p95Ms: null,
});

export function createControlledPerformanceResult(
  input: ControlledPerformanceInput
): ControlledPerformanceResult {
  const { rendering, environment, build } = input;
  if (rendering.fallbackActive && rendering.mode === 'hardware') {
    throw new Error('hardware rendering cannot report an active fallback');
  }
  if (
    !Number.isInteger(environment.viewportWidth) ||
    !Number.isInteger(environment.viewportHeight) ||
    environment.viewportWidth < 1 ||
    environment.viewportWidth > 16_384 ||
    environment.viewportHeight < 1 ||
    environment.viewportHeight > 16_384
  ) {
    throw new Error('viewport dimensions must be bounded positive integers');
  }
  const frameTimeSupported =
    environment.supportsFrameTimeMeasurement && rendering.mode === 'hardware';
  return {
    schemaVersion: CONTROLLED_PERFORMANCE_RESULT_VERSION,
    applicationReady: summarize(
      input.applicationReadyMs,
      input.baselinesMs?.applicationReadyP95
    ),
    controlledInteraction: summarize(
      input.controlledInteractionMs,
      input.baselinesMs?.controlledInteractionP95
    ),
    frameTime: frameTimeSupported
      ? summarize(input.frameTimeMs ?? [])
      : unavailable(),
    rendering: { ...rendering },
    build: {
      environment: build.environment,
      tag: boundedIdentity(build.tag, 'build tag'),
    },
    environment: {
      browser: boundedIdentity(environment.browser, 'browser'),
      browserVersion: boundedIdentity(
        environment.browserVersion,
        'browser version'
      ),
      viewportWidth: environment.viewportWidth,
      viewportHeight: environment.viewportHeight,
    },
  };
}

export function parseControlledPerformanceResult(
  value: unknown
): ControlledPerformanceResult | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !hasOnlyKeys(value, [
      'schemaVersion',
      'applicationReady',
      'controlledInteraction',
      'frameTime',
      'rendering',
      'build',
      'environment',
    ])
  )
    return null;
  try {
    const candidate = value as unknown as ControlledPerformanceResult;
    const summaries = [
      candidate.applicationReady,
      candidate.controlledInteraction,
      candidate.frameTime,
    ];
    if (
      !summaries.every(
        (summary) =>
          isRecord(summary) &&
          hasOnlyKeys(summary, ['state', 'sampleCount', 'medianMs', 'p95Ms']) &&
          (summary.state === 'available' ||
            summary.state === 'regression' ||
            summary.state === 'unavailable') &&
          Number.isInteger(summary.sampleCount) &&
          summary.sampleCount >= 0 &&
          summary.sampleCount <= MAX_SAMPLES &&
          (summary.state === 'unavailable'
            ? summary.sampleCount === 0 &&
              summary.medianMs === null &&
              summary.p95Ms === null
            : summary.sampleCount > 0 &&
              typeof summary.medianMs === 'number' &&
              Number.isFinite(summary.medianMs) &&
              summary.medianMs >= 0 &&
              summary.medianMs <= MAX_DURATION_MS &&
              typeof summary.p95Ms === 'number' &&
              Number.isFinite(summary.p95Ms) &&
              summary.p95Ms >= summary.medianMs &&
              summary.p95Ms <= MAX_DURATION_MS)
      )
    ) {
      return null;
    }
    if (
      !isRecord(candidate.rendering) ||
      !hasOnlyKeys(candidate.rendering, ['mode', 'fallbackActive']) ||
      !['hardware', 'software', 'text', 'unsupported'].includes(
        candidate.rendering.mode
      ) ||
      typeof candidate.rendering.fallbackActive !== 'boolean' ||
      (candidate.rendering.mode === 'hardware' &&
        candidate.rendering.fallbackActive) ||
      !isRecord(candidate.build) ||
      !hasOnlyKeys(candidate.build, ['environment', 'tag']) ||
      !['dev', 'staging', 'prod'].includes(candidate.build.environment) ||
      !isRecord(candidate.environment)
    ) {
      return null;
    }
    boundedIdentity(candidate.build.tag, 'build tag');
    if (
      !hasOnlyKeys(candidate.environment, [
        'browser',
        'browserVersion',
        'viewportWidth',
        'viewportHeight',
      ])
    ) {
      return null;
    }
    boundedIdentity(candidate.environment.browser, 'browser');
    boundedIdentity(candidate.environment.browserVersion, 'browser version');
    if (
      !Number.isInteger(candidate.environment.viewportWidth) ||
      !Number.isInteger(candidate.environment.viewportHeight) ||
      candidate.environment.viewportWidth < 1 ||
      candidate.environment.viewportWidth > 16_384 ||
      candidate.environment.viewportHeight < 1 ||
      candidate.environment.viewportHeight > 16_384 ||
      (candidate.rendering.mode !== 'hardware' &&
        candidate.frameTime.state !== 'unavailable')
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}
