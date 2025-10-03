import { describe, expect, it, vi } from 'vitest';

import {
  GraphicsQualityManager,
  type GraphicsQualityPreset,
} from '../graphics/qualityManager';

describe('GraphicsQualityManager', () => {
  const createMocks = () => {
    const renderer = { setPixelRatio: vi.fn() };
    const composer = { setPixelRatio: vi.fn() };
    const bloomPass = {
      enabled: true,
      strength: 0.6,
      radius: 0.9,
      threshold: 0.2,
    };
    let devicePixelRatio = 2.5;
    const getDevicePixelRatio = () => devicePixelRatio;
    const manager = new GraphicsQualityManager({
      renderer,
      composer,
      bloomPass: bloomPass as never,
      getDevicePixelRatio,
    });
    return {
      renderer,
      composer,
      bloomPass,
      manager,
      setDevicePixelRatio(value: number) {
        devicePixelRatio = value;
      },
    };
  };

  it('applies cinematic preset by default', () => {
    const { renderer, composer, bloomPass, manager } = createMocks();
    expect(manager.getQuality()).toBe('cinematic');
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(2);
    expect(composer.setPixelRatio).toHaveBeenCalledWith(2);
    expect(bloomPass.enabled).toBe(true);
    expect(bloomPass.strength).toBeCloseTo(0.6, 5);
  });

  it('switches to performance preset and restores bloom state afterwards', () => {
    const { renderer, composer, bloomPass, manager } = createMocks();
    (renderer.setPixelRatio as ReturnType<typeof vi.fn>).mockClear();
    (composer.setPixelRatio as ReturnType<typeof vi.fn>).mockClear();

    manager.setQuality('performance');
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(1.3);
    expect(composer.setPixelRatio).toHaveBeenLastCalledWith(1.3);
    expect(bloomPass.enabled).toBe(false);
    expect(bloomPass.strength).toBe(0);

    bloomPass.enabled = true;
    bloomPass.strength = 0.42;
    bloomPass.radius = 0.7;
    bloomPass.threshold = 0.15;

    manager.setQuality('cinematic');
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(2);
    expect(composer.setPixelRatio).toHaveBeenLastCalledWith(2);
    expect(bloomPass.enabled).toBe(true);
    expect(bloomPass.strength).toBeCloseTo(0.6, 5);
    expect(bloomPass.radius).toBeCloseTo(0.9, 5);
    expect(bloomPass.threshold).toBeCloseTo(0.2, 5);
  });

  it('handles resize using current preset limits and clamps invalid ratios', () => {
    const { renderer, composer, setDevicePixelRatio, manager } = createMocks();
    (renderer.setPixelRatio as ReturnType<typeof vi.fn>).mockClear();
    (composer.setPixelRatio as ReturnType<typeof vi.fn>).mockClear();

    setDevicePixelRatio(0.25);
    manager.handleResize();
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(0.5);
    expect(composer.setPixelRatio).toHaveBeenCalledWith(0.5);

    setDevicePixelRatio(NaN);
    manager.setQuality('performance');
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(0.5);
  });

  it('ignores composer or bloom pass when they are not provided', () => {
    const renderer = { setPixelRatio: vi.fn() };
    const manager = new GraphicsQualityManager({ renderer });
    expect(manager.getQuality()).toBe('cinematic');
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1);

    manager.setQuality('performance');
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(1);
  });

  it('reapplies preset when setQuality is called with same value', () => {
    const { renderer, manager } = createMocks();
    (renderer.setPixelRatio as ReturnType<typeof vi.fn>).mockClear();

    manager.setQuality(manager.getQuality() as GraphicsQualityPreset);
    expect(renderer.setPixelRatio).toHaveBeenCalled();
  });
});
