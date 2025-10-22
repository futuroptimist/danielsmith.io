import {
  type AvatarAccessoryId,
  type AvatarAccessoryState,
  type AvatarAccessorySuite,
} from './accessories';
import {
  type AvatarAccessoryPresetDefinition,
  type AvatarAccessoryPresetId,
} from './accessoryPresets';
import type { PortfolioMannequinPalette } from './mannequin';

export interface AvatarAccessoryManagerOptions {
  readonly suite: AvatarAccessorySuite;
  readonly storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  readonly storageKey?: string;
  readonly initialState?: Partial<Record<AvatarAccessoryId, boolean>>;
  readonly initialPalette?: PortfolioMannequinPalette;
  readonly presets?: readonly AvatarAccessoryPresetDefinition[];
}

export interface AvatarAccessoryManager {
  getState(): AvatarAccessoryState[];
  isEnabled(id: AvatarAccessoryId): boolean;
  setEnabled(id: AvatarAccessoryId, enabled: boolean): void;
  toggle(id: AvatarAccessoryId): void;
  refresh(): void;
  onChange(listener: (state: AvatarAccessoryState[]) => void): () => void;
  applyPalette(palette: PortfolioMannequinPalette): void;
  listPresets(): AvatarAccessoryPresetSnapshot[];
  isPresetUnlocked(id: AvatarAccessoryPresetId): boolean;
  unlockPreset(id: AvatarAccessoryPresetId): boolean;
  lockPreset(id: AvatarAccessoryPresetId): boolean;
  applyPreset(id: AvatarAccessoryPresetId): void;
  onPresetChange(
    listener: (presets: AvatarAccessoryPresetSnapshot[]) => void
  ): () => void;
}

const DEFAULT_STORAGE_KEY = 'danielsmith:avatar-accessories';

type StoredState = Partial<Record<AvatarAccessoryId, boolean>>;

type StoredPresetState = Partial<Record<AvatarAccessoryPresetId, boolean>>;

interface StoredPayload {
  accessories: StoredState;
  unlockedPresets: StoredPresetState;
}

export interface AvatarAccessoryPresetSnapshot {
  readonly id: AvatarAccessoryPresetId;
  readonly label: string;
  readonly description: string;
  readonly accessories: Partial<Record<AvatarAccessoryId, boolean>>;
  readonly unlocked: boolean;
  readonly applied: boolean;
}

function parseBooleanRecord<T extends string>(
  value: unknown,
  validIds: Set<T>
): Partial<Record<T, boolean>> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const result: Partial<Record<T, boolean>> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (validIds.has(key as T) && typeof entry === 'boolean') {
      result[key as T] = entry;
    }
  }
  return result;
}

function parseStoredPayload(
  raw: string | null,
  validAccessoryIds: Set<AvatarAccessoryId>,
  validPresetIds: Set<AvatarAccessoryPresetId>
): StoredPayload {
  if (!raw) {
    return { accessories: {}, unlockedPresets: {} };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'accessories' in parsed) {
      const payload = parsed as {
        accessories?: unknown;
        unlockedPresets?: unknown;
      };
      return {
        accessories: parseBooleanRecord(payload.accessories, validAccessoryIds),
        unlockedPresets: parseBooleanRecord(
          payload.unlockedPresets,
          validPresetIds
        ),
      };
    }
    return {
      accessories: parseBooleanRecord(parsed, validAccessoryIds),
      unlockedPresets: {},
    };
  } catch (error) {
    console.warn('Failed to parse stored avatar accessory state:', error);
    return { accessories: {}, unlockedPresets: {} };
  }
}

function serializeState(payload: StoredPayload): string {
  return JSON.stringify(payload);
}

