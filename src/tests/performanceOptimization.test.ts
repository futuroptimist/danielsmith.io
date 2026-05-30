import { describe, expect, it, vi } from 'vitest';

import type { GraphicsQualityLevel } from '../scene/graphics/qualityManager';
import {
  createAdaptiveQualityController,
  type AdaptiveQualitySelectionSource,
} from '../scene/performance/adaptiveQuality';
import {
  clampDevicePixelRatio,
  getQualityFeaturePolicy,
  resolveInitialQualityPolicy,
  resolveResizedBasePixelRatio,
} from '../scene/performance/qualityPolicy';
import { classifyRendererInfo } from '../scene/performance/rendererCapabilities';

function createPolicyHarness({
  level = 'balanced',
  basePixelRatio = 1.25,
  selectionSource = 'adaptive',
  isSoftwareRenderer = false,
}: {
  level?: GraphicsQualityLevel;
  basePixelRatio?: number;
  selectionSource?: AdaptiveQualitySelectionSource;
  isSoftwareRenderer?: boolean;
} = {}) {
  let currentLevel = level;
  let currentBasePixelRatio = basePixelRatio;
  let currentSelectionSource = selectionSource;
  const onAction = vi.fn();
  const controller = createAdaptiveQualityController({
    qualityManager: {
      getLevel: () => currentLevel,
      setLevel: (next, options = {}) => {
        currentLevel = next;
        currentSelectionSource = options.source ?? 'user';
      },
      setBasePixelRatio: (next) => {
        currentBasePixelRatio = next;
      },
    },
    getBasePixelRatio: () => currentBasePixelRatio,
    setBasePixelRatio: (next) => {
      currentBasePixelRatio = next;
    },
    getSelectionSource: () => currentSelectionSource,
    isSoftwareRenderer,
    cooldownMs: 0,
    downgradeAfterMs: 1000,
    warmupMs: isSoftwareRenderer ? 0 : 3000,
    recoveryAfterMs: 3000,
    recoveryFpsThreshold: 55,
    recoveryP95FrameMs: 22,
    onAction,
  });

  return {
    controller,
    onAction,
    get level() {
      return currentLevel;
    },
    get basePixelRatio() {
      return currentBasePixelRatio;
    },
    setLevel(next: GraphicsQualityLevel) {
      currentLevel = next;
    },
    setSelectionSource(next: AdaptiveQualitySelectionSource) {
      currentSelectionSource = next;
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

  it('does not downgrade normal renderers for transient startup warmup FPS', () => {
    const harness = createPolicyHarness({ level: 'balanced' });

    for (let index = 0; index < 6; index += 1) {
      expect(harness.controller.update(0.4)).toBeNull();
    }

    expect(harness.level).toBe('balanced');
    expect(harness.controller.getSnapshot()).toMatchObject({
      isWarmingUp: true,
      downgradeCount: 0,
    });
  });

  it('downgrades normal renderers after sustained low FPS beyond warmup', () => {
    const harness = createPolicyHarness({ level: 'cinematic' });

    for (let index = 0; index < 9; index += 1) {
      harness.controller.update(0.4);
    }
    const event = harness.controller.update(0.4);

    expect(event?.step).toBe('quality-balanced');
    expect(event?.reason).toContain('sustained low FPS');
    expect(harness.level).toBe('balanced');
  });

  it('recovers normal hardware from performance to balanced after stable FPS', () => {
    const harness = createPolicyHarness({ level: 'performance' });

    let event = null;
    for (let index = 0; index < 380; index += 1) {
      event = harness.controller.update(1 / 60) ?? event;
    }

    expect(event?.action).toBe('recover');
    expect(event?.step).toBe('quality-balanced');
    expect(harness.level).toBe('balanced');
    expect(harness.controller.getRecoveryCount()).toBe(1);
  });

  it('starts recovery hysteresis fresh after entering performance mode', () => {
    const harness = createPolicyHarness({ level: 'balanced' });

    for (let index = 0; index < 190; index += 1) {
      harness.controller.update(1 / 60);
    }

    expect(harness.controller.getSnapshot().stableDurationMs).toBe(0);

    harness.setLevel('performance');

    expect(harness.controller.update(1 / 60)).toBeNull();
    expect(harness.level).toBe('performance');

    let event = null;
    for (let index = 0; index < 180; index += 1) {
      event = harness.controller.update(1 / 60) ?? event;
    }

    expect(event?.action).toBe('recover');
    expect(harness.level).toBe('balanced');
  });

  it('keeps software renderers conservative and does not auto-upshift', () => {
    const harness = createPolicyHarness({
      level: 'performance',
      isSoftwareRenderer: true,
    });

    for (let index = 0; index < 240; index += 1) {
      harness.controller.update(1 / 60);
    }

    expect(harness.level).toBe('performance');
    expect(harness.controller.getSnapshot()).toMatchObject({
      autoRecoveryEnabled: false,
      softwareRenderer: true,
      recoveryCount: 0,
    });
  });

  it('does not override user-selected performance with auto-upshift', () => {
    const harness = createPolicyHarness({
      level: 'performance',
      selectionSource: 'user',
    });

    for (let index = 0; index < 240; index += 1) {
      harness.controller.update(1 / 60);
    }

    expect(harness.level).toBe('performance');
    expect(harness.controller.getSnapshot().autoRecoveryEnabled).toBe(false);
  });

  it('requires hysteresis so boundary frames do not oscillate quality', () => {
    const harness = createPolicyHarness({ level: 'balanced' });

    for (let index = 0; index < 12; index += 1) {
      harness.controller.update(index % 2 === 0 ? 1 / 29 : 1 / 60);
    }

    expect(harness.level).toBe('balanced');
    expect(harness.controller.getDowngradeCount()).toBe(0);
    expect(harness.onAction).not.toHaveBeenCalled();
  });

  it('downgrades quality and DPR once adaptive steps are exhausted', () => {
    const harness = createPolicyHarness({
      level: 'cinematic',
      isSoftwareRenderer: true,
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
    expect(harness.onAction).toHaveBeenCalledTimes(3);
  });
});
