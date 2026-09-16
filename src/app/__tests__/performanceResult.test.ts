import { describe, expect, it } from 'vitest';

import { createControlledPerformanceResult } from '../performanceResult';

const validResult = () => ({
  schemaVersion: 1,
  measuredAt: 1_800_000_000,
  identity: {
    environment: 'staging',
    buildTag: 'main-af1cabad',
    browser: 'chromium',
    browserMajorVersion: 128,
    viewport: { width: 1280, height: 720 },
  },
  conditions: {
    scenario: 'visitor_journey',
    renderingMode: 'immersive',
    rendererClass: 'hardware',
    warmupMs: 2_000,
    requestedSamples: 20,
  },
  renderer: { state: 'immersive', fallbackReason: null },
  measurements: {
    applicationReady: { state: 'available', durationMs: 1_240 },
    interactionLatency: {
      state: 'available',
      sampleCount: 20,
      medianMs: 12,
      p95Ms: 24,
      maxMs: 31,
    },
    frameTime: {
      state: 'available',
      sampleCount: 20,
      medianMs: 16,
      p95Ms: 22,
      maxMs: 30,
    },
  },
});

describe('controlled performance result contract', () => {
  it('preserves controlled loading and interaction regressions for comparison', () => {
    const input = validResult();
    input.measurements.applicationReady.durationMs = 8_500;
    input.measurements.interactionLatency.p95Ms = 250;
    input.measurements.interactionLatency.maxMs = 400;

    const result = createControlledPerformanceResult(input);

    expect(result?.measurements.applicationReady.durationMs).toBe(8_500);
    expect(result?.measurements.interactionLatency.p95Ms).toBe(250);
  });

  it('records renderer fallback without claiming frame-time success', () => {
    const input = validResult();
    input.conditions.renderingMode = 'text';
    input.conditions.rendererClass = 'unavailable';
    input.renderer = {
      state: 'fallback',
      fallbackReason: 'webgl-unsupported',
    };
    input.measurements.frameTime = {
      state: 'unavailable',
      reason: 'unsupported_environment',
    } as typeof input.measurements.frameTime;

    expect(createControlledPerformanceResult(input)).toMatchObject({
      renderer: {
        state: 'fallback',
        fallbackReason: 'webgl-unsupported',
      },
      measurements: {
        frameTime: {
          state: 'unavailable',
          reason: 'unsupported_environment',
        },
      },
    });
  });

  it('requires software-rendered frame time to be unavailable', () => {
    const input = validResult();
    input.conditions.rendererClass = 'software';
    expect(createControlledPerformanceResult(input)).toBeNull();

    input.measurements.frameTime = {
      state: 'unavailable',
      reason: 'unsupported_environment',
    } as typeof input.measurements.frameTime;
    expect(createControlledPerformanceResult(input)).not.toBeNull();
  });

  it.each([
    [
      'unknown schema',
      (input: ReturnType<typeof validResult>) => (input.schemaVersion = 2),
    ],
    [
      'negative duration',
      (input: ReturnType<typeof validResult>) =>
        (input.measurements.applicationReady.durationMs = -1),
    ],
    [
      'unordered summary',
      (input: ReturnType<typeof validResult>) =>
        (input.measurements.interactionLatency.medianMs = 50),
    ],
    [
      'unknown fallback',
      (input: ReturnType<typeof validResult>) => {
        input.conditions.renderingMode = 'text';
        input.conditions.rendererClass = 'unavailable';
        input.renderer = { state: 'fallback', fallbackReason: 'secret-error' };
      },
    ],
  ])('rejects malformed results: %s', (_label, mutate) => {
    const input = validResult();
    mutate(input);
    expect(createControlledPerformanceResult(input)).toBeNull();
  });

  it('rejects values beyond contract bounds', () => {
    const input = validResult();
    input.identity.viewport.width = 20_000;
    input.conditions.requestedSamples = 601;
    input.identity.buildTag = 'x'.repeat(101);
    expect(createControlledPerformanceResult(input)).toBeNull();
  });

  it('projects away session identifiers, input, errors, URLs, and extra environment data', () => {
    const input = Object.assign(validResult(), {
      sessionId: 'visitor-123',
      userInput: 'private search',
      consoleErrors: ['raw failure'],
      url: 'https://example.test/?token=secret',
      environment: { userAgent: 'unbounded fingerprint' },
    });

    const result = createControlledPerformanceResult(input);
    const serialized = JSON.stringify(result);

    expect(result).not.toBeNull();
    expect(serialized).not.toContain('visitor-123');
    expect(serialized).not.toContain('private search');
    expect(serialized).not.toContain('raw failure');
    expect(serialized).not.toContain('example.test');
    expect(serialized).not.toContain('userAgent');
  });
});
