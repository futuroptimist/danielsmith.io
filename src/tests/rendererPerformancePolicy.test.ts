import { describe, expect, it } from 'vitest';

import {
  clampDpr,
  selectInitialGraphicsQuality,
  selectMirrorPolicy,
  shouldUseComposer,
} from '../scene/graphics/performancePolicy';
import { classifyRendererInfo } from '../scene/graphics/rendererCapabilities';

const softwareRenderer = {
  tier: 'software' as const,
};

const hardwareRenderer = {
  tier: 'hardware' as const,
};

describe('renderer performance policy', () => {
  it('classifies common software renderer strings', () => {
    expect(
      classifyRendererInfo({
        unmaskedRenderer: 'ANGLE (Google, Vulkan SwiftShader)',
      }).tier
    ).toBe('software');
    expect(
      classifyRendererInfo({ unmaskedRenderer: 'llvmpipe (LLVM 17.0)' }).tier
    ).toBe('software');
  });

  it('classifies common hardware renderer strings', () => {
    expect(
      classifyRendererInfo({ unmaskedRenderer: 'NVIDIA GeForce RTX 4090' }).tier
    ).toBe('hardware');
    expect(
      classifyRendererInfo({ unmaskedRenderer: 'Apple M3 Pro' }).tier
    ).toBe('hardware');
  });

  it('selects performance quality for software and balanced for normal defaults', () => {
    expect(selectInitialGraphicsQuality(softwareRenderer, 'cinematic')).toBe(
      'performance'
    );
    expect(selectInitialGraphicsQuality(hardwareRenderer, null)).toBe(
      'balanced'
    );
    expect(selectInitialGraphicsQuality(hardwareRenderer, 'cinematic')).toBe(
      'cinematic'
    );
  });

  it('clamps DPR by quality tier and adaptive downgrade step', () => {
    expect(
      clampDpr({
        devicePixelRatio: 3,
        rendererTier: 'hardware',
        quality: 'cinematic',
      })
    ).toBe(1.5);
    expect(
      clampDpr({
        devicePixelRatio: 3,
        rendererTier: 'hardware',
        quality: 'balanced',
      })
    ).toBe(1.25);
    expect(
      clampDpr({
        devicePixelRatio: 2,
        rendererTier: 'software',
        quality: 'cinematic',
      })
    ).toBe(0.75);
    expect(
      clampDpr({
        devicePixelRatio: 2,
        rendererTier: 'hardware',
        quality: 'performance',
        adaptiveStep: 2,
      })
    ).toBe(0.7);
  });

  it('skips composer when postprocessing passes are disabled', () => {
    expect(
      shouldUseComposer({ bloomEnabled: false, motionBlurEnabled: false })
    ).toBe(false);
    expect(
      shouldUseComposer({ bloomEnabled: true, motionBlurEnabled: false })
    ).toBe(true);
  });

  it('throttles or disables selfie mirror by quality and renderer tier', () => {
    expect(
      selectMirrorPolicy({
        quality: 'performance',
        rendererTier: 'hardware',
        playerDistance: 1,
      })
    ).toMatchObject({ enabled: false, targetSize: 128, updateRateFps: 0 });
    expect(
      selectMirrorPolicy({
        quality: 'balanced',
        rendererTier: 'hardware',
        playerDistance: 1,
      })
    ).toMatchObject({ enabled: true, targetSize: 256, updateRateFps: 8 });
    expect(
      selectMirrorPolicy({
        quality: 'cinematic',
        rendererTier: 'hardware',
        playerDistance: 1,
      })
    ).toMatchObject({ enabled: true, targetSize: 512, updateRateFps: 15 });
    expect(
      selectMirrorPolicy({
        quality: 'cinematic',
        rendererTier: 'software',
        playerDistance: 1,
      })
    ).toMatchObject({ enabled: false, targetSize: 128, updateRateFps: 0 });
  });
});
