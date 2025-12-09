import { describe, expect, it, vi } from 'vitest';

import { createAvatarAccessoryControl } from '../systems/controls/avatarAccessoryControl';
import { createHudCustomizationSection } from '../ui/hud/customizationSection';

const STRINGS = {
  heading: 'Customization',
  description: 'Adjust mannequin styling and companions.',
  variants: {
    title: 'Avatar style',
    description: 'Swap outfits.',
  },
  accessories: {
    title: 'Accessories',
    description: 'Toggle wrist console and drone.',
  },
} as const;

describe('createHudCustomizationSection', () => {
  it('renders heading, updates copy, and delegates lifecycle events', () => {
    const container = document.createElement('div');

    const variantRefresh = vi.fn();
    const variantDispose = vi.fn();
    const accessoryRefresh = vi.fn();
    const accessoryDispose = vi.fn();

    const variantElement = document.createElement('section');
    variantElement.className = 'avatar-variants';
    variantElement.innerHTML =
      '<h4 class="avatar-variants__title">Old</h4>' +
      '<p class="avatar-variants__description">Old description</p>';

    const accessoryElement = document.createElement('section');
    accessoryElement.className = 'avatar-accessories';
    accessoryElement.innerHTML =
      '<h4 class="avatar-accessories__title">Old</h4>' +
      '<p class="avatar-accessories__description">Old description</p>';

    const handle = createHudCustomizationSection({
      container,
      strings: STRINGS,
      createVariantControl: ({
        container: customizationContainer,
        title,
        description,
      }) => {
        expect(title).toBe(STRINGS.variants.title);
        expect(description).toBe(STRINGS.variants.description);
        customizationContainer.appendChild(variantElement);
        return {
          element: variantElement,
          refresh: variantRefresh,
          dispose: variantDispose,
        };
      },
      createAccessoryControl: ({
        container: customizationContainer,
        title,
        description,
      }) => {
        expect(title).toBe(STRINGS.accessories.title);
        expect(description).toBe(STRINGS.accessories.description);
        customizationContainer.appendChild(accessoryElement);
        return {
          element: accessoryElement,
          refresh: accessoryRefresh,
          dispose: accessoryDispose,
        };
      },
    });

    expect(
      container.querySelector('.hud-customization__heading')?.textContent
    ).toBe(STRINGS.heading);
    expect(
      container.querySelector('.hud-customization__description')?.textContent
    ).toBe(STRINGS.description);

    handle.refresh();
    expect(variantRefresh).toHaveBeenCalled();
    expect(accessoryRefresh).toHaveBeenCalled();

    const nextStrings = {
      heading: 'Updated customization',
      description: 'Adjust every companion.',
      variants: { title: 'Looks', description: 'Set a new palette.' },
      accessories: { title: 'Gear', description: 'Toggle gadgets.' },
    } as const;

    handle.setStrings(nextStrings);
    expect(
      container.querySelector('.hud-customization__heading')?.textContent
    ).toBe(nextStrings.heading);
    expect(
      variantElement.querySelector('.avatar-variants__title')?.textContent
    ).toBe(nextStrings.variants.title);
    expect(
      accessoryElement.querySelector('.avatar-accessories__description')
        ?.textContent
    ).toBe(nextStrings.accessories.description);

    handle.dispose();
    expect(container.childElementCount).toBe(0);
    expect(variantDispose).toHaveBeenCalled();
    expect(accessoryDispose).toHaveBeenCalled();
  });

  it('throws when no controls are provided', () => {
    const container = document.createElement('div');

    expect(() =>
      createHudCustomizationSection({
        container,
        strings: STRINGS,
      })
    ).toThrow('HUD customization requires at least one control to render.');
  });

  it('mounts accessory toggles with provided copy', () => {
    const container = document.createElement('div');

    const handle = createHudCustomizationSection({
      container,
      strings: STRINGS,
      createAccessoryControl: ({
        container: customizationContainer,
        title,
        description,
      }) =>
        createAvatarAccessoryControl({
          container: customizationContainer,
          options: [
            {
              id: 'wrist-console',
              label: 'Wrist console',
              description: 'Wearable diagnostics.',
            },
            {
              id: 'holo-drone',
              label: 'Drone',
              description: 'Orbiting scout.',
            },
          ],
          isAccessoryEnabled: () => false,
          setAccessoryEnabled: () => undefined,
          title,
          description,
        }),
    });

    expect(
      container.querySelector('.avatar-accessories__title')?.textContent
    ).toBe(STRINGS.accessories.title);
    expect(
      container.querySelector('.avatar-accessories__description')?.textContent
    ).toBe(STRINGS.accessories.description);
    expect(
      container.querySelectorAll('.avatar-accessories__checkbox')
    ).toHaveLength(2);

    handle.dispose();
  });
});
