import { describe, expect, it, vi } from 'vitest';

import type {
  BloomPassLike,
  GraphicsQualityLevel,
  GraphicsQualityManager,
  LedLightLike,
  LedMaterialLike,
} from '../scene/graphics/qualityManager';
import { createAccessibilityPresetManager } from '../ui/accessibility/presetManager';

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
    delete document.documentElement.dataset.accessibilityPulseScale;
    delete document.documentElement.dataset.accessibilityFlickerScale;
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
    expect(document.documentElement.dataset.accessibilityPulseScale).toBe(
      '0.65'
    );
    expect(document.documentElement.dataset.accessibilityFlickerScale).toBe(
      '0.55'
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
      JSON.stringify({ presetId: 'photosensitive', baseAudioVolume: 0.5 })
    );
    expect(document.documentElement.dataset.accessibilityContrast).toBe('high');
    expect(document.documentElement.dataset.accessibilityPulseScale).toBe('0');
    expect(document.documentElement.dataset.accessibilityFlickerScale).toBe(
      '0'
    );
    expect(bloomPass.enabled).toBe(false);
    expect(masterVolume).toBeCloseTo(0.35, 5);

    storage.setItem.mockClear();

    manager.setBaseAudioVolume(0.9);
    expect(manager.getBaseAudioVolume()).toBeCloseTo(0.9, 5);
    expect(masterVolume).toBeCloseTo(0.63, 5);
    expect(storage.setItem).toHaveBeenCalledWith(
      'danielsmith:accessibility-preset',
      JSON.stringify({ presetId: 'photosensitive', baseAudioVolume: 0.9 })
    );

    manager.dispose();
    restoreDataset();
  });

  it('enables the high-contrast preset while keeping motion assists active', () => {
    const bloomPass: BloomPassLike = {
      enabled: true,
      strength: 1.2,
      radius: 0.95,
      threshold: 0.65,
    };
    const ledMaterial: LedMaterialLike = { emissiveIntensity: 0.8 };
    const ledLight: LedLightLike = { intensity: 0.9 };

    const baseline = () => {
      bloomPass.enabled = true;
      bloomPass.strength = 1.2;
      bloomPass.radius = 0.95;
      bloomPass.threshold = 0.65;
      ledMaterial.emissiveIntensity = 0.8;
      ledLight.intensity = 0.9;
    };

    const graphicsManager = createStubGraphicsQualityManager(baseline);

    let masterVolume = 0.7;
    const ambientAudio = {
      getMasterVolume: () => masterVolume,
      setMasterVolume: (value: number) => {
        masterVolume = value;
      },
    };

    const manager = createAccessibilityPresetManager({
      documentElement: document.documentElement,
      graphicsQualityManager: graphicsManager,
      bloomPass,
      ledStripMaterials: [ledMaterial],
      ledFillLights: [ledLight],
      ambientAudioController: ambientAudio,
    });

    manager.setPreset('high-contrast');

    expect(document.documentElement.dataset.accessibilityPreset).toBe(
      'high-contrast'
    );
    expect(document.documentElement.dataset.accessibilityMotion).toBe(
      'default'
    );
    expect(document.documentElement.dataset.accessibilityContrast).toBe('high');
    expect(document.documentElement.dataset.accessibilityPulseScale).toBe('1');
    expect(document.documentElement.dataset.accessibilityFlickerScale).toBe(
      '1'
    );
    expect(bloomPass.enabled).toBe(true);
    expect(bloomPass.strength).toBeCloseTo(1.32, 5);
    expect(bloomPass.radius).toBeCloseTo(0.95, 5);
    expect(bloomPass.threshold).toBeCloseTo(0.63, 5);
    expect(ledMaterial.emissiveIntensity).toBeCloseTo(0.92, 5);
    expect(ledLight.intensity).toBeCloseTo(0.99, 5);
    expect(masterVolume).toBeCloseTo(0.7, 5);

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

    let qualityListener: ((level: GraphicsQualityLevel) => void) | undefined;
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

  it('restores persisted base audio volume payloads and clamps values', () => {
    const bloomPass: BloomPassLike = {
      enabled: true,
      strength: 1.2,
      radius: 0.9,
      threshold: 0.6,
    };
    const baseline = () => {
      bloomPass.enabled = true;
      bloomPass.strength = 1.2;
      bloomPass.radius = 0.9;
      bloomPass.threshold = 0.6;
    };
    const graphicsManager = createStubGraphicsQualityManager(baseline);

    let masterVolume = 0.4;
    const ambientAudio = {
      getMasterVolume: () => masterVolume,
      setMasterVolume: (value: number) => {
        masterVolume = value;
      },
    };

    const storage = {
      getItem: vi.fn(() =>
        JSON.stringify({ presetId: 'calm', baseAudioVolume: 1.75 })
      ),
      setItem: vi.fn(),
    };

    const manager = createAccessibilityPresetManager({
      documentElement: document.documentElement,
      graphicsQualityManager: graphicsManager,
      bloomPass,
      ambientAudioController: ambientAudio,
      storage,
    });

    expect(manager.getPreset()).toBe('calm');
    expect(manager.getBaseAudioVolume()).toBeCloseTo(1, 5);
    expect(masterVolume).toBeCloseTo(0.8, 5);

    manager.dispose();
    restoreDataset();
  });

  it('clamps persisted base audio volume below zero to zero', () => {
    const bloomPass: BloomPassLike = {
      enabled: true,
      strength: 1.1,
      radius: 0.95,
      threshold: 0.62,
    };
    const baseline = () => {
      bloomPass.enabled = true;
      bloomPass.strength = 1.1;
      bloomPass.radius = 0.95;
      bloomPass.threshold = 0.62;
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
      getItem: vi.fn(() =>
        JSON.stringify({ presetId: 'calm', baseAudioVolume: -0.4 })
      ),
      setItem: vi.fn(),
    };

    const manager = createAccessibilityPresetManager({
      documentElement: document.documentElement,
      graphicsQualityManager: graphicsManager,
      bloomPass,
      ambientAudioController: ambientAudio,
      storage,
    });

    expect(manager.getBaseAudioVolume()).toBeCloseTo(0, 5);
    expect(masterVolume).toBeCloseTo(0, 5);

    manager.dispose();
    restoreDataset();
  });
});
