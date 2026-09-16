import { describe, expect, it } from 'vitest';

import {
  createPerformanceResult,
  parsePerformanceResult,
  type CreatePerformanceResultInput,
} from '../performanceResult';

const baseInput = (): CreatePerformanceResultInput => ({
  measuredAt: 1_800_000_000,
  build: { environment: 'staging', tag: 'main-abc1234' },
  environment: {
    browser: 'chromium',
    browserMajorVersion: 128,
    viewportWidth: 1280,
    viewportHeight: 720,
    renderingMode: 'immersive',
    rendererClass: 'hardware',
  },
  conditions: {
    warmupMs: 5_000,
    interactionName: 'keyboard_movement',
    requestedSamples: 20,
  },
  renderer: { state: 'immersive', fallbackReason: 'none' },
  applicationReadyMs: 820,
  interactionSummary: {
    count: 20,
    averageLatencyMs: 18,
    minLatencyMs: 8,
    maxLatencyMs: 40,
    p95LatencyMs: 32,
    medianLatencyMs: 16,
    eventCategoryCounts: { pointer: 0, keyboard: 20, manual: 0, other: 0 },
    eventTypeCounts: { keydown: 20 },
  },
  frameTimeSummary: {
    sampleCount: 120,
    medianMs: 16,
    p95Ms: 24,
    maxMs: 35,
  },
  supportsFrameTime: true,
});

describe('controlled performance result contract', () => {
  it('creates a versioned, bounded result from existing latency summaries', () => {
    const result = createPerformanceResult(baseInput());

    expect(result.schemaVersion).toBe(1);
    expect(result.state).toBe('completed');
    expect(result.applicationReady).toEqual({
      state: 'available',
      sampleCount: 1,
      medianMs: 820,
      p95Ms: 820,
      maxMs: 820,
    });
    expect(result.interactionLatency).toMatchObject({
      state: 'available',
      sampleCount: 20,
      p95Ms: 32,
    });
    expect(parsePerformanceResult(result)).toEqual(result);
  });

  it.each([
    ['application ready', { applicationReady: 800 }],
    ['controlled interaction', { interactionP95: 30 }],
  ] as const)(
    'classifies a %s regression against caller-owned limits',
    (_, limits) => {
      const result = createPerformanceResult({
        ...baseInput(),
        regressionLimitsMs: limits,
      });

      expect(result.state).toBe('regression');
    }
  );

  it('reports fallback and frame timing unavailability without zero values', () => {
    const input = baseInput();
    input.environment.renderingMode = 'fallback';
    input.environment.rendererClass = 'software';
    input.renderer = {
      state: 'fallback',
      fallbackReason: 'software_renderer',
    };

    const result = createPerformanceResult(input);

    expect(result.renderer).toEqual(input.renderer);
    expect(result.frameTime).toEqual({
      state: 'unavailable',
      reason: 'renderer_fallback',
    });
  });

  it('does not publish frame timing for an unidentified or software environment', () => {
    const input = baseInput();
    input.environment.rendererClass = 'unknown';

    expect(createPerformanceResult(input).frameTime).toEqual({
      state: 'unavailable',
      reason: 'unsupported_environment',
    });
  });

  it('marks missing required measurements unavailable rather than successful', () => {
    const input = baseInput();
    input.applicationReadyMs = Number.NaN;
    input.interactionSummary = null;

    const result = createPerformanceResult(input);

    expect(result.state).toBe('unavailable');
    expect(result.applicationReady).toEqual({
      state: 'unavailable',
      reason: 'not_collected',
    });
    expect(result.interactionLatency).toEqual({
      state: 'unavailable',
      reason: 'not_collected',
    });
  });

  it('marks an incomplete interaction sample set unavailable', () => {
    const input = baseInput();
    input.interactionSummary!.count = 19;

    const result = createPerformanceResult(input);

    expect(result.state).toBe('unavailable');
    expect(result.interactionLatency).toEqual({
      state: 'unavailable',
      reason: 'not_collected',
    });
  });

  it('accepts digest build tags emitted by the build-info contract', () => {
    const input = baseInput();
    input.build.tag = `sha256:${'a'.repeat(64)}`;

    expect(createPerformanceResult(input).build.tag).toBe(input.build.tag);
  });

  it('rejects malformed, over-limit, and internally inconsistent results', () => {
    const result = createPerformanceResult(baseInput());

    expect(parsePerformanceResult({ ...result, schemaVersion: 2 })).toBeNull();
    expect(
      parsePerformanceResult({
        ...result,
        applicationReady: { ...result.applicationReady, p95Ms: 3_600_001 },
      })
    ).toBeNull();
    expect(
      parsePerformanceResult({
        ...result,
        frameTime: {
          state: 'available',
          sampleCount: 2,
          medianMs: 20,
          p95Ms: 10,
          maxMs: 30,
        },
      })
    ).toBeNull();
    expect(
      parsePerformanceResult({
        ...result,
        interactionLatency: {
          ...result.interactionLatency,
          sampleCount: 19,
        },
      })
    ).toBeNull();
    expect(
      parsePerformanceResult({
        ...result,
        frameTime: { ...result.frameTime, sampleCount: 119 },
      })
    ).toBeNull();
  });

  it('rejects unbounded identity and any fields that could carry private data', () => {
    const result = createPerformanceResult(baseInput());

    expect(
      parsePerformanceResult({
        ...result,
        sessionId: 'visitor-123',
      })
    ).toBeNull();
    expect(
      parsePerformanceResult({
        ...result,
        environment: {
          ...result.environment,
          url: 'https://example.test/?token=secret',
        },
      })
    ).toBeNull();
    expect(() =>
      createPerformanceResult({
        ...baseInput(),
        build: { environment: 'staging', tag: 'x'.repeat(81) },
      })
    ).toThrow(TypeError);
  });
});
