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

  it('defaults to off when no stored preference exists', () => {
    expect(preference.isEnabled()).toBe(false);
    expect(storage.get(storageKey)).toBeUndefined();
  });

  it('toggles state, persists, and notifies listeners', () => {
    const listener = vi.fn();
    preference.subscribe(listener);

    expect(preference.isEnabled()).toBe(false);
    expect(storage.get(storageKey)).toBeUndefined();

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

  it('preserves stored explicit enabled and disabled states', () => {
    storage.set(storageKey, 'true');
    const enabledPreference = new GuidedTourPreference({
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      storageKey,
      windowTarget: null,
    });
    expect(enabledPreference.isEnabled()).toBe(true);

    storage.set(storageKey, 'false');
    const disabledPreference = new GuidedTourPreference({
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      storageKey,
      windowTarget: null,
    });
    expect(disabledPreference.isEnabled()).toBe(false);
  });

  it('falls back to sessionStorage when localStorage is blocked', () => {
    const sessionStorage = new Map<string, string>();
    const sessionStorageLike = {
      getItem: (key: string) => sessionStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionStorage.set(key, value);
      },
    };
    const windowTarget = {
      get localStorage() {
        throw new Error('localStorage unavailable');
      },
      get sessionStorage() {
        return sessionStorageLike;
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as Window;
    const fallbackPreference = new GuidedTourPreference({
      storageKey,
      windowTarget,
    });

    expect(fallbackPreference.isEnabled()).toBe(false);

    fallbackPreference.setEnabled(true, 'control');

    expect(sessionStorage.get(storageKey)).toBe('1');

    fallbackPreference.dispose();
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

  it('treats removed stored values as disabled across contexts', () => {
    preference.setEnabled(true, 'control');
    const listener = vi.fn();
    preference.subscribe(listener);
    listener.mockClear();

    const storageEvent = new StorageEvent('storage', {
      key: storageKey,
      newValue: null,
    });

    window.dispatchEvent(storageEvent);

    expect(preference.isEnabled()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);
  });

  it('treats cleared storage as disabled across contexts', () => {
    preference.setEnabled(true, 'control');
    const listener = vi.fn();
    preference.subscribe(listener);
    listener.mockClear();

    const storageEvent = new StorageEvent('storage', {
      key: null,
      newValue: null,
    });

    window.dispatchEvent(storageEvent);

    expect(preference.isEnabled()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);
  });
});
