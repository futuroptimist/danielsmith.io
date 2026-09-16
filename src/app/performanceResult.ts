import type { BuildInfo } from '../systems/buildInfo/buildInfoService';
import type { InputLatencySummary } from '../systems/performance/inputLatencyMonitor';

export const PERFORMANCE_RESULT_SCHEMA_VERSION = 1 as const;

const MAX_DURATION_MS = 3_600_000;
const MAX_SAMPLES = 10_000;
const MAX_BUILD_TAG_LENGTH = 80;

export type MeasurementState = 'available' | 'unavailable';
export type PerformanceResultState = 'completed' | 'regression' | 'unavailable';
export type BrowserFamily = 'chromium' | 'firefox' | 'webkit';
export type RenderingMode = 'immersive' | 'fallback';
export type RendererClass = 'hardware' | 'software' | 'unknown';

export interface AvailableDurationSummary {
  state: 'available';
  sampleCount: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}

export interface UnavailableMeasurement {
  state: 'unavailable';
  reason: 'not_collected' | 'unsupported_environment' | 'renderer_fallback';
}

export type DurationSummary = AvailableDurationSummary | UnavailableMeasurement;

export interface PerformanceResultV1 {
  schemaVersion: typeof PERFORMANCE_RESULT_SCHEMA_VERSION;
  state: PerformanceResultState;
  measuredAt: number;
  build: BuildInfo;
  environment: {
    browser: BrowserFamily;
    browserMajorVersion: number;
    viewportWidth: number;
    viewportHeight: number;
    renderingMode: RenderingMode;
    rendererClass: RendererClass;
  };
  conditions: {
    warmupMs: number;
    interactionName: 'keyboard_movement';
    requestedSamples: number;
  };
  renderer: {
    state: 'immersive' | 'fallback' | 'unavailable';
    fallbackReason:
      | 'none'
      | 'unsupported_webgl'
      | 'software_renderer'
      | 'performance'
      | 'unknown';
  };
  applicationReady: DurationSummary;
  interactionLatency: DurationSummary;
  frameTime: DurationSummary;
}

