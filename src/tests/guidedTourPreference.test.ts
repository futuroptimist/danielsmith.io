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
