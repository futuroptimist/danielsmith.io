import { describe, expect, it } from 'vitest';

import {
  NarrationPreference,
  NARRATION_PREFERENCE_STORAGE_KEY,
} from '../systems/narrationPreference';

const createMemoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    getValue: (key: string) => values.get(key) ?? null,
  };
};

describe('NarrationPreference', () => {
  it('defaults off when storage is missing', () => {
    const preference = new NarrationPreference({ storage: null });

    expect(preference.isEnabled()).toBe(false);
  });

  it('honors and persists explicit opt-in values', () => {
    const storage = createMemoryStorage({
      [NARRATION_PREFERENCE_STORAGE_KEY]: '1',
    });
    const preference = new NarrationPreference({ storage });

    expect(preference.isEnabled()).toBe(true);

    preference.setEnabled(false, 'control');
    expect(storage.getValue(NARRATION_PREFERENCE_STORAGE_KEY)).toBe('0');
  });

  it('honors and persists explicit opt-out values', () => {
    const storage = createMemoryStorage({
      [NARRATION_PREFERENCE_STORAGE_KEY]: '0',
    });
    const preference = new NarrationPreference({ storage });

    expect(preference.isEnabled()).toBe(false);

    preference.setEnabled(true, 'control');
    expect(storage.getValue(NARRATION_PREFERENCE_STORAGE_KEY)).toBe('1');
  });

  it('does not treat legacy guided-tour true values as narration consent', () => {
    const storage = createMemoryStorage({
      'danielsmith.io:guided-tour-enabled': 'true',
      'danielsmith.io::guidedTourEnabled::v1': '1',
    });
    const preference = new NarrationPreference({ storage });

    expect(preference.isEnabled()).toBe(false);
  });
});
