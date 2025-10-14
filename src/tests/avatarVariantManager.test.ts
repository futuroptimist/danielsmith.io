import { describe, expect, it, vi } from 'vitest';

import type { PortfolioMannequinPalette } from '../scene/avatar/mannequin';
import { createAvatarVariantManager } from '../scene/avatar/variantManager';
import {
  AVATAR_VARIANTS,
  DEFAULT_AVATAR_VARIANT_ID,
} from '../scene/avatar/variants';

describe('createAvatarVariantManager', () => {
  it('applies stored variant, persists updates, and notifies listeners', () => {
    const applied: PortfolioMannequinPalette[] = [];
    const storageBacking = new Map<string, string>();
    const storage = {
      getItem: (key: string) => storageBacking.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageBacking.set(key, value);
      },
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    storage.setItem('danielsmith:avatar-variant', 'casual');

    const manager = createAvatarVariantManager({
      target: {
        applyPalette: (palette) => {
          applied.push(palette);
        },
      },
      storage,
    });

    expect(manager.getVariant()).toBe('casual');
    expect(applied.at(-1)).toEqual(
      AVATAR_VARIANTS.find((variant) => variant.id === 'casual')?.palette
    );

    const listener = vi.fn();
    const unsubscribe = manager.onChange(listener);

    manager.setVariant('formal');
    expect(listener).toHaveBeenCalledWith('formal');
    expect(storage.getItem('danielsmith:avatar-variant')).toBe('formal');
    expect(applied.at(-1)).toEqual(
      AVATAR_VARIANTS.find((variant) => variant.id === 'formal')?.palette
    );

    const applyCountAfterChange = applied.length;
    listener.mockClear();
    manager.setVariant('formal');
    expect(listener).not.toHaveBeenCalled();
    expect(applied.length).toBeGreaterThan(applyCountAfterChange);

    manager.refresh();
    expect(applied.at(-1)).toEqual(
      AVATAR_VARIANTS.find((variant) => variant.id === 'formal')?.palette
    );

    unsubscribe();
  });

  it('falls back to the default variant when storage returns unknown values', () => {
    const applied: PortfolioMannequinPalette[] = [];
    const storage = {
      getItem: () => 'mystery',
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const manager = createAvatarVariantManager({
      target: {
        applyPalette: (palette) => {
          applied.push(palette);
        },
      },
      storage,
    });

    expect(manager.getVariant()).toBe(DEFAULT_AVATAR_VARIANT_ID);
    expect(applied[0]).toEqual(
      AVATAR_VARIANTS.find(
        (variant) => variant.id === DEFAULT_AVATAR_VARIANT_ID
      )?.palette
    );
  });

  it('logs warnings when persistence fails but continues operating', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const applied: PortfolioMannequinPalette[] = [];
    const storage = {
      getItem: () => {
        throw new Error('read-failure');
      },
      setItem: () => {
        throw new Error('write-failure');
      },
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const manager = createAvatarVariantManager({
      target: {
        applyPalette: (palette) => {
          applied.push(palette);
        },
      },
      storage,
    });

    expect(warn).toHaveBeenCalledWith(
      'Failed to read persisted avatar variant:',
      expect.any(Error)
    );
    warn.mockClear();

    expect(() => manager.setVariant('casual')).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      'Failed to persist avatar variant:',
      expect.any(Error)
    );
    expect(applied.at(-1)).toEqual(
      AVATAR_VARIANTS.find((variant) => variant.id === 'casual')?.palette
    );

    warn.mockRestore();
  });
});
