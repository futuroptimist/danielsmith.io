import { describe, expect, it, vi } from 'vitest';

import { createAccessibilityPresetManager } from '../accessibility/presetManager';
import type {
  BloomPassLike,
  GraphicsQualityLevel,
  GraphicsQualityManager,
  LedLightLike,
  LedMaterialLike,
} from '../graphics/qualityManager';

function createStubGraphicsQualityManager(
  applyBaseline: () => void
): GraphicsQualityManager {
  const listeners = new Set<(level: GraphicsQualityLevel) => void>();
  return {
    getLevel: () => 'cinematic',
    setLevel: vi.fn(),
    refresh: () => {
      applyBaseline();
    },
    setBasePixelRatio: vi.fn(),
    onChange: (listener: (level: GraphicsQualityLevel) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

describe('createAccessibilityPresetManager', () => {
  const restoreDataset = () => {
    delete document.documentElement.dataset.accessibilityPreset;
    delete document.documentElement.dataset.accessibilityMotion;
    delete document.documentElement.dataset.accessibilityContrast;
  };

  it('applies stored preset, scales lighting, and adjusts audio', () => {
    const bloomPass: BloomPassLike = {
      enabled: true,
      strength: 1.5,
      radius: 0.9,
      threshold: 0.8,
    };
    const ledMaterial: LedMaterialLike = { emissiveIntensity: 1 };
    const ledLight: LedLightLike = { intensity: 1 };

    const baseline = () => {
      bloomPass.enabled = true;
      bloomPass.strength = 1.5;
      bloomPass.radius = 0.9;
      bloomPass.threshold = 0.8;
      ledMaterial.emissiveIntensity = 1;
      ledLight.intensity = 1;
    };

    const graphicsManager = createStubGraphicsQualityManager(baseline);

    let masterVolume = 1;
    const ambientAudio = {
      getMasterVolume: () => masterVolume,
      setMasterVolume: (value: number) => {
        masterVolume = value;
      },
    };

    const storage = {
      getItem: vi.fn(() => 'calm'),
      setItem: vi.fn(),
    };

    const manager = createAccessibilityPresetManager({
      documentElement: document.documentElement,
      graphicsQualityManager: graphicsManager,
      bloomPass,
      ledStripMaterials: [ledMaterial],
      ledFillLights: [ledLight],
      ambientAudioController: ambientAudio,
      storage,
    });

    expect(manager.getPreset()).toBe('calm');
    expect(document.documentElement.dataset.accessibilityPreset).toBe('calm');
    expect(document.documentElement.dataset.accessibilityMotion).toBe(
      'reduced'
    );
    expect(document.documentElement.dataset.accessibilityContrast).toBe(
      'standard'
    );
    expect(bloomPass.enabled).toBe(true);
    expect(bloomPass.strength).toBeCloseTo(0.9, 5);
    expect(bloomPass.radius).toBeCloseTo(0.81, 5);
    expect(bloomPass.threshold).toBeCloseTo(0.82, 5);
    expect(ledMaterial.emissiveIntensity).toBeCloseTo(0.75, 5);
    expect(ledLight.intensity).toBeCloseTo(0.8, 5);
    expect(masterVolume).toBeCloseTo(0.8, 5);

    manager.dispose();
    restoreDataset();
  });

  it('switches presets, persists selection, and updates audio base volume', () => {
    const bloomPass: BloomPassLike = {
      enabled: true,
      strength: 2,
      radius: 1,
      threshold: 0.7,
    };
    const baseline = () => {
      bloomPass.enabled = true;
      bloomPass.strength = 2;
      bloomPass.radius = 1;
      bloomPass.threshold = 0.7;
    };
    const graphicsManager = createStubGraphicsQualityManager(baseline);

    let masterVolume = 0.5;
    const ambientAudio = {
      getMasterVolume: () => masterVolume,
      setMasterVolume: (value: number) => {
        masterVolume = value;
      },
    };

    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };

    const manager = createAccessibilityPresetManager({
      documentElement: document.documentElement,
      graphicsQualityManager: graphicsManager,
      bloomPass,
      ambientAudioController: ambientAudio,
      storage,
    });

    expect(manager.getBaseAudioVolume()).toBeCloseTo(0.5, 5);

    const listener = vi.fn();
    manager.onChange(listener);

    manager.setPreset('photosensitive');
    expect(listener).toHaveBeenCalledWith('photosensitive');
    expect(storage.setItem).toHaveBeenCalledWith(
      'danielsmith:accessibility-preset',
      'photosensitive'
    );
    expect(document.documentElement.dataset.accessibilityContrast).toBe('high');
    expect(bloomPass.enabled).toBe(false);
    expect(masterVolume).toBeCloseTo(0.35, 5);

    manager.setBaseAudioVolume(0.9);
    expect(manager.getBaseAudioVolume()).toBeCloseTo(0.9, 5);
    expect(masterVolume).toBeCloseTo(0.63, 5);

    manager.dispose();
    restoreDataset();
  });

  it('handles storage failures and re-applies on quality changes', () => {
    const bloomPass: BloomPassLike = {
      enabled: true,
      strength: 1,
      radius: 1,
      threshold: 0.5,
    };
    const baseline = () => {
      bloomPass.enabled = true;
      bloomPass.strength = 1;
      bloomPass.radius = 1;
      bloomPass.threshold = 0.5;
    };
    const graphicsManager = createStubGraphicsQualityManager(baseline);

    let qualityListener:
      | ((level: GraphicsQualityLevel) => void)
      | undefined;
    const onChangeSpy = vi
      .spyOn(graphicsManager, 'onChange')
      .mockImplementation((listener: (level: GraphicsQualityLevel) => void) => {
        qualityListener = listener;
        return () => {
          qualityListener = undefined;
        };
      });

    const storage = {
      getItem: vi.fn(() => {
        throw new Error('denied');
      }),
      setItem: vi.fn(() => {
        throw new Error('boom');
      }),
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const manager = createAccessibilityPresetManager({
      documentElement: document.documentElement,
      graphicsQualityManager: graphicsManager,
      bloomPass,
      storage,
    });

    manager.setPreset('calm');
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist accessibility preset:',
      expect.any(Error)
    );

    qualityListener?.('cinematic');
    expect(bloomPass.strength).toBeCloseTo(0.6, 5);

    manager.dispose();
    onChangeSpy.mockRestore();
    warnSpy.mockRestore();
    restoreDataset();
  });
});
