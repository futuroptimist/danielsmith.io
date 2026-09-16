import { describe, expect, it } from 'vitest';

import {
  createControlledPerformanceResult,
  parseControlledPerformanceResult,
  type ControlledPerformanceInput,
} from '../systems/performance/controlledPerformanceResult';

const input = (): ControlledPerformanceInput => ({
  applicationReadyMs: [800, 900, 1_000],
  controlledInteractionMs: [20, 30, 40],
  frameTimeMs: [14, 16, 18],
  baselinesMs: { applicationReadyP95: 1_100, controlledInteractionP95: 50 },
  rendering: { mode: 'hardware', fallbackActive: false },
  build: { environment: 'staging', tag: 'main-abc1234' },
  environment: {
    browser: 'chromium',
    browserVersion: '128.0',
    viewportWidth: 1280,
    viewportHeight: 720,
    supportsFrameTimeMeasurement: true,
  },
});

describe('controlled performance result', () => {
  it('creates bounded loading, interaction, and supported frame summaries', () => {
    const result = createControlledPerformanceResult(input());
    expect(result).toMatchObject({
      schemaVersion: 1,
      applicationReady: { state: 'available', sampleCount: 3, p95Ms: 1_000 },
      controlledInteraction: { state: 'available', sampleCount: 3, p95Ms: 40 },
      frameTime: { state: 'available', sampleCount: 3, p95Ms: 18 },
    });
    expect(parseControlledPerformanceResult(result)).toEqual(result);
  });

  it('reports controlled loading and interaction regressions against supplied baselines', () => {
    const value = input();
    value.baselinesMs = {
      applicationReadyP95: 999,
      controlledInteractionP95: 39,
    };
    const result = createControlledPerformanceResult(value);
    expect(result.applicationReady.state).toBe('regression');
    expect(result.controlledInteraction.state).toBe('regression');
  });

  it.each(['software', 'text', 'unsupported'] as const)(
    'marks frame time unavailable for %s rendering',
    (mode) => {
      const value = input();
      value.rendering = { mode, fallbackActive: mode !== 'software' };
      const result = createControlledPerformanceResult(value);
      expect(result.frameTime).toEqual({
        state: 'unavailable',
        sampleCount: 0,
        medianMs: null,
        p95Ms: null,
      });
    }
  );

  it('records renderer fallback without raw renderer strings', () => {
    const value = input();
    value.rendering = { mode: 'software', fallbackActive: true };
    expect(createControlledPerformanceResult(value).rendering).toEqual({
      mode: 'software',
      fallbackActive: true,
    });
  });

  it('rejects malformed results and inconsistent unavailable states', () => {
    const result = createControlledPerformanceResult(input());
    expect(
      parseControlledPerformanceResult({ ...result, schemaVersion: 2 })
    ).toBeNull();
    expect(
      parseControlledPerformanceResult({
        ...result,
        frameTime: {
          state: 'unavailable',
          sampleCount: 1,
          medianMs: 0,
          p95Ms: 0,
        },
      })
    ).toBeNull();
  });

  it('enforces sample, duration, viewport, and identity bounds', () => {
    const tooMany = input();
    tooMany.applicationReadyMs = Array.from({ length: 51 }, () => 1);
    expect(() => createControlledPerformanceResult(tooMany)).toThrow(/1-50/);
    const invalid = input();
    invalid.controlledInteractionMs = [Number.POSITIVE_INFINITY];
    expect(() => createControlledPerformanceResult(invalid)).toThrow(/120000/);
    const wide = input();
    wide.environment.viewportWidth = 20_000;
    expect(() => createControlledPerformanceResult(wide)).toThrow(/viewport/);
    const longTag = input();
    longTag.build.tag = 'x'.repeat(65);
    expect(() => createControlledPerformanceResult(longTag)).toThrow(
      /build tag/
    );
  });

  it('exports only the fixed privacy-reviewed fields', () => {
    const result = createControlledPerformanceResult(input());
    expect(Object.keys(result).sort()).toEqual([
      'applicationReady',
      'build',
      'controlledInteraction',
      'environment',
      'frameTime',
      'rendering',
      'schemaVersion',
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /url|session|input|console|rendererString/i
    );
    expect(
      parseControlledPerformanceResult({ ...result, sessionId: 'visitor-1' })
    ).toBeNull();
    expect(
      parseControlledPerformanceResult({
        ...result,
        environment: {
          ...result.environment,
          url: 'https://example.test/private',
        },
      })
    ).toBeNull();
  });
});
