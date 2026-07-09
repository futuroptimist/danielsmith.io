import {
  type AvatarAccessoryId,
  type AvatarAccessoryState,
  type AvatarAccessorySuite,
} from './accessories';
import type { PortfolioMannequinPalette } from './mannequin';

export interface AvatarAccessoryManagerOptions {
  readonly suite: AvatarAccessorySuite;
  readonly storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  readonly storageKey?: string;
  readonly initialState?: Partial<Record<AvatarAccessoryId, boolean>>;
  readonly initialPalette?: PortfolioMannequinPalette;
}

export interface AvatarAccessoryManager {
  getState(): AvatarAccessoryState[];
  isEnabled(id: AvatarAccessoryId): boolean;
  setEnabled(id: AvatarAccessoryId, enabled: boolean): void;
  toggle(id: AvatarAccessoryId): void;
  refresh(): void;
  onChange(listener: (state: AvatarAccessoryState[]) => void): () => void;
  applyPalette(palette: PortfolioMannequinPalette): void;
}

const DEFAULT_STORAGE_KEY = 'danielsmith:avatar-accessories';

type StoredState = Partial<Record<AvatarAccessoryId, boolean>>;

function parseStoredState(
  raw: string | null,
  validAccessoryIds: Set<AvatarAccessoryId>
): StoredState {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    const candidate =
      parsed && typeof parsed === 'object' && 'accessories' in parsed
        ? (parsed as { accessories?: unknown }).accessories
        : parsed;
    if (!candidate || typeof candidate !== 'object') {
      return {};
    }
    const result: StoredState = {};
    for (const [key, entry] of Object.entries(candidate)) {
      if (
        validAccessoryIds.has(key as AvatarAccessoryId) &&
        typeof entry === 'boolean'
      ) {
        result[key as AvatarAccessoryId] = entry;
      }
    }
    return result;
  } catch (error) {
    console.warn('Failed to parse stored avatar accessory state:', error);
    return {};
  }
}

export function createAvatarAccessoryManager({
  suite,
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
  initialState = {},
  initialPalette,
}: AvatarAccessoryManagerOptions): AvatarAccessoryManager {
  const listeners = new Set<(state: AvatarAccessoryState[]) => void>();
  const definitions = suite.definitions;
  const validIds = new Set<AvatarAccessoryId>(
    definitions.map((definition) => definition.id)
  );

  let storedState: StoredState = {};
  if (storage?.getItem) {
    try {
      storedState = parseStoredState(storage.getItem(storageKey), validIds);
    } catch (error) {
      console.warn(
        'Failed to read avatar accessory state from storage:',
        error
      );
    }
  }

  const state: StoredState = { ...initialState, ...storedState };

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

  const persist = () => {
    if (!storage?.setItem) {
      return;
    }
    try {
      const payload: StoredState = {};
      definitions.forEach((definition) => {
        payload[definition.id] = Boolean(state[definition.id]);
      });
      storage.setItem(storageKey, JSON.stringify(payload));
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
    },
    toggle(id) {
      if (!validIds.has(id)) {
        throw new Error(`Unknown avatar accessory: ${id}`);
      }
      const next = !state[id];
      state[id] = next;
      suite.setEnabled(id, next);
      persist();
      notify();
    },
    refresh() {
      applyStateToSuite();
      notify();
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
  };
}
