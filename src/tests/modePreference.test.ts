import { describe, expect, it, vi } from 'vitest';

import {
  MODE_PREFERENCE_KEY,
  clearModePreference,
  readModePreference,
  writeModePreference,
} from '../systems/failover/modePreference';

const createMockStorage = () => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => {
      store.clear();
    }),
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  } as unknown as Storage;
};

describe('readModePreference', () => {
  it('returns null when no storages are available', () => {
    expect(readModePreference({ getStorages: () => [] })).toBeNull();
  });

  it('reads a stored preference when present', () => {
    const storage = createMockStorage();
    storage.setItem(MODE_PREFERENCE_KEY, 'text');

    const preference = readModePreference({ getStorages: () => [storage] });

    expect(preference).toBe('text');
    expect(storage.getItem).toHaveBeenCalledWith(MODE_PREFERENCE_KEY);
  });

  it('ignores invalid stored values', () => {
    const storage = createMockStorage();
    storage.setItem(MODE_PREFERENCE_KEY, 'unexpected-value');

    const preference = readModePreference({ getStorages: () => [storage] });

    expect(preference).toBeNull();
  });

  it('continues to the next storage when read fails', () => {
    const failing = {
      get length() {
        return 0;
      },
      clear: vi.fn(),
      getItem: vi.fn(() => {
        throw new Error('unavailable');
      }),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    } as unknown as Storage;
    const fallback = createMockStorage();
    fallback.setItem(MODE_PREFERENCE_KEY, 'immersive');

    const preference = readModePreference({
      getStorages: () => [failing, fallback],
    });

    expect(preference).toBe('immersive');
    expect(failing.getItem).toHaveBeenCalledWith(MODE_PREFERENCE_KEY);
    expect(fallback.getItem).toHaveBeenCalledWith(MODE_PREFERENCE_KEY);
  });
});

describe('writeModePreference', () => {
  it('stores the preference in available storages', () => {
    const storage = createMockStorage();
    writeModePreference('text', { getStorages: () => [storage] });

    expect(storage.setItem).toHaveBeenCalledWith(MODE_PREFERENCE_KEY, 'text');
    expect(storage.getItem(MODE_PREFERENCE_KEY)).toBe('text');
  });

  it('removes the stored preference when null is provided', () => {
    const storage = createMockStorage();
    writeModePreference('immersive', { getStorages: () => [storage] });
    writeModePreference(null, { getStorages: () => [storage] });

    expect(storage.removeItem).toHaveBeenCalledWith(MODE_PREFERENCE_KEY);
    expect(storage.getItem(MODE_PREFERENCE_KEY)).toBeNull();
  });

  it('continues writing when a storage throws', () => {
    const failing = {
      get length() {
        return 0;
      },
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('write blocked');
      }),
    } as unknown as Storage;
    const fallback = createMockStorage();

    writeModePreference('text', { getStorages: () => [failing, fallback] });

    expect(failing.setItem).toHaveBeenCalledWith(MODE_PREFERENCE_KEY, 'text');
    expect(fallback.setItem).toHaveBeenCalledWith(MODE_PREFERENCE_KEY, 'text');
    expect(fallback.getItem(MODE_PREFERENCE_KEY)).toBe('text');
  });
});

describe('clearModePreference', () => {
  it('delegates to remove stored preferences', () => {
    const storage = createMockStorage();
    writeModePreference('text', { getStorages: () => [storage] });

    clearModePreference({ getStorages: () => [storage] });

    expect(storage.removeItem).toHaveBeenCalledWith(MODE_PREFERENCE_KEY);
    expect(storage.getItem(MODE_PREFERENCE_KEY)).toBeNull();
  });
});
