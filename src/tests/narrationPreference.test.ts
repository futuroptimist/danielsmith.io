import { describe, expect, it } from 'vitest';

import {
  NarrationPreference,
  NARRATION_PREFERENCE_STORAGE_KEY,
} from '../systems/narrationPreference';

const createStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};

describe('NarrationPreference', () => {
  it('defaults off when storage is missing', () => {
    const preference = new NarrationPreference({ storage: null });

    expect(preference.isEnabled()).toBe(false);
  });

  it('honors and persists explicit true values', () => {
    const storage = createStorage({ [NARRATION_PREFERENCE_STORAGE_KEY]: '1' });
    const preference = new NarrationPreference({ storage });

    expect(preference.isEnabled()).toBe(true);
    preference.setEnabled(true, 'control');

    expect(storage.getItem(NARRATION_PREFERENCE_STORAGE_KEY)).toBe('1');
  });

  it('honors and persists explicit false values', () => {
    const storage = createStorage({ [NARRATION_PREFERENCE_STORAGE_KEY]: '0' });
    const preference = new NarrationPreference({ storage });

    expect(preference.isEnabled()).toBe(false);
    preference.setEnabled(true, 'control');
    preference.setEnabled(false, 'control');

    expect(storage.getItem(NARRATION_PREFERENCE_STORAGE_KEY)).toBe('0');
  });

  it('ignores legacy true values from unversioned narration storage', () => {
    const storage = createStorage({
      'danielsmith.io::narrationEnabled': 'true',
      'danielsmith.io::guidedTourEnabled::v1': 'true',
    });
    const preference = new NarrationPreference({ storage });

    expect(preference.getStorageKey()).toBe(NARRATION_PREFERENCE_STORAGE_KEY);
    expect(preference.isEnabled()).toBe(false);
  });
});
