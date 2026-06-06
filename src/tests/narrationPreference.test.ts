import { describe, expect, it, vi } from 'vitest';

import {
  NARRATION_PREFERENCE_STORAGE_KEY,
  NarrationPreference,
} from '../systems/narrative/narrationPreference';

const createMemoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
};

describe('NarrationPreference', () => {
  it('defaults off when storage is missing', () => {
    const preference = new NarrationPreference({ storage: null });

    expect(preference.isEnabled()).toBe(false);
  });

  it('honors and persists explicit true values', () => {
    const storage = createMemoryStorage({
      [NARRATION_PREFERENCE_STORAGE_KEY]: '1',
    });
    const preference = new NarrationPreference({ storage });

    expect(preference.isEnabled()).toBe(true);

    preference.setEnabled(false);
    preference.setEnabled(true);

    expect(storage.setItem).toHaveBeenLastCalledWith(
      NARRATION_PREFERENCE_STORAGE_KEY,
      '1'
    );
  });

  it('honors and persists explicit false values', () => {
    const storage = createMemoryStorage({
      [NARRATION_PREFERENCE_STORAGE_KEY]: '0',
    });
    const preference = new NarrationPreference({
      storage,
      defaultEnabled: true,
    });

    expect(preference.isEnabled()).toBe(false);

    preference.setEnabled(false, 'control');

    expect(storage.setItem).toHaveBeenCalledWith(
      NARRATION_PREFERENCE_STORAGE_KEY,
      '0'
    );
  });

  it('ignores legacy true values stored under unrelated keys', () => {
    const storage = createMemoryStorage({
      'danielsmith.io::narrationEnabled': 'true',
      'danielsmith.io::narrationEnabled::legacy': '1',
    });
    const preference = new NarrationPreference({ storage });

    expect(preference.isEnabled()).toBe(false);
    expect(storage.getItem).toHaveBeenCalledWith(
      NARRATION_PREFERENCE_STORAGE_KEY
    );
  });
});
