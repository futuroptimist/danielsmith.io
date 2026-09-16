import type { BuildInfoEnvironment } from '../systems/buildInfo/buildInfoService';
import type { FallbackReason } from '../types/failover';

export const PERFORMANCE_RESULT_SCHEMA_VERSION = 1 as const;
export const MAX_PERFORMANCE_DURATION_MS = 3_600_000;
export const MAX_PERFORMANCE_SAMPLES = 600;

export type MeasurementUnavailableReason =
  | 'not_collected'
  | 'unsupported_renderer'
  | 'unsupported_environment';

export type DurationMeasurement =
  | { state: 'available'; durationMs: number }
  | { state: 'unavailable'; reason: MeasurementUnavailableReason };

export type DurationSummary =
  | {
      state: 'available';
      sampleCount: number;
      medianMs: number;
      p95Ms: number;
    }
  | { state: 'unavailable'; reason: MeasurementUnavailableReason };

export type PerformanceResult = {
  schemaVersion: typeof PERFORMANCE_RESULT_SCHEMA_VERSION;
  measuredAt: number;
  build: { environment: BuildInfoEnvironment; tag: string };
  conditions: {
    browser: 'chromium';
    browserMajorVersion: number;
    viewport: { width: number; height: number };
    renderingMode: 'immersive' | 'text';
    warmupMs: number;
  };
  renderer: {
    class: 'hardware' | 'software' | 'unavailable';
    status: 'immersive' | 'fallback';
    fallbackReason: FallbackReason | null;
  };
  measurements: {
    applicationReady: DurationMeasurement;
    interactionLatency: DurationSummary;
    frameTime: DurationSummary & { supportedEnvironment: string | null };
  };
};

export type PerformanceResultInput = Omit<PerformanceResult, 'schemaVersion'>;

const SAFE_TOKEN = /^[a-zA-Z0-9._-]+$/;
const MAX_TOKEN_LENGTH = 64;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));

const isBoundedInteger = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;

const isSafeToken = (value: unknown) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= MAX_TOKEN_LENGTH &&
  SAFE_TOKEN.test(value);

const unavailableReasons: readonly MeasurementUnavailableReason[] = [
  'not_collected',
  'unsupported_renderer',
  'unsupported_environment',
];
const fallbackReasons: readonly FallbackReason[] = [
  'webgl-unsupported',
  'manual',
  'low-memory',
  'low-performance',
  'immersive-init-error',
  'automated-client',
  'low-end-device',
  'console-error',
  'data-saver',
];

function isDuration(value: unknown): value is DurationMeasurement {
  if (!isRecord(value)) return false;
  if (value.state === 'available') {
    return (
      hasExactKeys(value, ['state', 'durationMs']) &&
      isBoundedInteger(value.durationMs, 1, MAX_PERFORMANCE_DURATION_MS)
    );
  }
  return (
    value.state === 'unavailable' &&
    hasExactKeys(value, ['state', 'reason']) &&
    unavailableReasons.includes(value.reason as MeasurementUnavailableReason)
  );
}

function isSummary(
  value: unknown,
  frameTime = false
): value is DurationSummary {
  if (!isRecord(value)) return false;
  const extra = frameTime ? ['supportedEnvironment'] : [];
  if (value.state === 'available') {
    return (
      hasExactKeys(value, [
        'state',
        'sampleCount',
        'medianMs',
        'p95Ms',
        ...extra,
      ]) &&
      isBoundedInteger(value.sampleCount, 1, MAX_PERFORMANCE_SAMPLES) &&
      isBoundedInteger(value.medianMs, 1, MAX_PERFORMANCE_DURATION_MS) &&
      isBoundedInteger(value.p95Ms, 1, MAX_PERFORMANCE_DURATION_MS) &&
      Number(value.medianMs) <= Number(value.p95Ms) &&
      (!frameTime || isSafeToken(value.supportedEnvironment))
    );
  }
  return (
    value.state === 'unavailable' &&
    hasExactKeys(value, ['state', 'reason', ...extra]) &&
    unavailableReasons.includes(value.reason as MeasurementUnavailableReason) &&
    (!frameTime || value.supportedEnvironment === null)
  );
}

