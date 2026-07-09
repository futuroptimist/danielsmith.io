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

interface StoredPayload {
  accessories: StoredState;
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
  validAccessoryIds: Set<AvatarAccessoryId>
): StoredPayload {
  if (!raw) {
    return { accessories: {} };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'accessories' in parsed) {
      return {
        accessories: parseBooleanRecord(
          (parsed as { accessories?: unknown }).accessories,
          validAccessoryIds
        ),
      };
    }
    return {
      accessories: parseBooleanRecord(parsed, validAccessoryIds),
    };
  } catch (error) {
    console.warn('Failed to parse stored avatar accessory state:', error);
    return { accessories: {} };
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
}: AvatarAccessoryManagerOptions): AvatarAccessoryManager {
  const listeners = new Set<(state: AvatarAccessoryState[]) => void>();
  const definitions = suite.definitions;
  const validIds = new Set<AvatarAccessoryId>(
    definitions.map((definition) => definition.id)
  );

  let storedPayload: StoredPayload = { accessories: {} };
  if (storage?.getItem) {
    try {
      const raw = storage.getItem(storageKey);
      storedPayload = parseStoredPayload(raw, validIds);
    } catch (error) {
      console.warn(
        'Failed to read avatar accessory state from storage:',
        error
      );
    }
  }

  const state: StoredState = { ...initialState, ...storedPayload.accessories };

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
      const payload: StoredPayload = {
        accessories: {},
      };
      definitions.forEach((definition) => {
        payload.accessories[definition.id] = Boolean(state[definition.id]);
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
