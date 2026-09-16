import type { BuildInfoEnvironment } from '../systems/buildInfo/buildInfoService';
import type { FallbackReason } from '../types/failover';

export const CONTROLLED_PERFORMANCE_SCHEMA_VERSION = 1 as const;

const MAX_DURATION_MS = 300_000;
const MAX_SAMPLES = 600;
const MAX_BUILD_TAG_LENGTH = 100;

export type MeasurementSummary = {
  sampleCount: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
};

export type UnavailableMeasurement = {
  state: 'unavailable';
  reason: 'unsupported_environment' | 'insufficient_samples';
};

export type ControlledPerformanceResult = {
  schemaVersion: typeof CONTROLLED_PERFORMANCE_SCHEMA_VERSION;
  measuredAt: number;
  identity: {
    environment: BuildInfoEnvironment;
    buildTag: string;
    browser: 'chromium' | 'firefox' | 'webkit';
    browserMajorVersion: number;
    viewport: { width: number; height: number };
  };
  conditions: {
    scenario: 'visitor_journey';
    renderingMode: 'immersive' | 'text';
    rendererClass: 'hardware' | 'software' | 'unavailable';
    warmupMs: number;
    requestedSamples: number;
  };
  renderer: {
    state: 'immersive' | 'fallback';
    fallbackReason: FallbackReason | null;
  };
  measurements: {
    applicationReady: { state: 'available'; durationMs: number };
    interactionLatency: { state: 'available' } & MeasurementSummary;
    frameTime:
      | ({ state: 'available' } & MeasurementSummary)
      | UnavailableMeasurement;
  };
};

const ENVIRONMENTS = new Set(['staging', 'prod', 'dev']);
const BROWSERS = new Set(['chromium', 'firefox', 'webkit']);
const RENDERING_MODES = new Set(['immersive', 'text']);
const RENDERER_CLASSES = new Set(['hardware', 'software', 'unavailable']);
const FALLBACK_REASONS = new Set([
  'webgl-unsupported',
  'manual',
  'low-memory',
  'low-performance',
  'immersive-init-error',
  'automated-client',
  'low-end-device',
  'console-error',
  'data-saver',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isBoundedNumber = (value: unknown, maximum: number): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= maximum;

const isBoundedInteger = (value: unknown, maximum: number): value is number =>
  Number.isInteger(value) && isBoundedNumber(value, maximum);

function parseSummary(value: unknown): MeasurementSummary | null {
  if (!isRecord(value)) return null;
  const { sampleCount, medianMs, p95Ms, maxMs } = value;
  if (
    !isBoundedInteger(sampleCount, MAX_SAMPLES) ||
    sampleCount < 1 ||
    !isBoundedNumber(medianMs, MAX_DURATION_MS) ||
    !isBoundedNumber(p95Ms, MAX_DURATION_MS) ||
    !isBoundedNumber(maxMs, MAX_DURATION_MS) ||
    medianMs > p95Ms ||
    p95Ms > maxMs
  ) {
    return null;
  }
  return { sampleCount, medianMs, p95Ms, maxMs };
}

/**
 * Validates and projects a browser-run payload onto the bounded export contract.
 * Unknown fields are intentionally discarded so caller context cannot leak.
 */
export function createControlledPerformanceResult(
  value: unknown
): ControlledPerformanceResult | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  const { identity, conditions, renderer, measurements } = value;
  if (
    !isBoundedInteger(value.measuredAt, 4_102_444_800) ||
    !isRecord(identity) ||
    !ENVIRONMENTS.has(identity.environment as string) ||
    typeof identity.buildTag !== 'string' ||
    !/^[A-Za-z0-9._-]+$/.test(identity.buildTag) ||
    identity.buildTag.length > MAX_BUILD_TAG_LENGTH ||
    !BROWSERS.has(identity.browser as string) ||
    !isBoundedInteger(identity.browserMajorVersion, 999) ||
    !isRecord(identity.viewport) ||
    !isBoundedInteger(identity.viewport.width, 16_384) ||
    identity.viewport.width < 1 ||
    !isBoundedInteger(identity.viewport.height, 16_384) ||
    identity.viewport.height < 1 ||
    !isRecord(conditions) ||
    conditions.scenario !== 'visitor_journey' ||
    !RENDERING_MODES.has(conditions.renderingMode as string) ||
    !RENDERER_CLASSES.has(conditions.rendererClass as string) ||
    !isBoundedInteger(conditions.warmupMs, 60_000) ||
    !isBoundedInteger(conditions.requestedSamples, MAX_SAMPLES) ||
    conditions.requestedSamples < 1 ||
    !isRecord(renderer) ||
    !isRecord(measurements) ||
    !isRecord(measurements.applicationReady) ||
    measurements.applicationReady.state !== 'available' ||
    !isBoundedNumber(measurements.applicationReady.durationMs, MAX_DURATION_MS)
  ) {
    return null;
  }

  const isFallback = renderer.state === 'fallback';
  const fallbackReason = renderer.fallbackReason;
  if (
    (renderer.state !== 'immersive' && !isFallback) ||
    (isFallback && !FALLBACK_REASONS.has(fallbackReason as string)) ||
    (!isFallback && fallbackReason !== null) ||
    (isFallback && conditions.renderingMode !== 'text') ||
    (isFallback && conditions.rendererClass !== 'unavailable') ||
    (!isFallback && conditions.renderingMode !== 'immersive') ||
    (!isFallback && conditions.rendererClass === 'unavailable')
  ) {
    return null;
  }

  const interactionLatency = parseSummary(measurements.interactionLatency);
  const rawFrameTime = measurements.frameTime;
  if (!interactionLatency || !isRecord(rawFrameTime)) return null;

  let frameTime: ControlledPerformanceResult['measurements']['frameTime'];
  if (rawFrameTime.state === 'available') {
    const summary = parseSummary(rawFrameTime);
    if (!summary || conditions.rendererClass !== 'hardware') return null;
    frameTime = { state: 'available', ...summary };
  } else if (
    rawFrameTime.state === 'unavailable' &&
    (rawFrameTime.reason === 'unsupported_environment' ||
      rawFrameTime.reason === 'insufficient_samples')
  ) {
    frameTime = { state: 'unavailable', reason: rawFrameTime.reason };
  } else {
    return null;
  }

  return {
    schemaVersion: CONTROLLED_PERFORMANCE_SCHEMA_VERSION,
    measuredAt: value.measuredAt,
    identity: {
      environment: identity.environment as BuildInfoEnvironment,
      buildTag: identity.buildTag,
      browser:
        identity.browser as ControlledPerformanceResult['identity']['browser'],
      browserMajorVersion: identity.browserMajorVersion,
      viewport: {
        width: identity.viewport.width,
        height: identity.viewport.height,
      },
    },
    conditions: {
      scenario: 'visitor_journey',
      renderingMode:
        conditions.renderingMode as ControlledPerformanceResult['conditions']['renderingMode'],
      rendererClass:
        conditions.rendererClass as ControlledPerformanceResult['conditions']['rendererClass'],
      warmupMs: conditions.warmupMs,
      requestedSamples: conditions.requestedSamples,
    },
    renderer: {
      state: renderer.state as ControlledPerformanceResult['renderer']['state'],
      fallbackReason: fallbackReason as FallbackReason | null,
    },
    measurements: {
      applicationReady: {
        state: 'available',
        durationMs: measurements.applicationReady.durationMs,
      },
      interactionLatency: { state: 'available', ...interactionLatency },
      frameTime,
    },
  };
}
