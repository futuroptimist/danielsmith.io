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
    frameMeasurementProfile: 'controlled_hardware_v1',
  },
  conditions: {
    warmupMs: 5_000,
    interactionName: 'keyboard_movement',
    requestedActions: 20,
    eventsPerAction: 2,
    requestedSamples: 40,
  },
  renderer: { state: 'immersive', fallbackReason: 'none' },
  applicationReadyMs: 820,
  interactionSummary: {
    count: 40,
    averageLatencyMs: 18,
    minLatencyMs: 8,
    maxLatencyMs: 40,
    p95LatencyMs: 32,
    medianLatencyMs: 16,
    eventCategoryCounts: { pointer: 0, keyboard: 40, manual: 0, other: 0 },
    eventTypeCounts: { keydown: 20, keyup: 20 },
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
      sampleCount: 40,
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
    input.environment.frameMeasurementProfile = 'unsupported';
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
    input.environment.frameMeasurementProfile = 'unsupported';

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
    input.interactionSummary!.count = 39;

    const result = createPerformanceResult(input);

    expect(result.state).toBe('unavailable');
    expect(result.interactionLatency).toEqual({
      state: 'unavailable',
      reason: 'not_collected',
    });
  });

  it.each([
    [
      'unavailable renderer',
      { state: 'unavailable', fallbackReason: 'unknown' },
    ],
    ['software renderer', { state: 'immersive', fallbackReason: 'none' }],
  ] as const)('keeps frame timing unavailable for an %s', (_, renderer) => {
    const input = baseInput();
    input.renderer = renderer;
    if (renderer.state === 'immersive') {
      input.environment.rendererClass = 'software';
    }
    input.environment.frameMeasurementProfile = 'unsupported';

    expect(createPerformanceResult(input).frameTime.state).toBe('unavailable');
  });

  it('rejects a claimed frame profile without qualifying renderer evidence', () => {
    const result = createPerformanceResult(baseInput());

    expect(
      parsePerformanceResult({
        ...result,
        renderer: { state: 'unavailable', fallbackReason: 'unknown' },
      })
    ).toBeNull();
    expect(
      parsePerformanceResult({
        ...result,
        environment: { ...result.environment, rendererClass: 'unknown' },
      })
    ).toBeNull();
  });

  it('distinguishes complete keyboard actions from event samples', () => {
    const input = baseInput();
    input.interactionSummary!.eventTypeCounts = { keydown: 40 };

    expect(() => createPerformanceResult(input)).toThrow(
      'Contradictory controlled interaction counts'
    );
    const result = createPerformanceResult(baseInput());
    expect(
      parsePerformanceResult({
        ...result,
        conditions: { ...result.conditions, requestedActions: 19 },
      })
    ).toBeNull();
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 3_600_001])(
    'rejects a malformed supplied regression limit: %s',
    (limit) => {
      expect(() =>
        createPerformanceResult({
          ...baseInput(),
          regressionLimitsMs: { applicationReady: limit },
        })
      ).toThrow('Invalid controlled performance regression limits');
    }
  );

  it('accepts fractional measured durations but rejects fractional counts', () => {
    const input = baseInput();
    input.applicationReadyMs = 820.25;
    input.interactionSummary!.medianLatencyMs = 16.5;

    expect(createPerformanceResult(input).applicationReady).toMatchObject({
      medianMs: 820.25,
    });
    const result = createPerformanceResult(input);
    expect(
      parsePerformanceResult({
        ...result,
        interactionLatency: { ...result.interactionLatency, sampleCount: 39.5 },
      })
    ).toBeNull();
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
          sampleCount: 39,
        },
      })
    ).toBeNull();
    expect(
      parsePerformanceResult({
        ...result,
        frameTime: { ...result.frameTime, sampleCount: 119 },
      })
    ).toBeNull();
    expect(
      parsePerformanceResult({
        ...result,
        renderer: { ...result.renderer, debug: { rawRenderer: 'private' } },
      })
    ).toBeNull();
    expect(
      parsePerformanceResult({
        ...result,
        applicationReady: {
          ...result.applicationReady,
          context: { url: 'https://example.test/private' },
        },
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
