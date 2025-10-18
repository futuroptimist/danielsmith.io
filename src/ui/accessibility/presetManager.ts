import type { MotionBlurController } from '../../scene/graphics/motionBlurController';
import type {
  BloomPassLike,
  GraphicsQualityManager,
  LedLightLike,
  LedMaterialLike,
} from '../../scene/graphics/qualityManager';
import type { AmbientAudioController } from '../../systems/audio/ambientAudio';

export type AccessibilityPresetId =
  | 'standard'
  | 'calm'
  | 'high-contrast'
  | 'photosensitive';

type MotionSetting = 'default' | 'reduced';
type ContrastSetting = 'standard' | 'high';

type BooleanLike = boolean | undefined;

export interface AccessibilityPresetDefinition {
  readonly id: AccessibilityPresetId;
  readonly label: string;
  readonly description: string;
  readonly motion: MotionSetting;
  readonly contrast: ContrastSetting;
  readonly animation: {
    readonly pulseScale: number;
    readonly flickerScale: number;
  };
  readonly motionBlur: {
    readonly intensity: number;
  };
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
    animation: {
      pulseScale: 1,
      flickerScale: 1,
    },
    motionBlur: {
      intensity: 0.6,
    },
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
    animation: {
      pulseScale: 0.65,
      flickerScale: 0.55,
    },
    motionBlur: {
      intensity: 0.25,
    },
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
    id: 'high-contrast',
    label: 'High contrast',
    description: 'Boosts HUD readability while keeping motion cues active.',
    motion: 'default',
    contrast: 'high',
    animation: {
      pulseScale: 1,
      flickerScale: 1,
    },
    motionBlur: {
      intensity: 0.6,
    },
    bloom: {
      strengthScale: 1.1,
      radiusScale: 1,
      thresholdOffset: -0.02,
    },
    led: {
      emissiveScale: 1.15,
      lightScale: 1.1,
    },
    audio: {
      volumeScale: 1,
    },
  },
  {
    id: 'photosensitive',
    label: 'Photosensitive safe',
    description: 'Disables bloom, dulls emissives, and boosts HUD contrast.',
    motion: 'reduced',
    contrast: 'high',
    animation: {
      pulseScale: 0,
      flickerScale: 0,
    },
    motionBlur: {
      intensity: 0,
    },
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

interface AccessibilityPresetStoragePayload {
  readonly presetId?: AccessibilityPresetId;
  readonly baseAudioVolume?: number;
  readonly baseMotionBlurIntensity?: number;
}

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
  motionBlurController?: MotionBlurController | null;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
}

export interface AccessibilityPresetManager {
  getPreset(): AccessibilityPresetId;
  setPreset(preset: AccessibilityPresetId): void;
  refresh(): void;
  getBaseAudioVolume(): number;
  setBaseAudioVolume(volume: number): void;
  getBaseMotionBlurIntensity(): number;
  setBaseMotionBlurIntensity(intensity: number): void;
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

function parseStoredPayload(
  raw: string | null
): AccessibilityPresetStoragePayload {
  if (!raw) {
    return {};
  }

  if (isAccessibilityPresetId(raw)) {
    return { presetId: raw };
  }

  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }

  const payload = parsed as {
    presetId?: unknown;
    baseAudioVolume?: unknown;
    baseMotionBlurIntensity?: unknown;
  };

  return {
    presetId: isAccessibilityPresetId(payload.presetId)
      ? payload.presetId
      : undefined,
    baseAudioVolume:
      typeof payload.baseAudioVolume === 'number' &&
      Number.isFinite(payload.baseAudioVolume)
        ? payload.baseAudioVolume
        : undefined,
    baseMotionBlurIntensity:
      typeof payload.baseMotionBlurIntensity === 'number' &&
      Number.isFinite(payload.baseMotionBlurIntensity)
        ? payload.baseMotionBlurIntensity
        : undefined,
  } satisfies AccessibilityPresetStoragePayload;
}

function clampPersistedVolume(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function clampPersistedRatio(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

export function createAccessibilityPresetManager({
  documentElement,
  graphicsQualityManager,
  bloomPass,
  ledStripMaterials,
  ledFillLights,
  ambientAudioController,
  motionBlurController,
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
}: AccessibilityPresetManagerOptions): AccessibilityPresetManager {
  const ledMaterials = ledStripMaterials ? Array.from(ledStripMaterials) : [];
  const ledLights = ledFillLights ? Array.from(ledFillLights) : [];

  let baseAudioVolume = clamp01(
    ambientAudioController?.getMasterVolume?.() ?? 1
  );
  let baseMotionBlurIntensity = 1;
  let presetId: AccessibilityPresetId = 'standard';

  if (storage?.getItem) {
    try {
      const stored = parseStoredPayload(storage.getItem(storageKey));
      if (stored.presetId) {
        presetId = stored.presetId;
      }
      const storedVolume = clampPersistedVolume(stored.baseAudioVolume);
      if (typeof storedVolume === 'number') {
        baseAudioVolume = storedVolume;
      }
      const storedMotionBlur = clampPersistedRatio(
        stored.baseMotionBlurIntensity
      );
      if (typeof storedMotionBlur === 'number') {
        baseMotionBlurIntensity = storedMotionBlur;
      }
    } catch (error) {
      console.warn('Failed to read persisted accessibility preset:', error);
    }
  }

  const listeners = new Set<(preset: AccessibilityPresetId) => void>();

  const resolveMotionBlurIntensity = (
    definition: AccessibilityPresetDefinition
  ) => clamp01(definition.motionBlur.intensity * baseMotionBlurIntensity);

  const applyDocumentAttributes = (
    definition: AccessibilityPresetDefinition
  ) => {
    documentElement.dataset.accessibilityPreset = definition.id;
    documentElement.dataset.accessibilityMotion =
      definition.motion === 'reduced' ? 'reduced' : 'default';
    documentElement.dataset.accessibilityContrast =
      definition.contrast === 'high' ? 'high' : 'standard';
    documentElement.dataset.accessibilityPulseScale = String(
      definition.animation.pulseScale
    );
    documentElement.dataset.accessibilityFlickerScale = String(
      definition.animation.flickerScale
    );
    documentElement.dataset.accessibilityMotionBlur = String(
      resolveMotionBlurIntensity(definition)
    );
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

  const applyMotionBlur = (definition: AccessibilityPresetDefinition) => {
    motionBlurController?.setIntensity(resolveMotionBlurIntensity(definition));
  };

  const applyPreset = (definition: AccessibilityPresetDefinition) => {
    applyDocumentAttributes(definition);
    applyBloomAndLighting(definition);
    applyAudio(definition);
    applyMotionBlur(definition);
  };

  const persistState = () => {
    if (!storage?.setItem) {
      return;
    }
    try {
      const payload: Required<AccessibilityPresetStoragePayload> = {
        presetId,
        baseAudioVolume,
        baseMotionBlurIntensity,
      };
      storage.setItem(storageKey, JSON.stringify(payload));
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
        persistState();
        applyPreset(currentDefinition());
        return;
      }
      presetId = id;
      persistState();
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
      persistState();
    },
    getBaseMotionBlurIntensity() {
      return baseMotionBlurIntensity;
    },
    setBaseMotionBlurIntensity(intensity) {
      const clamped = clamp01(intensity);
      if (clamped === baseMotionBlurIntensity) {
        return;
      }
      baseMotionBlurIntensity = clamped;
      applyDocumentAttributes(currentDefinition());
      applyMotionBlur(currentDefinition());
      persistState();
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
