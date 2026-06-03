import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GUIDED_TOUR_PREFERENCE_EVENT,
  GuidedTourPreference,
} from '../systems/guidedTour/preference';

describe('GuidedTourPreference', () => {
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
    });
  });

  afterEach(() => {
    preference.dispose();
  });

  it('defaults to disabled when no stored preference exists', () => {
    expect(preference.isEnabled()).toBe(false);
    expect(storage.get(storageKey)).toBeUndefined();
  });

  it('loads persisted enabled and disabled states from storage', () => {
    preference.dispose();
    storage.set(storageKey, '1');
    preference = new GuidedTourPreference({
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      storageKey,
      windowTarget: window,
    });
    expect(preference.isEnabled()).toBe(true);

    preference.dispose();
    storage.set(storageKey, '0');
    preference = new GuidedTourPreference({
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      storageKey,
      windowTarget: window,
    });
    expect(preference.isEnabled()).toBe(false);
  });

  it('accepts legacy boolean payloads for compatibility', () => {
    preference.dispose();
    storage.set(storageKey, 'true');
    preference = new GuidedTourPreference({
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      storageKey,
      windowTarget: window,
    });
    expect(preference.isEnabled()).toBe(true);
  });

  it('toggles state, persists, and notifies listeners', () => {
    const listener = vi.fn();
    preference.subscribe(listener);

    preference.setEnabled(true, 'control');

    expect(preference.isEnabled()).toBe(true);
    expect(storage.get(storageKey)).toBe('1');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(true);

    preference.toggle();
    expect(preference.isEnabled()).toBe(false);
    expect(storage.get(storageKey)).toBe('0');
  });

  it('dispatches custom events when state changes', () => {
    const handler = vi.fn();
    window.addEventListener(
      GUIDED_TOUR_PREFERENCE_EVENT,
      handler as EventListener
    );

    preference.setEnabled(true, 'api');

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ enabled: true, source: 'api' });

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
      newValue: '1',
    });

    window.dispatchEvent(storageEvent);

    expect(preference.isEnabled()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
  });
});
