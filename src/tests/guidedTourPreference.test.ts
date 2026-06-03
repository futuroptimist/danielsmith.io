import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GUIDED_TOUR_PREFERENCE_EVENT,
  GuidedTourPreference,
} from '../systems/guidedTour/preference';

describe('GuidedTourPreference', () => {
  it('defaults to disabled when no stored preference exists', () => {
    const storage = new Map<string, string>();
    const preference = new GuidedTourPreference({
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      storageKey: 'test-guided-tour-default',
      windowTarget: window,
    });

    expect(preference.isEnabled()).toBe(false);

    preference.dispose();
  });

  it('restores explicit stored enabled and disabled preferences', () => {
    const enabledStorage = new Map<string, string>([
      ['test-guided-tour-enabled', '1'],
    ]);
    const disabledStorage = new Map<string, string>([
      ['test-guided-tour-disabled', '0'],
    ]);

    const enabledPreference = new GuidedTourPreference({
      storage: {
        getItem: (key) => enabledStorage.get(key) ?? null,
        setItem: (key, value) => {
          enabledStorage.set(key, value);
        },
      },
      storageKey: 'test-guided-tour-enabled',
      windowTarget: window,
    });
    const disabledPreference = new GuidedTourPreference({
      storage: {
        getItem: (key) => disabledStorage.get(key) ?? null,
        setItem: (key, value) => {
          disabledStorage.set(key, value);
        },
      },
      storageKey: 'test-guided-tour-disabled',
      windowTarget: window,
    });

    expect(enabledPreference.isEnabled()).toBe(true);
    expect(disabledPreference.isEnabled()).toBe(false);

    enabledPreference.dispose();
    disabledPreference.dispose();
  });

  let storage: Map<string, string>;
  let preference: GuidedTourPreference;
  const storageKey = 'test-guided-tour';

  beforeEach(() => {
    storage = new Map();
    preference = new GuidedTourPreference({
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      storageKey,
      windowTarget: window,
      defaultEnabled: true,
    });
  });

  afterEach(() => {
    preference.dispose();
  });

  it('toggles state, persists, and notifies listeners', () => {
    const listener = vi.fn();
    preference.subscribe(listener);

    expect(preference.isEnabled()).toBe(true);
    expect(storage.get(storageKey)).toBeUndefined();

    preference.setEnabled(false, 'control');

    expect(preference.isEnabled()).toBe(false);
    expect(storage.get(storageKey)).toBe('0');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(false);

    preference.toggle();
    expect(preference.isEnabled()).toBe(true);
    expect(storage.get(storageKey)).toBe('1');
  });

  it('dispatches custom events when state changes', () => {
    const handler = vi.fn();
    window.addEventListener(
      GUIDED_TOUR_PREFERENCE_EVENT,
      handler as EventListener
    );

    preference.setEnabled(false, 'api');

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ enabled: false, source: 'api' });

    window.removeEventListener(
      GUIDED_TOUR_PREFERENCE_EVENT,
      handler as EventListener
    );
  });

  it('reacts to storage events from other contexts', () => {
    const listener = vi.fn();
    preference.subscribe(listener);
    listener.mockClear();

    const storageEvent = new StorageEvent('storage', {
      key: storageKey,
      newValue: '0',
    });

    window.dispatchEvent(storageEvent);

    expect(preference.isEnabled()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);
  });
});
