import { describe, expect, it, vi } from 'vitest';

import {
  ACCESSIBILITY_DEFAULTS,
  createAccessibilityPreferencesManager,
} from '../accessibility/preferences';

describe('createAccessibilityPreferencesManager', () => {
  it('loads persisted state, emits updates, and persists changes', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(
        JSON.stringify({ reduceMotion: true, highContrast: false })
      ),
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const manager = createAccessibilityPreferencesManager({ storage });

    expect(manager.getState()).toEqual({ reduceMotion: true, highContrast: false });

    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    manager.setPreference('highContrast', true);
    expect(storage.setItem).toHaveBeenCalledWith(
      'danielsmith:accessibility-preferences',
      JSON.stringify({ reduceMotion: true, highContrast: true })
    );
    expect(listener).toHaveBeenCalledWith({
      reduceMotion: true,
      highContrast: true,
    });

    listener.mockClear();
    manager.togglePreference('reduceMotion');
    expect(listener).toHaveBeenCalledWith({
      reduceMotion: false,
      highContrast: true,
    });

    unsubscribe();
    listener.mockClear();
    manager.setPreference('reduceMotion', true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores redundant updates and handles storage failures gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('boom');
      }),
      setItem: vi.fn(() => {
        throw new Error('persist fail');
      }),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const manager = createAccessibilityPreferencesManager({ storage });

    expect(manager.getState()).toEqual(ACCESSIBILITY_DEFAULTS);
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to read accessibility preferences:',
      expect.any(Error)
    );

    const listener = vi.fn();
    manager.subscribe(listener);

    manager.setPreference('reduceMotion', false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();

    manager.setPreference('reduceMotion', true);
    expect(storage.setItem).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith({
      reduceMotion: true,
      highContrast: false,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist accessibility preferences:',
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it('falls back to defaults when storage payload is invalid', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue('not-json'),
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const manager = createAccessibilityPreferencesManager({ storage });
    expect(manager.getState()).toEqual(ACCESSIBILITY_DEFAULTS);
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to read accessibility preferences:',
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });
});
