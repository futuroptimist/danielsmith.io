import { describe, expect, it, vi } from 'vitest';

import type {
  GraphicsQualityLevel,
  GraphicsQualitySource,
} from '../scene/graphics/qualityManager';
import { createAdaptiveQualityController } from '../scene/performance/adaptiveQuality';
import {
  clampDevicePixelRatio,
  getQualityFeaturePolicy,
  resolveInitialQualityPolicy,
  resolveResizedBasePixelRatio,
} from '../scene/performance/qualityPolicy';
import { classifyRendererInfo } from '../scene/performance/rendererCapabilities';

function createAdaptiveHarness({
  level = 'balanced',
  source = 'initial',
  basePixelRatio = 1.25,
  isSoftwareRenderer = false,
  riskLevel = 'normal',
  warmupMs = 0,
  downgradeAfterMs = 1000,
  recoveryAfterMs = 3000,
}: {
  level?: GraphicsQualityLevel;
  source?: GraphicsQualitySource;
  basePixelRatio?: number;
  isSoftwareRenderer?: boolean;
  riskLevel?: 'normal' | 'software' | 'unknown';
  warmupMs?: number;
  downgradeAfterMs?: number;
  recoveryAfterMs?: number;
} = {}) {
  let currentLevel = level;
  let currentSource = source;
  let currentBasePixelRatio = basePixelRatio;
  const onDowngrade = vi.fn();
  const controller = createAdaptiveQualityController({
    qualityManager: {
      getLevel: () => currentLevel,
      setLevel: (next, nextSource = 'user') => {
        currentLevel = next;
        currentSource = nextSource;
      },
      getSource: () => currentSource,
      setBasePixelRatio: (next) => {
        currentBasePixelRatio = next;
      },
    },
    getBasePixelRatio: () => currentBasePixelRatio,
    setBasePixelRatio: (next) => {
      currentBasePixelRatio = next;
    },
    rendererInfo: { isSoftwareRenderer, riskLevel },
    cooldownMs: 0,
    downgradeAfterMs,
    warmupMs,
    recoveryAfterMs,
    sampleWindowMs: 2000,
    onDowngrade,
  });

  return {
    controller,
    onDowngrade,
    get level() {
      return currentLevel;
    },
    get source() {
      return currentSource;
    },
    get basePixelRatio() {
      return currentBasePixelRatio;
    },
  };
}

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

  it('does not downgrade normal hardware for transient startup spikes during warmup', () => {
    const harness = createAdaptiveHarness({ warmupMs: 5000 });

    for (let index = 0; index < 4; index += 1) {
      expect(harness.controller.update(0.5)).toBeNull();
    }

    expect(harness.level).toBe('balanced');
    expect(harness.controller.getSnapshot()).toMatchObject({
      warmupActive: true,
      downgradeCount: 0,
    });
  });

  it('downgrades normal hardware only after sustained low FPS after warmup', () => {
    const harness = createAdaptiveHarness({
      warmupMs: 1000,
      downgradeAfterMs: 1200,
    });

    expect(harness.controller.update(0.5)).toBeNull();
    expect(harness.controller.update(0.5)).toBeNull();
    expect(harness.controller.update(0.6)).toBeNull();
    const event = harness.controller.update(0.6);

    expect(event?.step).toBe('quality-performance');
    expect(event?.action).toBe('downgrade');
    expect(harness.level).toBe('performance');
    expect(harness.source).toBe('adaptive');
  });

  it('recovers normal hardware from performance to balanced after sustained stable FPS', () => {
    const harness = createAdaptiveHarness({
      level: 'performance',
      source: 'adaptive',
      recoveryAfterMs: 1000,
    });

    for (let index = 0; index < 90; index += 1) {
      const event = harness.controller.update(1 / 60);
      if (event) {
        expect(event).toMatchObject({
          action: 'recovery',
          step: 'quality-balanced',
        });
      }
    }

    expect(harness.level).toBe('balanced');
    expect(harness.controller.getRecoveryCount()).toBe(1);
    expect(harness.controller.getLastRecoveryReason()).toContain('recovered');
  });

  it('keeps software renderers conservative and does not auto-upshift', () => {
    const harness = createAdaptiveHarness({
      level: 'performance',
      source: 'initial',
      isSoftwareRenderer: true,
      riskLevel: 'software',
      recoveryAfterMs: 1000,
    });

    for (let index = 0; index < 120; index += 1) {
      expect(harness.controller.update(1 / 60)).toBeNull();
    }

    expect(harness.level).toBe('performance');
    expect(harness.controller.getRecoveryCount()).toBe(0);
    expect(harness.controller.getSnapshot()).toMatchObject({
      canAutoRecover: false,
      isSoftwareRenderer: true,
    });
  });

  it('does not auto-upshift against an explicit user performance choice', () => {
    const harness = createAdaptiveHarness({
      level: 'performance',
      source: 'user',
      recoveryAfterMs: 1000,
    });

    for (let index = 0; index < 120; index += 1) {
      harness.controller.update(1 / 60);
    }

    expect(harness.level).toBe('performance');
    expect(harness.controller.getSnapshot().qualitySource).toBe('user');
    expect(harness.controller.getRecoveryCount()).toBe(0);
  });

  it('ignores isolated low-min-FPS outliers and avoids boundary flapping', () => {
    const harness = createAdaptiveHarness({
      level: 'balanced',
      source: 'initial',
      downgradeAfterMs: 500,
      recoveryAfterMs: 500,
    });

    for (let index = 0; index < 60; index += 1) {
      harness.controller.update(index % 15 === 0 ? 0.2 : 1 / 60);
    }

    expect(harness.level).toBe('balanced');
    expect(harness.controller.getDowngradeCount()).toBe(0);
    expect(harness.controller.getRecoveryCount()).toBe(0);
  });

  it('downgrades quality once per cooldown until adaptive steps are exhausted', () => {
    const harness = createAdaptiveHarness({
      level: 'cinematic',
      basePixelRatio: 1.25,
      downgradeAfterMs: 1000,
    });

    expect(harness.controller.update(0.5)).toBeNull();
    expect(harness.controller.update(0.6)?.step).toBe('quality-balanced');
    expect(harness.level).toBe('balanced');
    expect(harness.controller.update(1.1)?.step).toBe('quality-performance');
    expect(harness.level).toBe('performance');
    expect(harness.controller.update(1.1)?.step).toBe('pixel-ratio');
    expect(harness.basePixelRatio).toBeCloseTo(1);
    expect(harness.controller.update(1.1)).toBeNull();
    expect(harness.controller.isExhausted()).toBe(true);
    expect(harness.onDowngrade).toHaveBeenCalledTimes(3);
  });
});