export function createAvatarAccessoryManager({
  suite,
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
  initialState = {},
  initialPalette,
  presets = [],
}: AvatarAccessoryManagerOptions): AvatarAccessoryManager {
  const listeners = new Set<(state: AvatarAccessoryState[]) => void>();
  const presetListeners = new Set<
    (presets: AvatarAccessoryPresetSnapshot[]) => void
  >();
  const definitions = suite.definitions;
  const validIds = new Set<AvatarAccessoryId>(
    definitions.map((definition) => definition.id)
  );

  const presetDefinitions = Array.from(presets);
  const presetValidIds = new Set<AvatarAccessoryPresetId>();
  presetDefinitions.forEach((preset) => {
    if (presetValidIds.has(preset.id)) {
      throw new Error(`Duplicate avatar accessory preset: ${preset.id}`);
    }
    presetValidIds.add(preset.id);
    for (const key of Object.keys(preset.accessories)) {
      if (!validIds.has(key as AvatarAccessoryId)) {
        throw new Error(
          `Preset ${preset.id} references unknown accessory: ${key}`
        );
      }
    }
  });

  let storedPayload: StoredPayload = { accessories: {}, unlockedPresets: {} };
  if (storage?.getItem) {
    try {
      const raw = storage.getItem(storageKey);
      storedPayload = parseStoredPayload(raw, validIds, presetValidIds);
    } catch (error) {
      console.warn('Failed to read avatar accessory state from storage:', error);
    }
  }

  const defaultUnlocked: StoredPresetState = {};
  presetDefinitions.forEach((preset) => {
    if (preset.unlockedByDefault) {
      defaultUnlocked[preset.id] = true;
    }
  });

  const state: StoredState = { ...initialState, ...storedPayload.accessories };
  const unlockedPresets: StoredPresetState = {
    ...defaultUnlocked,
    ...storedPayload.unlockedPresets,
  };

  const presetDefinitionById = new Map(
    presetDefinitions.map((preset) => [preset.id, preset])
  );

  const buildPresetSnapshots = (): AvatarAccessoryPresetSnapshot[] => {
    return presetDefinitions.map((preset) => {
      const unlocked = Boolean(unlockedPresets[preset.id]);
      const applied = definitions.every((definition) => {
        const target = preset.accessories[definition.id] ?? false;
        return Boolean(state[definition.id]) === Boolean(target);
      });
      return {
        id: preset.id,
        label: preset.label,
        description: preset.description,
        accessories: { ...preset.accessories },
        unlocked,
        applied,
      } satisfies AvatarAccessoryPresetSnapshot;
    });
  };

  const applyStateToSuite = () => {
    definitions.forEach((definition) => {
      const enabled = Boolean(state[definition.id]);
      suite.setEnabled(definition.id, enabled);
    });
  };

  const notify = () => {
    const snapshot = suite.getState();
    listeners.forEach((listener) => listener(snapshot));
  };

  const notifyPresets = () => {
    if (!presetListeners.size) {
      return;
    }
    const snapshot = buildPresetSnapshots();
    presetListeners.forEach((listener) => listener(snapshot));
  };

  const persist = () => {
    if (!storage?.setItem) {
      return;
    }
    try {
      const payload: StoredPayload = {
        accessories: {},
        unlockedPresets: {},
      };
      definitions.forEach((definition) => {
        payload.accessories[definition.id] = Boolean(state[definition.id]);
      });
      presetDefinitions.forEach((preset) => {
        payload.unlockedPresets[preset.id] = Boolean(
          unlockedPresets[preset.id]
        );
      });
      storage.setItem(storageKey, serializeState(payload));
    } catch (error) {
      console.warn('Failed to persist avatar accessory state:', error);
    }
  };

  applyStateToSuite();
  if (initialPalette) {
    suite.applyPalette(initialPalette);
  }

  return {
    getState() {
      return suite.getState();
    },
    isEnabled(id) {
      if (!validIds.has(id)) {
        throw new Error(`Unknown avatar accessory: ${id}`);
      }
      return Boolean(state[id]);
    },
    setEnabled(id, enabled) {
      if (!validIds.has(id)) {
        throw new Error(`Unknown avatar accessory: ${id}`);
      }
      state[id] = enabled;
      suite.setEnabled(id, enabled);
      persist();
      notify();
      notifyPresets();
    },
    toggle(id) {
      if (!validIds.has(id)) {
        throw new Error(`Unknown avatar accessory: ${id}`);
      }
      const current = Boolean(state[id]);
      const next = !current;
      state[id] = next;
      suite.setEnabled(id, next);
      persist();
      notify();
      notifyPresets();
    },
    refresh() {
      applyStateToSuite();
      notify();
      notifyPresets();
    },
    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    applyPalette(palette) {
      suite.applyPalette(palette);
    },
    listPresets() {
      return buildPresetSnapshots();
    },
    isPresetUnlocked(id) {
      if (!presetValidIds.has(id)) {
        throw new Error(`Unknown avatar accessory preset: ${id}`);
      }
      return Boolean(unlockedPresets[id]);
    },
    unlockPreset(id) {
      if (!presetValidIds.has(id)) {
        throw new Error(`Unknown avatar accessory preset: ${id}`);
      }
      if (unlockedPresets[id]) {
        return false;
      }
      unlockedPresets[id] = true;
      persist();
      notifyPresets();
      return true;
    },
    lockPreset(id) {
      if (!presetValidIds.has(id)) {
        throw new Error(`Unknown avatar accessory preset: ${id}`);
      }
      if (!unlockedPresets[id]) {
        return false;
      }
      unlockedPresets[id] = false;
      persist();
      notifyPresets();
      return true;
    },
    applyPreset(id) {
      if (!presetValidIds.has(id)) {
        throw new Error(`Unknown avatar accessory preset: ${id}`);
      }
      if (!unlockedPresets[id]) {
        throw new Error(`Accessory preset ${id} is locked.`);
      }
      const preset = presetDefinitionById.get(id);
      if (!preset) {
        throw new Error(`Unknown avatar accessory preset: ${id}`);
      }
      definitions.forEach((definition) => {
        const target = Boolean(preset.accessories[definition.id]);
        state[definition.id] = target;
        suite.setEnabled(definition.id, target);
      });
      persist();
      notify();
      notifyPresets();
    },
    onPresetChange(listener) {
      presetListeners.add(listener);
      listener(buildPresetSnapshots());
      return () => {
        presetListeners.delete(listener);
      };
    },
  };
}
