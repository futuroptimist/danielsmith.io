import { describe, expect, it } from 'vitest';

import {
  chooseInitialGraphicsQuality,
  clampDevicePixelRatio,
  classifyRendererInfo,
} from '../systems/performance/rendererCapabilities';

describe('renderer capability policy', () => {
  it('classifies SwiftShader and llvmpipe as software renderers', () => {
    expect(
      classifyRendererInfo({
        vendor: 'Google Inc.',
        renderer: 'WebGL 2.0',
        unmaskedVendor: 'Google Inc. (Google)',
        unmaskedRenderer: 'ANGLE (Google, Vulkan SwiftShader driver)',
      })
    ).toMatchObject({ isSoftwareRenderer: true, isRiskyRenderer: true });

    expect(
      classifyRendererInfo({
        vendor: 'Mesa',
        renderer: 'llvmpipe (LLVM 17.0.6, 256 bits)',
        unmaskedVendor: null,
        unmaskedRenderer: null,
      })
    ).toMatchObject({ isSoftwareRenderer: true, isRiskyRenderer: true });
  });

  it('keeps common hardware renderers on the balanced default', () => {
    const info = classifyRendererInfo({
      vendor: 'NVIDIA Corporation',
      renderer: 'NVIDIA GeForce RTX',
      unmaskedVendor: 'NVIDIA Corporation',
      unmaskedRenderer: 'NVIDIA GeForce RTX 4090/PCIe/SSE2',
    });

    expect(info.isSoftwareRenderer).toBe(false);
    expect(chooseInitialGraphicsQuality(info, null)).toBe('balanced');
    expect(chooseInitialGraphicsQuality(info, 'cinematic')).toBe('cinematic');
  });

  it('caps DPR lower for software and risky renderer paths', () => {
    expect(
      clampDevicePixelRatio(2.5, {
        isSoftwareRenderer: false,
        isRiskyRenderer: false,
      })
    ).toBe(1.25);
    expect(
      clampDevicePixelRatio(2, {
        isSoftwareRenderer: false,
        isRiskyRenderer: true,
      })
    ).toBe(1);
    expect(
      clampDevicePixelRatio(2, {
        isSoftwareRenderer: true,
        isRiskyRenderer: true,
      })
    ).toBe(0.75);
  });
});
