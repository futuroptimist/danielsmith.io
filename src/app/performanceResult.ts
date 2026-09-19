import type { BuildInfo } from '../systems/buildInfo/buildInfoService';
import type { InputLatencySummary } from '../systems/performance/inputLatencyMonitor';

export const PERFORMANCE_RESULT_SCHEMA_VERSION = 1 as const;
export const CONTROLLED_FRAME_SAMPLES = 120;

const MAX_DURATION_MS = 3_600_000;
const MAX_SAMPLES = 10_000;
const MAX_BUILD_TAG_LENGTH = 80;

export type PerformanceResultState = 'completed' | 'regression' | 'unavailable';
export type BrowserFamily = 'chromium' | 'firefox' | 'webkit';
export type RenderingMode = 'immersive' | 'fallback';
export type RendererClass = 'hardware' | 'software' | 'unknown';
export type FrameMeasurementProfile = 'controlled_hardware_v1' | 'unsupported';

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
    frameMeasurementProfile: FrameMeasurementProfile;
  };
  conditions: {
    warmupMs: number;
    interactionName: 'keyboard_movement';
    requestedActions: number;
    eventsPerAction: 2;
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

const hasConsistentKeyboardCounts = (summary: InputLatencySummary) => {
  const categoryTotal = Object.values(summary.eventCategoryCounts).reduce(
    (total, count) => total + count,
    0
  );
  const eventTotal = Object.values(summary.eventTypeCounts).reduce(
    (total, count) => total + count,
    0
  );
  return (
    categoryTotal === summary.count &&
    eventTotal === summary.count &&
    summary.eventCategoryCounts.keyboard === summary.count &&
    Object.entries(summary.eventCategoryCounts).every(
      ([category, count]) => category === 'keyboard' || count === 0
    ) &&
    Object.keys(summary.eventTypeCounts).every((type) =>
      ['keydown', 'keyup'].includes(type)
    )
  );
};

const fromInteraction = (
  summary: InputLatencySummary | null | undefined,
  conditions: PerformanceResultV1['conditions']
): DurationSummary => {
  if (!summary || summary.count !== conditions.requestedSamples) {
    return unavailable('not_collected');
  }
  if (
    !hasConsistentKeyboardCounts(summary) ||
    summary.eventTypeCounts.keydown !== conditions.requestedActions ||
    summary.eventTypeCounts.keyup !== conditions.requestedActions
  ) {
    throw new TypeError('Contradictory controlled interaction counts.');
  }
  if (
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

const hasActiveSupportedHardwareRenderer = (
  environment: PerformanceResultV1['environment'],
  renderer: PerformanceResultV1['renderer']
) =>
  environment.renderingMode === 'immersive' &&
  environment.rendererClass === 'hardware' &&
  environment.frameMeasurementProfile === 'controlled_hardware_v1' &&
  renderer.state === 'immersive' &&
  renderer.fallbackReason === 'none';

const normalizeFrameTime = (
  input: CreatePerformanceResultInput
): DurationSummary => {
  if (
    input.environment.renderingMode === 'fallback' ||
    input.renderer.state === 'fallback'
  ) {
    return unavailable('renderer_fallback');
  }
  if (!hasActiveSupportedHardwareRenderer(input.environment, input.renderer)) {
    return unavailable('unsupported_environment');
  }
  const summary = input.frameTimeSummary;
  const candidate = summary ? { state: 'available', ...summary } : null;
  return validSummary(candidate) &&
    candidate.sampleCount === CONTROLLED_FRAME_SAMPLES
    ? candidate
    : unavailable('not_collected');
};

const assertValidLimits = (
  limits: CreatePerformanceResultInput['regressionLimitsMs']
) => {
  if (!limits) return;
  if (
    !isRecord(limits) ||
    !Object.keys(limits).every((key) =>
      ['applicationReady', 'interactionP95'].includes(key)
    ) ||
    Object.values(limits).some((limit) => !isDuration(limit))
  ) {
    throw new TypeError('Invalid controlled performance regression limits.');
  }
};

export function createPerformanceResult(
  input: CreatePerformanceResultInput
): PerformanceResultV1 {
  assertValidLimits(input.regressionLimitsMs);
  const applicationReady = oneSample(input.applicationReadyMs);
  const interactionLatency = fromInteraction(
    input.interactionSummary,
    input.conditions
  );
  const frameTime = normalizeFrameTime(input);
  const hasRegression =
    (applicationReady.state === 'available' &&
      input.regressionLimitsMs?.applicationReady !== undefined &&
      applicationReady.p95Ms > input.regressionLimitsMs.applicationReady) ||
    (interactionLatency.state === 'available' &&
      input.regressionLimitsMs?.interactionP95 !== undefined &&
      interactionLatency.p95Ms > input.regressionLimitsMs.interactionP95);
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
    !/^[A-Za-z0-9._:-]+$/.test(build.tag) ||
    build.tag.length > MAX_BUILD_TAG_LENGTH ||
    !isRecord(environment) ||
    !hasExactKeys(environment, [
      'browser',
      'browserMajorVersion',
      'viewportWidth',
      'viewportHeight',
      'renderingMode',
      'rendererClass',
      'frameMeasurementProfile',
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
    !['controlled_hardware_v1', 'unsupported'].includes(
      environment.frameMeasurementProfile as string
    ) ||
    !isRecord(conditions) ||
    !hasExactKeys(conditions, [
      'warmupMs',
      'interactionName',
      'requestedActions',
      'eventsPerAction',
      'requestedSamples',
    ]) ||
    !isDuration(conditions.warmupMs) ||
    conditions.interactionName !== 'keyboard_movement' ||
    !isBoundedInteger(conditions.requestedActions, 1, MAX_SAMPLES) ||
    conditions.eventsPerAction !== 2 ||
    !isBoundedInteger(conditions.requestedSamples, 1, MAX_SAMPLES) ||
    conditions.requestedSamples !==
      (conditions.requestedActions as number) * conditions.eventsPerAction ||
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
    (renderer.state === 'immersive' &&
      (environment.renderingMode !== 'immersive' ||
        renderer.fallbackReason !== 'none')) ||
    (renderer.state === 'fallback' &&
      (environment.renderingMode !== 'fallback' ||
        renderer.fallbackReason === 'none')) ||
    (renderer.state === 'unavailable' && renderer.fallbackReason === 'none');
  const frameSupported = hasActiveSupportedHardwareRenderer(
    environment as unknown as PerformanceResultV1['environment'],
    renderer as unknown as PerformanceResultV1['renderer']
  );
  const invalidFrameSupport =
    (value.frameTime.state === 'available' && !frameSupported) ||
    (environment.frameMeasurementProfile === 'controlled_hardware_v1' &&
      (environment.browser !== 'chromium' || !frameSupported));
  const invalidSampleSet =
    (value.interactionLatency.state === 'available' &&
      value.interactionLatency.sampleCount !== conditions.requestedSamples) ||
    (value.frameTime.state === 'available' &&
      value.frameTime.sampleCount !== CONTROLLED_FRAME_SAMPLES);
  if (
    invalidState ||
    invalidRenderer ||
    invalidFrameSupport ||
    invalidSampleSet
  ) {
    return null;
  }
  return value as unknown as PerformanceResultV1;
}

/** Serializes only a validated result so browser artifacts cannot gain diagnostic fields. */
export function serializePerformanceResult(value: unknown): string {
  const result = parsePerformanceResult(value);
  if (!result) {
    throw new TypeError('Invalid controlled performance result export.');
  }

  const copySummary = (summary: DurationSummary): DurationSummary =>
    summary.state === 'available'
      ? {
          state: summary.state,
          sampleCount: summary.sampleCount,
          medianMs: summary.medianMs,
          p95Ms: summary.p95Ms,
          maxMs: summary.maxMs,
        }
      : { state: summary.state, reason: summary.reason };
  const normalized: PerformanceResultV1 = {
    schemaVersion: result.schemaVersion,
    state: result.state,
    measuredAt: result.measuredAt,
    build: {
      environment: result.build.environment,
      tag: result.build.tag,
    },
    environment: {
      browser: result.environment.browser,
      browserMajorVersion: result.environment.browserMajorVersion,
      viewportWidth: result.environment.viewportWidth,
      viewportHeight: result.environment.viewportHeight,
      renderingMode: result.environment.renderingMode,
      rendererClass: result.environment.rendererClass,
      frameMeasurementProfile: result.environment.frameMeasurementProfile,
    },
    conditions: {
      warmupMs: result.conditions.warmupMs,
      interactionName: result.conditions.interactionName,
      requestedActions: result.conditions.requestedActions,
      eventsPerAction: result.conditions.eventsPerAction,
      requestedSamples: result.conditions.requestedSamples,
    },
    renderer: {
      state: result.renderer.state,
      fallbackReason: result.renderer.fallbackReason,
    },
    applicationReady: copySummary(result.applicationReady),
    interactionLatency: copySummary(result.interactionLatency),
    frameTime: copySummary(result.frameTime),
  };
  return JSON.stringify(normalized);
}
