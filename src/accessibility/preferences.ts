export type AccessibilityPreferenceId = 'reduceMotion' | 'highContrast';

export type AccessibilityPreferencesState = Record<
  AccessibilityPreferenceId,
  boolean
>;

const DEFAULT_STATE: AccessibilityPreferencesState = {
  reduceMotion: false,
  highContrast: false,
};

export interface AccessibilityPreferencesOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
}

export interface AccessibilityPreferencesManager {
  getState(): AccessibilityPreferencesState;
  setPreference<K extends AccessibilityPreferenceId>(
    id: K,
    value: AccessibilityPreferencesState[K]
  ): void;
  togglePreference(id: AccessibilityPreferenceId): void;
  subscribe(listener: (state: AccessibilityPreferencesState) => void): () => void;
}

const DEFAULT_STORAGE_KEY = 'danielsmith:accessibility-preferences';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function coerceState(value: unknown): AccessibilityPreferencesState {
  if (!isRecord(value)) {
    return { ...DEFAULT_STATE };
  }
  return {
    reduceMotion: Boolean(value.reduceMotion),
    highContrast: Boolean(value.highContrast),
  };
}

function readStoredState(
  storage: Pick<Storage, 'getItem'> | null | undefined,
  storageKey: string
): AccessibilityPreferencesState {
  if (!storage?.getItem) {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return { ...DEFAULT_STATE };
    }
    const parsed = JSON.parse(raw) as unknown;
    return coerceState(parsed);
  } catch (error) {
    console.warn('Failed to read accessibility preferences:', error);
    return { ...DEFAULT_STATE };
  }
}

function persistState(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  storageKey: string,
  state: AccessibilityPreferencesState
) {
  if (!storage?.setItem) {
    return;
  }
  try {
    storage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist accessibility preferences:', error);
  }
}

export function createAccessibilityPreferencesManager({
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
}: AccessibilityPreferencesOptions = {}): AccessibilityPreferencesManager {
  let state = readStoredState(storage, storageKey);
  const listeners = new Set<(state: AccessibilityPreferencesState) => void>();

  const notify = () => {
    const snapshot = { ...state };
    listeners.forEach((listener) => listener(snapshot));
  };

  const update = (next: AccessibilityPreferencesState) => {
    state = next;
    persistState(storage, storageKey, state);
    notify();
  };

  return {
    getState() {
      return { ...state };
    },
    setPreference(id, value) {
      if (state[id] === value) {
        return;
      }
      update({
        ...state,
        [id]: value,
      });
    },
    togglePreference(id) {
      update({
        ...state,
        [id]: !state[id],
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const ACCESSIBILITY_DEFAULTS: AccessibilityPreferencesState = {
  ...DEFAULT_STATE,
};
