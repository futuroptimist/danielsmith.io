import type { AmbientAudioController } from '../audio/ambientAudio';
import type {
  BloomPassLike,
  GraphicsQualityManager,
  LedLightLike,
  LedMaterialLike,
} from '../graphics/qualityManager';

export type AccessibilityPresetId = 'standard' | 'calm' | 'photosensitive';

type MotionSetting = 'default' | 'reduced';
type ContrastSetting = 'standard' | 'high';

type BooleanLike = boolean | undefined;

export interface AccessibilityPresetDefinition {
  readonly id: AccessibilityPresetId;
  readonly label: string;
  readonly description: string;
  readonly motion: MotionSetting;
  readonly contrast: ContrastSetting;
  readonly bloom: {
    readonly enabled?: BooleanLike;
    readonly strengthScale: number;
    readonly radiusScale: number;
    readonly thresholdOffset: number;
  };
  readonly led: {
    readonly emissiveScale: number;
    readonly lightScale: number;
  };
  readonly audio: {
    readonly volumeScale: number;
  };
}

export const ACCESSIBILITY_PRESETS: readonly AccessibilityPresetDefinition[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Default visuals and audio balance.',
    motion: 'default',
    contrast: 'standard',
    bloom: {
      strengthScale: 1,
      radiusScale: 1,
      thresholdOffset: 0,
    },
    led: {
      emissiveScale: 1,
      lightScale: 1,
    },
    audio: {
      volumeScale: 1,
    },
  },
  {
    id: 'calm',
    label: 'Calm',
    description:
      'Softens bloom, LED glow, and ambient audio for a gentler pass.',
    motion: 'reduced',
    contrast: 'standard',
    bloom: {
      strengthScale: 0.6,
      radiusScale: 0.9,
      thresholdOffset: 0.02,
    },
    led: {
      emissiveScale: 0.75,
      lightScale: 0.8,
    },
    audio: {
      volumeScale: 0.8,
    },
  },
  {
    id: 'photosensitive',
    label: 'Photosensitive safe',
    description: 'Disables bloom, dulls emissives, and boosts HUD contrast.',
    motion: 'reduced',
    contrast: 'high',
    bloom: {
      enabled: false,
      strengthScale: 0,
      radiusScale: 1,
      thresholdOffset: 0.05,
    },
    led: {
      emissiveScale: 0.55,
      lightScale: 0.6,
    },
    audio: {
      volumeScale: 0.7,
    },
  },
] as const;

const ACCESSIBILITY_PRESET_MAP = new Map(
  ACCESSIBILITY_PRESETS.map((preset) => [preset.id, preset])
);

const DEFAULT_STORAGE_KEY = 'danielsmith:accessibility-preset';

interface GraphicsQualityManagerLike
  extends Pick<GraphicsQualityManager, 'refresh' | 'onChange' | 'getLevel'> {}

interface AmbientAudioControllerLike
  extends Pick<AmbientAudioController, 'setMasterVolume' | 'getMasterVolume'> {}

export interface AccessibilityPresetManagerOptions {
  documentElement: HTMLElement;
  graphicsQualityManager: GraphicsQualityManagerLike;
  bloomPass?: BloomPassLike | null;
  ledStripMaterials?: Iterable<LedMaterialLike>;
  ledFillLights?: Iterable<LedLightLike>;
  ambientAudioController?: AmbientAudioControllerLike | null;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
}

