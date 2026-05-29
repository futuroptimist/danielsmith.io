import { describe, expect, it, vi } from 'vitest';

import type { GraphicsQualityLevel } from '../scene/graphics/qualityManager';
import { createAdaptiveQualityController } from '../scene/performance/adaptiveQuality';
import {
  clampDevicePixelRatio,
  getQualityFeaturePolicy,
  resolveInitialQualityPolicy,
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

  it('downgrades quality once per cooldown without flapping back upward', () => {
    let level: GraphicsQualityLevel = 'cinematic';
    let basePixelRatio = 1.25;
    const onDowngrade = vi.fn();
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
      cooldownMs: 0,
      downgradeAfterMs: 1000,
      onDowngrade,
    });

    expect(controller.update(0.5)).toBeNull();
    expect(controller.update(0.6)?.step).toBe('quality-balanced');
    expect(level).toBe('balanced');
    expect(controller.update(1.1)?.step).toBe('quality-performance');
    expect(level).toBe('performance');
    expect(controller.update(1.1)?.step).toBe('pixel-ratio');
    expect(basePixelRatio).toBeCloseTo(1);
    expect(controller.update(1.1)).toBeNull();
    expect(controller.isExhausted()).toBe(true);
    expect(onDowngrade).toHaveBeenCalledTimes(3);
  });
});
