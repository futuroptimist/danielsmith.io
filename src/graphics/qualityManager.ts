export type GraphicsQualityLevel = 'cinematic' | 'balanced' | 'performance';

export interface GraphicsQualityPresetDefinition {
  id: GraphicsQualityLevel;
  label: string;
  description: string;
  pixelRatioScale: number;
  exposure: number;
  bloom: {
    enabled: boolean;
    strengthScale: number;
    radiusScale: number;
    thresholdOffset: number;
  };
  led: {
    emissiveScale: number;
    lightScale: number;
  };
}

export const GRAPHICS_QUALITY_PRESETS: readonly GraphicsQualityPresetDefinition[] = [
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Full post-processing with cinematic bloom and lighting.',
    pixelRatioScale: 1,
    exposure: 1.1,
    bloom: {
      enabled: true,
      strengthScale: 1,
      radiusScale: 1,
      thresholdOffset: 0,
    },
    led: {
      emissiveScale: 1,
      lightScale: 1,
    },
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Moderate bloom with slightly reduced resolution for laptops.',
    pixelRatioScale: 0.85,
    exposure: 1.02,
    bloom: {
      enabled: true,
      strengthScale: 0.8,
      radiusScale: 0.92,
      thresholdOffset: 0.05,
    },
    led: {
      emissiveScale: 0.85,
      lightScale: 0.85,
    },
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Disables bloom and lowers resolution to prioritize FPS.',
    pixelRatioScale: 0.7,
    exposure: 0.96,
    bloom: {
      enabled: false,
      strengthScale: 0,
      radiusScale: 0.8,
      thresholdOffset: 0.12,
    },
    led: {
      emissiveScale: 0.65,
      lightScale: 0.6,
    },
  },
] as const;

export interface RendererLike {
  getPixelRatio(): number;
  setPixelRatio(value: number): void;
  toneMappingExposure: number;
}

export interface BloomPassLike {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold: number;
}

export interface LedMaterialLike {
  emissiveIntensity: number;
}

export interface LedLightLike {
  intensity: number;
}

export interface GraphicsQualityManagerOptions {
  renderer: RendererLike;
  bloomPass?: BloomPassLike | null;
  ledStripMaterials?: Iterable<LedMaterialLike>;
  ledFillLights?: Iterable<LedLightLike>;
  basePixelRatio: number;
  baseBloom: {
    strength: number;
    radius: number;
    threshold: number;
  };
  baseLed: {
    emissiveIntensity: number;
    lightIntensity: number;
  };
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
}

export interface GraphicsQualityManager {
  getLevel(): GraphicsQualityLevel;
  setLevel(level: GraphicsQualityLevel): void;
  refresh(): void;
  setBasePixelRatio(pixelRatio: number): void;
  onChange(listener: (level: GraphicsQualityLevel) => void): () => void;
}

const DEFAULT_STORAGE_KEY = 'danielsmith:graphics-quality-level';

function isGraphicsQualityLevel(value: unknown): value is GraphicsQualityLevel {
  return (
    typeof value === 'string' &&
    GRAPHICS_QUALITY_PRESETS.some((preset) => preset.id === value)
  );
}

interface LedMaterialEntry {
  target: LedMaterialLike;
  baseIntensity: number;
}

interface LedLightEntry {
  target: LedLightLike;
  baseIntensity: number;
}

export function createGraphicsQualityManager({
  renderer,
  bloomPass,
  ledStripMaterials,
  ledFillLights,
  basePixelRatio,
  baseBloom,
  baseLed,
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
}: GraphicsQualityManagerOptions): GraphicsQualityManager {
  let currentBasePixelRatio = sanitizePixelRatio(basePixelRatio);
  const ledMaterialEntries: LedMaterialEntry[] = ledStripMaterials
    ? Array.from(ledStripMaterials, (material) => ({
        target: material,
        baseIntensity: Number.isFinite(material.emissiveIntensity)
          ? material.emissiveIntensity
          : baseLed.emissiveIntensity,
      }))
    : [];
  const ledLightEntries: LedLightEntry[] = ledFillLights
    ? Array.from(ledFillLights, (light) => ({
        target: light,
        baseIntensity: Number.isFinite(light.intensity)
          ? light.intensity
          : baseLed.lightIntensity,
      }))
    : [];

  const listeners = new Set<(level: GraphicsQualityLevel) => void>();

  let currentLevel: GraphicsQualityLevel = 'cinematic';
  if (storage?.getItem) {
    try {
      const stored = storage.getItem(storageKey);
      if (isGraphicsQualityLevel(stored)) {
        currentLevel = stored;
      }
    } catch (error) {
      console.warn('Failed to read persisted graphics quality level:', error);
    }
  }

  applyPreset(currentLevel);

  function sanitizePixelRatio(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      return 1;
    }
    return Math.max(0.5, Math.min(value, 3));
  }

  function applyPreset(level: GraphicsQualityLevel) {
    const preset = GRAPHICS_QUALITY_PRESETS.find(
      (definition) => definition.id === level
    );
    if (!preset) {
      throw new Error(`Unknown graphics quality preset: ${level}`);
    }

    const scaledPixelRatio = sanitizePixelRatio(
      currentBasePixelRatio * preset.pixelRatioScale
    );
    renderer.setPixelRatio(scaledPixelRatio);
    renderer.toneMappingExposure = preset.exposure;

    if (bloomPass) {
      bloomPass.enabled = preset.bloom.enabled;
      bloomPass.strength = baseBloom.strength * preset.bloom.strengthScale;
      bloomPass.radius = baseBloom.radius * preset.bloom.radiusScale;
      bloomPass.threshold =
        baseBloom.threshold + preset.bloom.thresholdOffset;
    }

    ledMaterialEntries.forEach(({ target, baseIntensity }) => {
      target.emissiveIntensity = baseIntensity * preset.led.emissiveScale;
    });

    ledLightEntries.forEach(({ target, baseIntensity }) => {
      target.intensity = baseIntensity * preset.led.lightScale;
    });
  }

  function persist(level: GraphicsQualityLevel) {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(storageKey, level);
    } catch (error) {
      console.warn('Failed to persist graphics quality level:', error);
    }
  }

  function notify() {
    listeners.forEach((listener) => listener(currentLevel));
  }

  return {
    getLevel() {
      return currentLevel;
    },
    setLevel(level) {
      if (!isGraphicsQualityLevel(level)) {
        throw new Error(`Unsupported graphics quality level: ${level}`);
      }
      if (level === currentLevel) {
        persist(level);
        return;
      }
      currentLevel = level;
      persist(level);
      applyPreset(level);
      notify();
    },
    refresh() {
      applyPreset(currentLevel);
    },
    setBasePixelRatio(pixelRatio: number) {
      currentBasePixelRatio = sanitizePixelRatio(pixelRatio);
      applyPreset(currentLevel);
    },
    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
