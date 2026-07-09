import { describe, expect, it, vi } from 'vitest';

import { createAvatarAccessorySuite } from '../scene/avatar/accessories';
import { createAvatarAccessoryManager } from '../scene/avatar/accessoryManager';
import { createPortfolioMannequin } from '../scene/avatar/mannequin';

describe('createAvatarAccessoryManager', () => {
  const createStorageStub = () => {
    const store = new Map<string, string>();
    return {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;
  };

  it('initializes from stored state and mirrors suite state', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });
    const storage = createStorageStub();
    storage.getItem.mockReturnValue(
      '{"wrist-console":true,"holo-drone":false}'
    );

    const manager = createAvatarAccessoryManager({
      suite,
      storage,
      storageKey: 'test-accessories',
    });

    expect(manager.getState()).toEqual([
      { id: 'wrist-console', enabled: true },
      { id: 'holo-drone', enabled: false },
    ]);
    expect(storage.getItem).toHaveBeenCalledWith('test-accessories');
  });

  it('persists updates and notifies listeners', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });
    const storage = createStorageStub();
    const manager = createAvatarAccessoryManager({
      suite,
      storage,
    });

    const listener = vi.fn();
    manager.onChange(listener);

    manager.setEnabled('wrist-console', true);
    expect(manager.isEnabled('wrist-console')).toBe(true);
    expect(listener).toHaveBeenCalledWith([
      { id: 'wrist-console', enabled: true },
      { id: 'holo-drone', enabled: false },
    ]);
    expect(storage.setItem).toHaveBeenCalledWith(
      'danielsmith:avatar-accessories',
      expect.any(String)
    );
    expect(JSON.parse(storage.setItem.mock.calls[0]?.[1] ?? '{}')).toEqual({
      'wrist-console': true,
      'holo-drone': false,
    });

    listener.mockReset();
    storage.setItem.mockClear();
    manager.toggle('wrist-console');
    expect(manager.isEnabled('wrist-console')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.setItem.mock.calls[0]?.[1] ?? '{}')).toEqual({
      'wrist-console': false,
      'holo-drone': false,
    });
  });

  it('reapplies state on refresh and proxies palette updates', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });
    const storage = createStorageStub();
    const manager = createAvatarAccessoryManager({
      suite,
      storage,
    });

    const setEnabledSpy = vi.spyOn(suite, 'setEnabled');
    manager.refresh();
    expect(setEnabledSpy).toHaveBeenCalledWith('wrist-console', false);
    expect(setEnabledSpy).toHaveBeenCalledWith('holo-drone', false);

    const applyPaletteSpy = vi.spyOn(suite, 'applyPalette');
    manager.applyPalette({
      base: '#000000',
      accent: '#ffffff',
      trim: '#ff00ff',
    });
    expect(applyPaletteSpy).toHaveBeenCalledWith({
      base: '#000000',
      accent: '#ffffff',
      trim: '#ff00ff',
    });
  });

  it('throws when interacting with unknown accessories', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });
    const manager = createAvatarAccessoryManager({ suite });

    expect(() => manager.isEnabled('unknown' as never)).toThrow(
      'Unknown avatar accessory: unknown'
    );
  });
});