/**
 * Accepts only the finite, allow-listed collector handoff shape. Unknown fields
 * are rejected so browser identifiers, URLs, errors, and input cannot leak.
 */
export function parsePerformanceResult(
  value: unknown
): PerformanceResult | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'measuredAt',
      'build',
      'conditions',
      'renderer',
      'measurements',
    ])
  )
    return null;
  const { build, conditions, renderer, measurements } = value;
  if (!isRecord(build) || !hasExactKeys(build, ['environment', 'tag']))
    return null;
  if (
    !['dev', 'staging', 'prod'].includes(String(build.environment)) ||
    !isSafeToken(build.tag)
  )
    return null;
  if (
    !isRecord(conditions) ||
    !hasExactKeys(conditions, [
      'browser',
      'browserMajorVersion',
      'viewport',
      'renderingMode',
      'warmupMs',
    ])
  )
    return null;
  if (
    !isRecord(conditions.viewport) ||
    !hasExactKeys(conditions.viewport, ['width', 'height'])
  )
    return null;
  if (
    conditions.browser !== 'chromium' ||
    !isBoundedInteger(conditions.browserMajorVersion, 1, 999) ||
    !isBoundedInteger(conditions.viewport.width, 320, 7680) ||
    !isBoundedInteger(conditions.viewport.height, 320, 4320) ||
    !['immersive', 'text'].includes(String(conditions.renderingMode)) ||
    !isBoundedInteger(conditions.warmupMs, 0, 60_000)
  )
    return null;
  if (
    !isRecord(renderer) ||
    !hasExactKeys(renderer, ['class', 'status', 'fallbackReason'])
  )
    return null;
  if (
    !['hardware', 'software', 'unavailable'].includes(String(renderer.class)) ||
    !['immersive', 'fallback'].includes(String(renderer.status)) ||
    !(
      renderer.fallbackReason === null ||
      fallbackReasons.includes(renderer.fallbackReason as FallbackReason)
    ) ||
    (renderer.status === 'immersive' && renderer.fallbackReason !== null) ||
    (renderer.status === 'fallback' && renderer.fallbackReason === null)
  )
    return null;
  if (
    !isRecord(measurements) ||
    !hasExactKeys(measurements, [
      'applicationReady',
      'interactionLatency',
      'frameTime',
    ])
  )
    return null;
  if (
    !isDuration(measurements.applicationReady) ||
    !isSummary(measurements.interactionLatency) ||
    !isSummary(measurements.frameTime, true)
  )
    return null;
  if (
    renderer.class !== 'hardware' &&
    isRecord(measurements.frameTime) &&
    measurements.frameTime.state === 'available'
  )
    return null;
  if (
    value.schemaVersion !== PERFORMANCE_RESULT_SCHEMA_VERSION ||
    !isBoundedInteger(value.measuredAt, 0, 4_102_444_800)
  )
    return null;
  return value as PerformanceResult;
}

export function createPerformanceResult(
  input: PerformanceResultInput
): PerformanceResult {
  const result = { schemaVersion: PERFORMANCE_RESULT_SCHEMA_VERSION, ...input };
  if (!parsePerformanceResult(result))
    throw new TypeError('Invalid bounded performance result');
  return result;
}

export function summarizeDurations(
  samples: readonly number[]
): DurationSummary {
  if (samples.length === 0)
    return { state: 'unavailable', reason: 'not_collected' };
  if (
    samples.length > MAX_PERFORMANCE_SAMPLES ||
    samples.some(
      (sample) => !isBoundedInteger(sample, 1, MAX_PERFORMANCE_DURATION_MS)
    )
  )
    throw new RangeError(
      'Performance samples must be finite, positive, and bounded'
    );
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (percent: number) =>
    sorted[Math.ceil(sorted.length * percent) - 1];
  return {
    state: 'available',
    sampleCount: sorted.length,
    medianMs: percentile(0.5),
    p95Ms: percentile(0.95),
  };
}
