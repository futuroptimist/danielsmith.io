import { describe, expect, it, vi } from 'vitest';

import type { AvatarVariantId } from '../scene/avatar/variants';
import { createAvatarVariantControl } from '../systems/controls/avatarVariantControl';

const OPTIONS = [
  {
    id: 'portfolio' as AvatarVariantId,
    label: 'Portfolio',
    description: 'Default outfit with neon visor.',
    palette: {
      base: '#283347',
      accent: '#57d7ff',
      trim: '#f7c77d',
    },
  },
  {
    id: 'casual' as AvatarVariantId,
    label: 'Casual',
    description: 'Relaxed hoodie variant.',
    palette: {
      base: '#2a343d',
      accent: '#36d1b5',
      trim: '#ffb88c',
    },
  },
  {
    id: 'formal' as AvatarVariantId,
    label: 'Formal',
    description: 'Gilded blazer preset.',
    palette: {
      base: '#1f242b',
      accent: '#ffd166',
      trim: '#f2f4f8',
    },
  },
] as const;

describe('createAvatarVariantControl', () => {
  it('renders options, exposes swatches, and manages async selection', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let active: AvatarVariantId = 'portfolio';
    let resolveSelection: (() => void) | undefined;

    const handle = createAvatarVariantControl({
      container,
      options: OPTIONS,
      getActiveVariant: () => active,
      setActiveVariant: (next) => {
        active = next;
        return new Promise<void>((resolve) => {
          resolveSelection = resolve;
        });
      },
    });

    const wrapper = container.querySelector<HTMLElement>('.avatar-variants');
    const radios = Array.from(
      container.querySelectorAll<HTMLInputElement>('.avatar-variants__radio')
    );
    expect(wrapper).toBeTruthy();
    expect(radios).toHaveLength(OPTIONS.length);
    expect(wrapper?.dataset.pending).toBe('false');

    const swatches = container.querySelectorAll<HTMLElement>(
      '.avatar-variants__swatch'
    );
    expect(swatches).toHaveLength(OPTIONS.length * 3);
    expect(swatches[0].style.getPropertyValue('--avatar-variant-color')).toBe(
      '#283347'
    );

    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change'));
    expect(wrapper?.dataset.pending).toBe('true');

    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change'));
    expect(wrapper?.dataset.pending).toBe('true');

    resolveSelection?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper?.dataset.pending).toBe('false');
    expect(radios[1].checked).toBe(true);

    active = 'portfolio';
    handle.refresh();
    expect(radios[0].checked).toBe(true);

    handle.dispose();
    expect(container.querySelector('.avatar-variants')).toBeNull();
  });

  it('logs warnings when variant updates fail', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let active: AvatarVariantId = 'portfolio';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createAvatarVariantControl({
      container,
      options: OPTIONS,
      getActiveVariant: () => active,
      setActiveVariant: (variant) => {
        active = variant;
        throw new Error('nope');
      },
    });

    const radio = container.querySelector<HTMLInputElement>(
      '.avatar-variants__radio[value="casual"]'
    );
    expect(radio).toBeTruthy();
    if (!radio) {
      warn.mockRestore();
      return;
    }

    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
    expect(warn).toHaveBeenCalledWith(
      'Failed to update avatar variant:',
      expect.any(Error)
    );

    warn.mockRestore();
  });

  it('requires at least one option', () => {
    const container = document.createElement('div');
    expect(() =>
      createAvatarVariantControl({
        container,
        options: [],
        getActiveVariant: () => 'portfolio',
        setActiveVariant: () => undefined,
      })
    ).toThrow('Avatar variant control requires at least one option.');
  });
});
