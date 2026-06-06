import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LEGACY_NARRATION_PREFERENCE_STORAGE_KEYS,
  NARRATION_PREFERENCE_STORAGE_KEY,
  NarrationPreference,
} from '../systems/narrative/narrationPreference';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('NarrationPreference', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults off when storage is missing', () => {
    const preference = new NarrationPreference({ storage: null });

    expect(preference.isEnabled()).toBe(false);
  });

  it('persists and honors explicit opt-in', () => {
    const storage = new MemoryStorage();
    const preference = new NarrationPreference({ storage });

    preference.setEnabled(true, 'control');

    expect(storage.getItem(NARRATION_PREFERENCE_STORAGE_KEY)).toBe('1');
    expect(new NarrationPreference({ storage }).isEnabled()).toBe(true);
  });

  it('persists and honors explicit opt-out', () => {
    const storage = new MemoryStorage();
    storage.setItem(NARRATION_PREFERENCE_STORAGE_KEY, '1');
    const preference = new NarrationPreference({ storage });

    preference.setEnabled(false, 'control');

    expect(storage.getItem(NARRATION_PREFERENCE_STORAGE_KEY)).toBe('0');
    expect(new NarrationPreference({ storage }).isEnabled()).toBe(false);
  });

  it('does not treat legacy true values as consent', () => {
    const storage = new MemoryStorage();
    for (const key of LEGACY_NARRATION_PREFERENCE_STORAGE_KEYS) {
      storage.setItem(key, '1');
    }

    const preference = new NarrationPreference({ storage });

    expect(preference.isEnabled()).toBe(false);
  });

  it('treats removed storage keys as cross-tab opt-out', () => {
    const storage = new MemoryStorage();
    storage.setItem(NARRATION_PREFERENCE_STORAGE_KEY, '1');
    const preference = new NarrationPreference({
      storage,
      windowTarget: window,
    });
    const listener = vi.fn();

    preference.subscribe(listener);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: NARRATION_PREFERENCE_STORAGE_KEY,
        newValue: null,
      })
    );

    expect(preference.isEnabled()).toBe(false);
    expect(listener).toHaveBeenLastCalledWith({
      enabled: false,
      source: 'storage',
    });

    preference.dispose();
  });

  it('treats localStorage clear events as cross-tab opt-out', () => {
    const storage = new MemoryStorage();
    storage.setItem(NARRATION_PREFERENCE_STORAGE_KEY, '1');
    const preference = new NarrationPreference({
      storage,
      windowTarget: window,
    });

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: null,
        newValue: null,
      })
    );

    expect(preference.isEnabled()).toBe(false);

    preference.dispose();
  });
});