export interface AccessibilityPresetManager {
  getPreset(): AccessibilityPresetId;
  setPreset(preset: AccessibilityPresetId): void;
  refresh(): void;
  getBaseAudioVolume(): number;
  setBaseAudioVolume(volume: number): void;
  onChange(listener: (preset: AccessibilityPresetId) => void): () => void;
  dispose(): void;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function isAccessibilityPresetId(
  value: unknown
): value is AccessibilityPresetId {
  return (
    typeof value === 'string' && ACCESSIBILITY_PRESET_MAP.has(value as never)
  );
}

export function createAccessibilityPresetManager({
  documentElement,
  graphicsQualityManager,
  bloomPass,
  ledStripMaterials,
  ledFillLights,
  ambientAudioController,
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
}: AccessibilityPresetManagerOptions): AccessibilityPresetManager {
  const ledMaterials = ledStripMaterials ? Array.from(ledStripMaterials) : [];
  const ledLights = ledFillLights ? Array.from(ledFillLights) : [];

  let baseAudioVolume = clamp01(
    ambientAudioController?.getMasterVolume?.() ?? 1
  );
  let presetId: AccessibilityPresetId = 'standard';

  if (storage?.getItem) {
    try {
      const stored = storage.getItem(storageKey);
      if (isAccessibilityPresetId(stored)) {
        presetId = stored;
      }
    } catch (error) {
      console.warn('Failed to read persisted accessibility preset:', error);
    }
  }

  const listeners = new Set<(preset: AccessibilityPresetId) => void>();

  const applyDocumentAttributes = (
    definition: AccessibilityPresetDefinition
  ) => {
    documentElement.dataset.accessibilityPreset = definition.id;
    documentElement.dataset.accessibilityMotion =
      definition.motion === 'reduced' ? 'reduced' : 'default';
    documentElement.dataset.accessibilityContrast =
      definition.contrast === 'high' ? 'high' : 'standard';
  };

  const applyBloomAndLighting = (definition: AccessibilityPresetDefinition) => {
    graphicsQualityManager.refresh();

    if (bloomPass) {
      if (typeof definition.bloom.enabled === 'boolean') {
        bloomPass.enabled = definition.bloom.enabled;
      }
      if (bloomPass.enabled) {
        bloomPass.strength *= definition.bloom.strengthScale;
        bloomPass.radius *= definition.bloom.radiusScale;
        bloomPass.threshold += definition.bloom.thresholdOffset;
      }
    }

    if (ledMaterials.length) {
      for (const material of ledMaterials) {
        if (Number.isFinite(material.emissiveIntensity)) {
          material.emissiveIntensity *= definition.led.emissiveScale;
        }
      }
    }

    if (ledLights.length) {
      for (const light of ledLights) {
        if (Number.isFinite(light.intensity)) {
          light.intensity *= definition.led.lightScale;
        }
      }
    }
  };

  const applyAudio = (definition: AccessibilityPresetDefinition) => {
    if (!ambientAudioController) {
      return;
    }
    const effectiveVolume = clamp01(
      baseAudioVolume * definition.audio.volumeScale
    );
    ambientAudioController.setMasterVolume(effectiveVolume);
  };

  const applyPreset = (definition: AccessibilityPresetDefinition) => {
    applyDocumentAttributes(definition);
    applyBloomAndLighting(definition);
    applyAudio(definition);
  };

  const persist = (id: AccessibilityPresetId) => {
    if (!storage?.setItem) {
      return;
    }
    try {
      storage.setItem(storageKey, id);
    } catch (error) {
      console.warn('Failed to persist accessibility preset:', error);
    }
  };

  const notify = () => {
    listeners.forEach((listener) => listener(presetId));
  };

  const getDefinition = (
    id: AccessibilityPresetId
  ): AccessibilityPresetDefinition => {
    const definition = ACCESSIBILITY_PRESET_MAP.get(id);
    if (!definition) {
      throw new Error(`Unknown accessibility preset: ${id}`);
    }
    return definition;
  };

  const currentDefinition = () => getDefinition(presetId);

  const qualityUnsubscribe = graphicsQualityManager.onChange(() => {
    applyPreset(currentDefinition());
  });

  applyPreset(currentDefinition());

  return {
    getPreset() {
      return presetId;
    },
    setPreset(id) {
      if (!isAccessibilityPresetId(id)) {
        throw new Error(`Unsupported accessibility preset: ${id}`);
      }
      if (presetId === id) {
        persist(id);
        applyPreset(currentDefinition());
        return;
      }
      presetId = id;
      persist(id);
      applyPreset(currentDefinition());
      notify();
    },
    refresh() {
      applyPreset(currentDefinition());
    },
    getBaseAudioVolume() {
      return baseAudioVolume;
    },
    setBaseAudioVolume(volume) {
      const clamped = clamp01(volume);
      if (clamped === baseAudioVolume) {
        return;
      }
      baseAudioVolume = clamped;
      applyAudio(currentDefinition());
    },
    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      qualityUnsubscribe?.();
      listeners.clear();
    },
  };
}
