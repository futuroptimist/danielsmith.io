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

function createTestAdaptiveController(
  options: {
    level?: GraphicsQualityLevel;
    basePixelRatio?: number;
    isSoftwareRenderer?: boolean;
    hasManualQualitySelection?: () => boolean;
    cooldownMs?: number;
    warmupMs?: number;
    downgradeAfterMs?: number;
    stableRecoveryAfterMs?: number;
  } = {}
) {
  let level: GraphicsQualityLevel = options.level ?? 'balanced';
  let basePixelRatio = options.basePixelRatio ?? 1.25;
  const onDowngrade = vi.fn();
  const onRecover = vi.fn();
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
    cooldownMs: options.cooldownMs ?? 0,
    warmupMs: options.warmupMs,
    downgradeAfterMs: options.downgradeAfterMs ?? 1000,
    stableRecoveryAfterMs: options.stableRecoveryAfterMs ?? 1000,
    isSoftwareRenderer: options.isSoftwareRenderer,
    hasManualQualitySelection: options.hasManualQualitySelection,
    onDowngrade,
    onRecover,
  });

  return {
    controller,
    onDowngrade,
    onRecover,
    get level() {
      return level;
    },
    get basePixelRatio() {
      return basePixelRatio;
    },
  };
}

function runFrames(
  controller: ReturnType<typeof createAdaptiveQualityController>,
  frameSeconds: number,
  count: number
) {
  let lastEvent: ReturnType<typeof controller.update> = null;
  for (let index = 0; index < count; index += 1) {
    lastEvent = lastEvent ?? controller.update(frameSeconds);
  }
  return lastEvent;
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

  it('ignores transient startup low FPS during normal renderer warmup', () => {
    const test = createTestAdaptiveController({
      level: 'balanced',
      warmupMs: 5000,
    });

    runFrames(test.controller, 0.1, 30);

    expect(test.level).toBe('balanced');
    expect(test.controller.getSnapshot()).toMatchObject({
      isWarmingUp: true,
      downgradeCount: 0,
    });
    expect(test.onDowngrade).not.toHaveBeenCalled();
  });

  it('downgrades normal renderers only after sustained low FPS after warmup', () => {
    const test = createTestAdaptiveController({
      level: 'balanced',
      warmupMs: 5000,
      downgradeAfterMs: 1000,
    });

    runFrames(test.controller, 1 / 60, 310);
    expect(test.level).toBe('balanced');

    const downgrade = runFrames(test.controller, 0.05, 80);

    expect(downgrade?.step).toBe('quality-performance');
    expect(downgrade?.action).toBe('downgrade');
    expect(test.level).toBe('performance');
    expect(test.controller.getLastDowngradeReason()).toContain(
      'sustained low FPS'
    );
  });

  it('recovers normal hardware from performance to balanced after stable FPS', () => {
    const test = createTestAdaptiveController({
      level: 'performance',
      warmupMs: 0,
      stableRecoveryAfterMs: 1000,
    });

    const recovery = runFrames(test.controller, 1 / 60, 70);

    expect(recovery?.step).toBe('quality-balanced');
    expect(recovery?.action).toBe('recovery');
    expect(test.level).toBe('balanced');
    expect(test.controller.getRecoveryCount()).toBe(1);
    expect(test.onRecover).toHaveBeenCalledTimes(1);
  });

  it('keeps software renderers conservative and does not auto-upshift', () => {
    const test = createTestAdaptiveController({
      level: 'performance',
      isSoftwareRenderer: true,
      warmupMs: 0,
      stableRecoveryAfterMs: 1000,
    });

    runFrames(test.controller, 1 / 60, 80);

    expect(test.level).toBe('performance');
    expect(test.controller.getRecoveryCount()).toBe(0);
    expect(test.controller.getSnapshot().isRecoveryAllowed).toBe(false);
  });

  it('does not auto-upshift over a user-selected performance preset', () => {
    const test = createTestAdaptiveController({
      level: 'performance',
      warmupMs: 0,
      stableRecoveryAfterMs: 1000,
      hasManualQualitySelection: () => true,
    });

    runFrames(test.controller, 1 / 60, 80);

    expect(test.level).toBe('performance');
    expect(test.controller.getRecoveryCount()).toBe(0);
    expect(test.controller.getSnapshot().isRecoveryAllowed).toBe(false);
  });

  it('requires hysteresis and avoids oscillating near the threshold', () => {
    const test = createTestAdaptiveController({
      level: 'balanced',
      warmupMs: 0,
      downgradeAfterMs: 1000,
      stableRecoveryAfterMs: 1000,
    });

    for (let index = 0; index < 80; index += 1) {
      test.controller.update(index % 2 === 0 ? 1 / 60 : 1 / 28);
    }

    expect(test.level).toBe('balanced');
    expect(test.controller.getDowngradeCount()).toBe(0);
    expect(test.controller.getRecoveryCount()).toBe(0);
  });

  it('downgrades quality once per cooldown and exhausts after the DPR step', () => {
    const test = createTestAdaptiveController({
      level: 'cinematic',
      warmupMs: 0,
      cooldownMs: 0,
      downgradeAfterMs: 1000,
    });

    expect(runFrames(test.controller, 0.05, 28)?.step).toBe('quality-balanced');
    expect(test.level).toBe('balanced');
    expect(runFrames(test.controller, 0.05, 28)?.step).toBe(
      'quality-performance'
    );
    expect(test.level).toBe('performance');
    expect(runFrames(test.controller, 0.05, 28)?.step).toBe('pixel-ratio');
    expect(test.basePixelRatio).toBeCloseTo(1);
    expect(runFrames(test.controller, 0.05, 28)).toBeNull();
    expect(test.controller.isExhausted()).toBe(true);
    expect(test.onDowngrade).toHaveBeenCalledTimes(3);
  });
});
