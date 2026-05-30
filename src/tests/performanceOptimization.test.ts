import { describe, expect, it, vi } from 'vitest';

import type { GraphicsQualityLevel } from '../scene/graphics/qualityManager';
import { createAdaptiveQualityController } from '../scene/performance/adaptiveQuality';
import {
  clampDevicePixelRatio,
  getQualityFeaturePolicy,
  resolveInitialQualityPolicy,
  resolveResizedBasePixelRatio,
} from '../scene/performance/qualityPolicy';
import { classifyRendererInfo } from '../scene/performance/rendererCapabilities';
describe('immersive performance optimization policy', () => {
  it('classifies known software renderers as risky', () => {
    expect(
      classifyRendererInfo({ unmaskedRenderer: 'Google SwiftShader' })
        .isSoftwareRenderer
    ).toBe(true);
    expect(
      classifyRendererInfo({ renderer: 'ANGLE (NVIDIA GeForce RTX)' })
        .isSoftwareRenderer
    ).toBe(false);
  });

  it('starts software renderers in low-cost performance mode', () => {
    const software = resolveInitialQualityPolicy(
      { isSoftwareRenderer: true },
      2
    );
    expect(software.initialLevel).toBe('performance');
    expect(software.basePixelRatioCap).toBe(1);
    expect(software.mirrorEnabled).toBe(false);

    const normal = resolveInitialQualityPolicy(
      { isSoftwareRenderer: false },
      2
    );
    expect(normal.initialLevel).toBe('balanced');
    expect(normal.basePixelRatioCap).toBe(1.25);
    expect(normal.mirrorEnabled).toBe(true);
  });

  it('clamps DPR and disables expensive features in performance mode', () => {
    expect(clampDevicePixelRatio(3, 1.25)).toBe(1.25);
    expect(clampDevicePixelRatio(Number.NaN, 1.25)).toBe(1);
    expect(getQualityFeaturePolicy('performance')).toMatchObject({
      mirrorEnabled: false,
      mirrorUpdateRateFps: 0,
      mirrorTargetSize: 192,
    });
    expect(getQualityFeaturePolicy('cinematic')).toMatchObject({
      mirrorEnabled: true,
      mirrorUpdateRateFps: 15,
      mirrorTargetSize: 512,
    });
  });

  it('resizes DPR up to the device cap without undoing adaptive downgrades', () => {
    expect(resolveResizedBasePixelRatio(2, 1.25)).toBe(1.25);
    expect(resolveResizedBasePixelRatio(2, 1.25, 1)).toBe(1);
    expect(resolveResizedBasePixelRatio(0.9, 1.25, 1)).toBe(0.9);
  });

  function createTestController(
    options: {
      initialLevel?: GraphicsQualityLevel;
      rendererRiskLevel?: 'normal' | 'software' | 'unknown';
      warmupGraceMs?: number;
      cooldownMs?: number;
      downgradeAfterMs?: number;
      recoveryAfterMs?: number;
      evaluationWindowMs?: number;
      onAction?: ReturnType<typeof vi.fn>;
    } = {}
  ) {
    let level: GraphicsQualityLevel = options.initialLevel ?? 'balanced';
    let basePixelRatio = 1.25;
    const controller = createAdaptiveQualityController({
      qualityManager: {
        getLevel: () => level,
        setLevel: (next) => {
          level = next;
        },
        setBasePixelRatio: (next) => {
          basePixelRatio = next;
        },
      },
      getBasePixelRatio: () => basePixelRatio,
      setBasePixelRatio: (next) => {
        basePixelRatio = next;
      },
      rendererRiskLevel: options.rendererRiskLevel ?? 'normal',
      warmupGraceMs: options.warmupGraceMs ?? 0,
      cooldownMs: options.cooldownMs ?? 0,
      downgradeAfterMs: options.downgradeAfterMs ?? 1000,
      recoveryAfterMs: options.recoveryAfterMs ?? 2000,
      evaluationWindowMs: options.evaluationWindowMs ?? 2200,
      onAction: options.onAction,
    });

    return {
      controller,
      get level() {
        return level;
      },
      get basePixelRatio() {
        return basePixelRatio;
      },
    };
  }

  it('ignores transient startup low FPS during normal-renderer warmup', () => {
    const test = createTestController({ warmupGraceMs: 5000 });

    for (let index = 0; index < 20; index += 1) {
      expect(test.controller.update(0.1)).toBeNull();
    }

    expect(test.level).toBe('balanced');
    expect(test.controller.getSnapshot()).toMatchObject({
      inWarmup: true,
      downgradeCount: 0,
    });
  });

  it('downgrades normal renderers after sustained low FPS past warmup', () => {
    const test = createTestController({ warmupGraceMs: 1000 });

    for (let index = 0; index < 10; index += 1) {
      expect(test.controller.update(0.1)).toBeNull();
    }

    let event = null;
    for (let index = 0; index < 40; index += 1) {
      event = event ?? test.controller.update(0.1);
    }

    expect(event).toMatchObject({
      action: 'downgrade',
      step: 'quality-performance',
    });
    expect(test.level).toBe('performance');
  });

  it('recovers normal hardware from performance to balanced after stable FPS', () => {
    const test = createTestController({
      initialLevel: 'performance',
      recoveryAfterMs: 1000,
    });

    let event = null;
    for (let index = 0; index < 70; index += 1) {
      event = event ?? test.controller.update(1 / 60);
    }

    expect(event).toMatchObject({
      action: 'recovery',
      step: 'quality-balanced',
    });
    expect(test.level).toBe('balanced');
    expect(test.controller.getSnapshot().lastRecoveryReason).toContain(
      'recovered performance to balanced'
    );
  });

  it('starts software renderers conservatively and does not auto-upshift', () => {
    const test = createTestController({
      initialLevel: 'performance',
      rendererRiskLevel: 'software',
      recoveryAfterMs: 1000,
    });

    for (let index = 0; index < 90; index += 1) {
      expect(test.controller.update(1 / 60)).toBeNull();
    }

    expect(test.level).toBe('performance');
    expect(test.controller.getSnapshot()).toMatchObject({
      canAutoRecover: false,
      recoveryCount: 0,
    });
  });

  it('does not override an explicit user-selected performance level', () => {
    const test = createTestController({
      initialLevel: 'performance',
      recoveryAfterMs: 1000,
    });
    test.controller.markUserSelectedLevel('performance');

    for (let index = 0; index < 90; index += 1) {
      expect(test.controller.update(1 / 60)).toBeNull();
    }

    expect(test.level).toBe('performance');
    expect(test.controller.getSnapshot()).toMatchObject({
      qualitySource: 'manual',
      canAutoRecover: false,
    });
  });

  it('requires sustained window health and avoids flapping at boundaries', () => {
    const onAction = vi.fn();
    const test = createTestController({ onAction });

    for (let index = 0; index < 40; index += 1) {
      const delta = index % 8 === 0 ? 1 / 20 : 1 / 60;
      expect(test.controller.update(delta)).toBeNull();
    }

    expect(test.level).toBe('balanced');
    expect(onAction).not.toHaveBeenCalled();
  });

  it('downgrades quality once per cooldown without flapping back upward', () => {
    const onAction = vi.fn();
    const test = createTestController({
      initialLevel: 'cinematic',
      onAction,
      recoveryAfterMs: 10000,
      evaluationWindowMs: 1200,
    });

    let firstEvent = null;
    for (let index = 0; index < 22; index += 1) {
      firstEvent = firstEvent ?? test.controller.update(0.1);
    }
    expect(firstEvent?.step).toBe('quality-balanced');
    expect(test.level).toBe('balanced');

    let secondEvent = null;
    for (let index = 0; index < 22; index += 1) {
      secondEvent = secondEvent ?? test.controller.update(0.1);
    }
    expect(secondEvent?.step).toBe('quality-performance');
    expect(test.level).toBe('performance');

    let thirdEvent = null;
    for (let index = 0; index < 22; index += 1) {
      thirdEvent = thirdEvent ?? test.controller.update(0.1);
    }
    expect(thirdEvent?.step).toBe('pixel-ratio');
    expect(test.basePixelRatio).toBeCloseTo(1);
    expect(test.controller.update(1.1)).toBeNull();
    expect(test.controller.isExhausted()).toBe(true);
    expect(onAction).toHaveBeenCalledTimes(3);
  });
});
