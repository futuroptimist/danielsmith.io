import { describe, expect, it } from 'vitest';

import {
  createPerformanceResult,
  MAX_PERFORMANCE_DURATION_MS,
  parsePerformanceResult,
  summarizeDurations,
  type PerformanceResultInput,
} from '../performanceResult';

const input = (): PerformanceResultInput => ({
  measuredAt: 1_800_000_000,
  build: { environment: 'staging', tag: 'main-deadbee' },
  conditions: {
    browser: 'chromium',
    browserMajorVersion: 130,
    viewport: { width: 1280, height: 720 },
    renderingMode: 'immersive',
    warmupMs: 5_000,
  },
  renderer: { class: 'hardware', status: 'immersive', fallbackReason: null },
  measurements: {
    applicationReady: { state: 'available', durationMs: 800 },
    interactionLatency: summarizeDurations([12, 18, 25]),
    frameTime: {
      ...summarizeDurations([15, 16, 20]),
      supportedEnvironment: 'linux-chromium-gpu',
    },
  },
});

describe('controlled performance result contract', () => {
  it('keeps controlled loading and interaction summaries versioned and bounded', () => {
    const result = createPerformanceResult(input());
    expect(result.schemaVersion).toBe(1);
    expect(result.measurements.interactionLatency).toEqual({
      state: 'available',
      sampleCount: 3,
      medianMs: 18,
      p95Ms: 25,
    });
  });

  it('preserves slower controlled results so a collector can detect regressions', () => {
    const candidate = input();
    candidate.measurements.applicationReady = {
      state: 'available',
      durationMs: 1_600,
    };
    candidate.measurements.interactionLatency = summarizeDurations([
      20, 80, 120,
    ]);
    expect(createPerformanceResult(candidate).measurements).toMatchObject({
      applicationReady: { durationMs: 1_600 },
      interactionLatency: { p95Ms: 120 },
    });
  });

  it('represents renderer fallback and unavailable measurements explicitly', () => {
    const candidate = input();
    candidate.renderer = {
      class: 'software',
      status: 'fallback',
      fallbackReason: 'low-performance',
    };
    candidate.measurements.frameTime = {
      state: 'unavailable',
      reason: 'unsupported_renderer',
      supportedEnvironment: null,
    };
    expect(
      createPerformanceResult(candidate).measurements.frameTime.state
    ).toBe('unavailable');
  });

  it('rejects software frame timing and zero-as-success', () => {
    const software = input();
    software.renderer.class = 'software';
    expect(() => createPerformanceResult(software)).toThrow(TypeError);
    const zero = input();
    zero.measurements.applicationReady = { state: 'available', durationMs: 0 };
    expect(() => createPerformanceResult(zero)).toThrow(TypeError);
  });

  it('rejects malformed, excessive, and unbounded results', () => {
    expect(parsePerformanceResult({ schemaVersion: 1 })).toBeNull();
    expect(() => summarizeDurations([MAX_PERFORMANCE_DURATION_MS + 1])).toThrow(
      RangeError
    );
    expect(() =>
      summarizeDurations(Array.from({ length: 601 }, () => 1))
    ).toThrow(RangeError);
  });

  it.each(['sessionId', 'url', 'userInput', 'consoleError'])(
    'rejects privacy field %s',
    (field) => {
      const result = createPerformanceResult(input()) as unknown as Record<
        string,
        unknown
      >;
      result[field] = 'private';
      expect(parsePerformanceResult(result)).toBeNull();
    }
  );

  it('rejects arbitrary environment and fallback strings', () => {
    const candidate = input() as unknown as {
      build: Record<string, unknown>;
      renderer: Record<string, unknown>;
    };
    candidate.build.tag = 'https://example.test/?token=secret';
    expect(
      parsePerformanceResult({ schemaVersion: 1, ...candidate })
    ).toBeNull();
    candidate.build.tag = 'main-deadbee';
    candidate.renderer.fallbackReason = 'raw console exception with spaces';
    expect(
      parsePerformanceResult({ schemaVersion: 1, ...candidate })
    ).toBeNull();
  });
});
