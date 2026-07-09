import { describe, expect, it } from 'vitest';

import { createSettingsControlSlots } from '../ui/hud/settingsControlOrder';

describe('createSettingsControlSlots', () => {
  it('places graphics first and customization last in the settings stack', () => {
    const stack = document.createElement('div');
    const slots = createSettingsControlSlots(stack);

    const graphics = document.createElement('section');
    graphics.className = 'graphics-quality';
    graphics.textContent = 'Graphics Quality';
    slots.top.appendChild(graphics);

    const audio = document.createElement('section');
    audio.textContent = 'Audio';
    slots.middle.appendChild(audio);

    const customization = document.createElement('section');
    customization.className = 'hud-customization';
    customization.textContent = 'Customization';
    slots.bottom.appendChild(customization);

    const settingsControls = Array.from(stack.querySelectorAll('section'));
    expect(settingsControls.at(0)).toBe(graphics);
    expect(settingsControls.at(-1)).toBe(customization);
    expect(
      Array.from(stack.children).map(
        (child) => (child as HTMLElement).dataset.settingsSlot
      )
    ).toEqual(['top', 'middle', 'bottom']);
  });
});
