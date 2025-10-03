import { describe, expect, it, vi } from 'vitest';

import {
  GRAPHICS_QUALITY_PRESETS,
  createGraphicsQualityManager,
  type BloomPassLike,
  type GraphicsQualityLevel,
  type RendererLike,
} from '../graphics/qualityManager';

describe('createGraphicsQualityManager', () => {
  const baseBloom = {
    strength: 0.55,
    radius: 0.85,
    threshold: 0.2,
  } as const;

  const baseLed = {
    emissiveIntensity: 3.2,
    lightIntensity: 1.4,
  } as const;

  const createRenderer = () => {
    let pixelRatio = 1;
    const renderer: RendererLike = {
      getPixelRatio: () => pixelRatio,
      setPixelRatio: (value: number) => {
        pixelRatio = value;
      },
      toneMappingExposure: 1,
    };
    return {
      renderer,
      get pixelRatio() {
        return pixelRatio;
      },
    };
  };

  it('applies presets, persists selections, and notifies listeners', () => {
    const { renderer } = createRenderer();
    const bloom: BloomPassLike = {
      enabled: true,
      strength: baseBloom.strength,
      radius: baseBloom.radius,
      threshold: baseBloom.threshold,
    };
    const ledMaterial = { emissiveIntensity: baseLed.emissiveIntensity };
    const ledLight = { intensity: baseLed.lightIntensity };
    const storage = {
      getItem: vi.fn<[], string | null>().mockReturnValue('balanced'),
      setItem: vi.fn<[string, string], void>(),
    };

    const manager = createGraphicsQualityManager({
      renderer,
      bloomPass: bloom,
      ledStripMaterials: [ledMaterial],
      ledFillLights: [ledLight],
      basePixelRatio: 2,
      baseBloom,
      baseLed,
      storage,
    });

    expect(manager.getLevel()).toBe('balanced');
    expect(renderer.getPixelRatio()).toBeCloseTo(2 * 0.85, 3);
    expect(renderer.toneMappingExposure).toBeCloseTo(1.02, 3);
    expect(bloom.enabled).toBe(true);
    expect(bloom.strength).toBeCloseTo(baseBloom.strength * 0.8, 3);
    expect(bloom.radius).toBeCloseTo(baseBloom.radius * 0.92, 3);
    expect(bloom.threshold).toBeCloseTo(baseBloom.threshold + 0.05, 3);
    expect(ledMaterial.emissiveIntensity).toBeCloseTo(
      baseLed.emissiveIntensity * 0.85,
      3
    );
    expect(ledLight.intensity).toBeCloseTo(baseLed.lightIntensity * 0.85, 3);

    const listener = vi.fn();
    const unsubscribe = manager.onChange(listener);

    manager.setLevel('performance');
    expect(listener).toHaveBeenCalledWith('performance');
    expect(renderer.getPixelRatio()).toBeCloseTo(2 * 0.7, 3);
    expect(renderer.toneMappingExposure).toBeCloseTo(0.96, 3);
    expect(bloom.enabled).toBe(false);
    expect(bloom.threshold).toBeCloseTo(baseBloom.threshold + 0.12, 3);
    expect(ledMaterial.emissiveIntensity).toBeCloseTo(
      baseLed.emissiveIntensity * 0.65,
      3
    );
    expect(ledLight.intensity).toBeCloseTo(baseLed.lightIntensity * 0.6, 3);
    expect(storage.setItem).toHaveBeenCalledWith(
      'danielsmith:graphics-quality-level',
      'performance'
    );

    listener.mockClear();
    manager.setLevel('performance');
    expect(listener).not.toHaveBeenCalled();
    expect(storage.setItem).toHaveBeenCalledWith(
      'danielsmith:graphics-quality-level',
      'performance'
    );

    unsubscribe();
    manager.setLevel('cinematic');
    expect(listener).not.toHaveBeenCalled();
    expect(renderer.getPixelRatio()).toBeCloseTo(2, 3);
    expect(renderer.toneMappingExposure).toBeCloseTo(1.1, 3);
  });

  it('handles storage failures and optional bloom/lights gracefully', () => {
    const { renderer } = createRenderer();
    const storage = {
      getItem: vi.fn().mockReturnValue('invalid'),
      setItem: vi.fn(() => {
        throw new Error('nope');
      }),
    } as const;

    const manager = createGraphicsQualityManager({
      renderer,
      bloomPass: null,
      ledStripMaterials: [],
      ledFillLights: undefined,
      basePixelRatio: Number.NaN,
      baseBloom,
      baseLed,
      storage,
    });

    expect(manager.getLevel()).toBe('cinematic');
    expect(renderer.getPixelRatio()).toBeCloseTo(1, 3);

    manager.setLevel('balanced');
    expect(renderer.getPixelRatio()).toBeCloseTo(0.85, 3);

    manager.setBasePixelRatio(2.4);
    expect(renderer.getPixelRatio()).toBeCloseTo(2.4 * 0.85, 3);

    manager.refresh();
    expect(renderer.getPixelRatio()).toBeCloseTo(2.4 * 0.85, 3);
  });

  it('guards against storage read errors during initialization', () => {
    const { renderer } = createRenderer();
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(),
    } as const;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const manager = createGraphicsQualityManager({
      renderer,
      basePixelRatio: 1,
      baseBloom,
      baseLed,
      storage,
    });

    expect(manager.getLevel()).toBe('cinematic');
    expect(storage.getItem).toHaveBeenCalledWith(
      'danielsmith:graphics-quality-level'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to read persisted graphics quality level:',
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it('throws for unsupported levels', () => {
    const { renderer } = createRenderer();
    const manager = createGraphicsQualityManager({
      renderer,
      basePixelRatio: 1,
      baseBloom,
      baseLed,
    });

    expect(() => manager.setLevel('balanced')).not.toThrow();
    expect(() => manager.setLevel('invalid' as GraphicsQualityLevel)).toThrow(
      /unsupported graphics quality level/i
    );
  });

  it('exports preset metadata', () => {
    const ids = GRAPHICS_QUALITY_PRESETS.map((preset) => preset.id);
    expect(ids).toEqual(['cinematic', 'balanced', 'performance']);
  });
});
