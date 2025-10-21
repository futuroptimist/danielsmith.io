export type ModePreference = 'immersive' | 'text';

const MODE_PREFERENCE_STORAGE_KEY = 'danielsmith.io:mode-preference';

export interface ModePreferenceStorageOptions {
  getStorages?: () => Array<Storage | null | undefined>;
}

const defaultGetStorages = (): Storage[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const storages: Storage[] = [];
  const append = (read: () => Storage | null | undefined) => {
    try {
      const storage = read();
      if (storage) {
        storages.push(storage);
      }
    } catch {
      // Ignore inaccessible storage instances.
    }
  };
  append(() => window.localStorage);
  append(() => window.sessionStorage);
  return storages;
};

const isModePreference = (value: unknown): value is ModePreference =>
  value === 'immersive' || value === 'text';

export const readModePreference = (
  options: ModePreferenceStorageOptions = {}
): ModePreference | null => {
  const storages = options.getStorages?.() ?? defaultGetStorages();
  for (const storage of storages) {
    if (!storage) {
      continue;
    }
    try {
      const value = storage.getItem(MODE_PREFERENCE_STORAGE_KEY);
      if (isModePreference(value)) {
        return value;
      }
    } catch {
      // Continue searching other storages.
    }
  }
  return null;
};

export const writeModePreference = (
  preference: ModePreference | null,
  options: ModePreferenceStorageOptions = {}
): void => {
  const storages = options.getStorages?.() ?? defaultGetStorages();
  for (const storage of storages) {
    if (!storage) {
      continue;
    }
    try {
      if (preference) {
        storage.setItem(MODE_PREFERENCE_STORAGE_KEY, preference);
      } else {
        storage.removeItem(MODE_PREFERENCE_STORAGE_KEY);
      }
    } catch {
      // Skip storage write failures and continue.
    }
  }
};

export const clearModePreference = (
  options: ModePreferenceStorageOptions = {}
): void => {
  writeModePreference(null, options);
};

export const MODE_PREFERENCE_KEY = MODE_PREFERENCE_STORAGE_KEY;
