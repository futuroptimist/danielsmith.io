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
      accessories: {
        'wrist-console': true,
        'holo-drone': false,
      },
      unlockedPresets: {},
    });

    listener.mockReset();
    storage.setItem.mockClear();
    manager.toggle('wrist-console');
    expect(manager.isEnabled('wrist-console')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.setItem.mock.calls[0]?.[1] ?? '{}')).toEqual({
      accessories: {
        'wrist-console': false,
        'holo-drone': false,
      },
      unlockedPresets: {},
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

  it('unlocks, applies, and persists accessory presets', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });
    const storage = createStorageStub();
    const presets = [
      {
        id: 'minimalist',
        label: 'Minimal',
        description: 'No accessories.',
        accessories: {
          'wrist-console': false,
          'holo-drone': false,
        },
        unlockedByDefault: true,
      },
      {
        id: 'scout-drone',
        label: 'Scout drone',
        description: 'Enable the holographic drone.',
        accessories: {
          'wrist-console': false,
          'holo-drone': true,
        },
      },
    ] as const;

    const manager = createAvatarAccessoryManager({
      suite,
      storage,
      presets,
    });

    const presetListener = vi.fn();
    manager.onPresetChange(presetListener);

    expect(manager.listPresets()).toEqual([
      {
        id: 'minimalist',
        label: 'Minimal',
        description: 'No accessories.',
        accessories: {
          'wrist-console': false,
          'holo-drone': false,
        },
        unlocked: true,
        applied: true,
      },
      {
        id: 'scout-drone',
        label: 'Scout drone',
        description: 'Enable the holographic drone.',
        accessories: {
          'wrist-console': false,
          'holo-drone': true,
        },
        unlocked: false,
        applied: false,
      },
    ]);
    expect(presetListener).toHaveBeenCalled();

    expect(manager.isPresetUnlocked('scout-drone')).toBe(false);
    expect(manager.unlockPreset('scout-drone')).toBe(true);
    expect(manager.unlockPreset('scout-drone')).toBe(false);
    expect(manager.isPresetUnlocked('scout-drone')).toBe(true);

    storage.setItem.mockClear();
    manager.applyPreset('scout-drone');
    expect(manager.getState()).toEqual([
      { id: 'wrist-console', enabled: false },
      { id: 'holo-drone', enabled: true },
    ]);
    const payload = JSON.parse(storage.setItem.mock.calls.at(-1)?.[1] ?? '{}');
    expect(payload).toEqual({
      accessories: {
        'wrist-console': false,
        'holo-drone': true,
      },
      unlockedPresets: {
        minimalist: true,
        'scout-drone': true,
      },
    });

    expect(manager.lockPreset('scout-drone')).toBe(true);
    expect(manager.lockPreset('scout-drone')).toBe(false);
    expect(() => manager.applyPreset('scout-drone')).toThrow(
      'Accessory preset scout-drone is locked.'
    );
  });

  it('hydrates preset unlock state from stored payloads', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });
    const storage = createStorageStub();
    storage.getItem.mockReturnValue(
      JSON.stringify({
        accessories: {
          'wrist-console': false,
          'holo-drone': true,
        },
        unlockedPresets: {
          minimalist: true,
          'scout-drone': true,
        },
      })
    );

    const presets = [
      {
        id: 'minimalist',
        label: 'Minimal',
        description: 'No accessories.',
        accessories: {
          'wrist-console': false,
          'holo-drone': false,
        },
        unlockedByDefault: true,
      },
      {
        id: 'scout-drone',
        label: 'Scout drone',
        description: 'Enable the holographic drone.',
        accessories: {
          'wrist-console': false,
          'holo-drone': true,
        },
      },
    ] as const;

    const manager = createAvatarAccessoryManager({
      suite,
      storage,
      presets,
      storageKey: 'preset-test',
    });

    expect(manager.getState()).toEqual([
      { id: 'wrist-console', enabled: false },
      { id: 'holo-drone', enabled: true },
    ]);
    const snapshots = manager.listPresets();
    const dronePreset = snapshots.find((preset) => preset.id === 'scout-drone');
    const minimalPreset = snapshots.find(
      (preset) => preset.id === 'minimalist'
    );
    expect(dronePreset).toEqual({
      id: 'scout-drone',
      label: 'Scout drone',
      description: 'Enable the holographic drone.',
      accessories: {
        'wrist-console': false,
        'holo-drone': true,
      },
      unlocked: true,
      applied: true,
    });
    expect(minimalPreset?.applied).toBe(false);
    expect(manager.isPresetUnlocked('scout-drone')).toBe(true);
  });

  it('validates preset configuration against accessory definitions', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });

    expect(() =>
      createAvatarAccessoryManager({
        suite,
        presets: [
          {
            id: 'dupe',
            label: 'Duplicate',
            description: '',
            accessories: {},
          },
          {
            id: 'dupe',
            label: 'Duplicate',
            description: '',
            accessories: {},
          },
        ],
      })
    ).toThrow('Duplicate avatar accessory preset: dupe');

    expect(() =>
      createAvatarAccessoryManager({
        suite,
        presets: [
          {
            id: 'invalid-ref',
            label: 'Invalid',
            description: '',
            accessories: {
              'unknown-accessory': true,
            } as never,
          },
        ],
      })
    ).toThrow(
      'Preset invalid-ref references unknown accessory: unknown-accessory'
    );
  });
});