export interface CreatePerformanceResultInput {
  measuredAt: number;
  build: BuildInfo;
  environment: PerformanceResultV1['environment'];
  conditions: PerformanceResultV1['conditions'];
  renderer: PerformanceResultV1['renderer'];
  applicationReadyMs?: number;
  interactionSummary?: InputLatencySummary | null;
  frameTimeSummary?: Omit<AvailableDurationSummary, 'state'> | null;
  supportsFrameTime: boolean;
  regressionLimitsMs?: {
    applicationReady?: number;
    interactionP95?: number;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[]
) => Object.keys(value).sort().join() === [...keys].sort().join();

const isBoundedInteger = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;

const isDuration = (value: unknown) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= MAX_DURATION_MS;

const unavailable = (
  reason: UnavailableMeasurement['reason']
): UnavailableMeasurement => ({ state: 'unavailable', reason });

const oneSample = (value: unknown): DurationSummary =>
  isDuration(value)
    ? {
        state: 'available',
        sampleCount: 1,
        medianMs: value as number,
        p95Ms: value as number,
        maxMs: value as number,
      }
    : unavailable('not_collected');

const fromInteraction = (
  summary: InputLatencySummary | null | undefined
): DurationSummary => {
  if (
    !summary ||
    !isBoundedInteger(summary.count, 1, MAX_SAMPLES) ||
    !isDuration(summary.medianLatencyMs) ||
    !isDuration(summary.p95LatencyMs) ||
    !isDuration(summary.maxLatencyMs)
  ) {
    return unavailable('not_collected');
  }
  return {
    state: 'available',
    sampleCount: summary.count,
    medianMs: summary.medianLatencyMs,
    p95Ms: summary.p95LatencyMs,
    maxMs: summary.maxLatencyMs,
  };
};

const validSummary = (value: unknown): value is DurationSummary => {
  if (!isRecord(value)) return false;
  if (value.state === 'unavailable') {
    return (
      hasExactKeys(value, ['state', 'reason']) &&
      [
        'not_collected',
        'unsupported_environment',
        'renderer_fallback',
      ].includes(value.reason as string)
    );
  }
  return (
    value.state === 'available' &&
    hasExactKeys(value, [
      'state',
      'sampleCount',
      'medianMs',
      'p95Ms',
      'maxMs',
    ]) &&
    isBoundedInteger(value.sampleCount, 1, MAX_SAMPLES) &&
    isDuration(value.medianMs) &&
    isDuration(value.p95Ms) &&
    isDuration(value.maxMs) &&
    (value.medianMs as number) <= (value.p95Ms as number) &&
    (value.p95Ms as number) <= (value.maxMs as number)
  );
};

const normalizeFrameTime = (
  input: CreatePerformanceResultInput
): DurationSummary => {
  if (input.environment.renderingMode === 'fallback') {
    return unavailable('renderer_fallback');
  }
  if (
    !input.supportsFrameTime ||
    input.environment.rendererClass !== 'hardware'
  ) {
    return unavailable('unsupported_environment');
  }
  const summary = input.frameTimeSummary;
  const candidate = summary ? { state: 'available', ...summary } : null;
  return validSummary(candidate) ? candidate : unavailable('not_collected');
};

export function createPerformanceResult(
  input: CreatePerformanceResultInput
): PerformanceResultV1 {
  const applicationReady = oneSample(input.applicationReadyMs);
  const interactionLatency = fromInteraction(input.interactionSummary);
  const frameTime = normalizeFrameTime(input);
  const hasRegression =
    (applicationReady.state === 'available' &&
      isDuration(input.regressionLimitsMs?.applicationReady) &&
      applicationReady.p95Ms > input.regressionLimitsMs!.applicationReady!) ||
    (interactionLatency.state === 'available' &&
      isDuration(input.regressionLimitsMs?.interactionP95) &&
      interactionLatency.p95Ms > input.regressionLimitsMs!.interactionP95!);
  const state =
    applicationReady.state === 'unavailable' ||
    interactionLatency.state === 'unavailable'
      ? 'unavailable'
      : hasRegression
        ? 'regression'
        : 'completed';

  const result: PerformanceResultV1 = {
    schemaVersion: PERFORMANCE_RESULT_SCHEMA_VERSION,
    state,
    measuredAt: input.measuredAt,
    build: input.build,
    environment: input.environment,
    conditions: input.conditions,
    renderer: input.renderer,
    applicationReady,
    interactionLatency,
    frameTime,
  };
  if (!parsePerformanceResult(result)) {
    throw new TypeError('Invalid controlled performance result input.');
  }
  return result;
}

/** Rejects malformed or extended payloads before a collector consumes them. */
export function parsePerformanceResult(
  value: unknown
): PerformanceResultV1 | null {
  if (!isRecord(value)) return null;
  const exactKeys = [
    'schemaVersion',
    'state',
    'measuredAt',
    'build',
    'environment',
    'conditions',
    'renderer',
    'applicationReady',
    'interactionLatency',
    'frameTime',
  ];
  if (!hasExactKeys(value, exactKeys)) return null;
  const { build, environment, conditions, renderer } = value;
  if (
    value.schemaVersion !== PERFORMANCE_RESULT_SCHEMA_VERSION ||
    !['completed', 'regression', 'unavailable'].includes(
      value.state as string
    ) ||
    !isBoundedInteger(value.measuredAt, 0, Number.MAX_SAFE_INTEGER) ||
    !isRecord(build) ||
    !hasExactKeys(build, ['environment', 'tag']) ||
    !['staging', 'prod', 'dev'].includes(build.environment as string) ||
    typeof build.tag !== 'string' ||
    !/^[A-Za-z0-9._-]+$/.test(build.tag) ||
    build.tag.length > MAX_BUILD_TAG_LENGTH ||
    !isRecord(environment) ||
    !hasExactKeys(environment, [
      'browser',
      'browserMajorVersion',
      'viewportWidth',
      'viewportHeight',
      'renderingMode',
      'rendererClass',
    ]) ||
    !['chromium', 'firefox', 'webkit'].includes(
      environment.browser as string
    ) ||
    !isBoundedInteger(environment.browserMajorVersion, 1, 999) ||
    !isBoundedInteger(environment.viewportWidth, 1, 10_000) ||
    !isBoundedInteger(environment.viewportHeight, 1, 10_000) ||
    !['immersive', 'fallback'].includes(environment.renderingMode as string) ||
    !['hardware', 'software', 'unknown'].includes(
      environment.rendererClass as string
    ) ||
    !isRecord(conditions) ||
    !hasExactKeys(conditions, [
      'warmupMs',
      'interactionName',
      'requestedSamples',
    ]) ||
    !isDuration(conditions.warmupMs) ||
    conditions.interactionName !== 'keyboard_movement' ||
    !isBoundedInteger(conditions.requestedSamples, 1, MAX_SAMPLES) ||
    !isRecord(renderer) ||
    !hasExactKeys(renderer, ['state', 'fallbackReason']) ||
    !['immersive', 'fallback', 'unavailable'].includes(
      renderer.state as string
    ) ||
    ![
      'none',
      'unsupported_webgl',
      'software_renderer',
      'performance',
      'unknown',
    ].includes(renderer.fallbackReason as string) ||
    !validSummary(value.applicationReady) ||
    !validSummary(value.interactionLatency) ||
    !validSummary(value.frameTime)
  ) {
    return null;
  }
  const requiredUnavailable =
    value.applicationReady.state === 'unavailable' ||
    value.interactionLatency.state === 'unavailable';
  const invalidState =
    (value.state === 'unavailable') !== requiredUnavailable ||
    (value.state === 'regression' && requiredUnavailable);
  const invalidRenderer =
    (environment.renderingMode === 'fallback') !==
      (renderer.state === 'fallback') ||
    (renderer.state === 'immersive' && renderer.fallbackReason !== 'none') ||
    (renderer.state !== 'immersive' && renderer.fallbackReason === 'none');
  const invalidFrameSupport =
    value.frameTime.state === 'available' &&
    (environment.renderingMode !== 'immersive' ||
      environment.rendererClass !== 'hardware');
  if (invalidState || invalidRenderer || invalidFrameSupport) return null;
  return value as unknown as PerformanceResultV1;
}
