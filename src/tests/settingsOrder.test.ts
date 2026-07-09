import { describe, expect, it } from 'vitest';

import { orderSettingsControls } from '../ui/hud/settingsOrder';

describe('orderSettingsControls', () => {
  it('moves graphics quality first and customization last', () => {
    const container = document.createElement('div');
    const customization = document.createElement('section');
    customization.className = 'hud-customization';
    const language = document.createElement('section');
    const audio = document.createElement('section');
    const graphics = document.createElement('section');
    graphics.className = 'graphics-quality';

    container.append(customization, language, audio, graphics);

    orderSettingsControls(container, { first: graphics, last: customization });

    expect(container.firstElementChild).toBe(graphics);
    expect(container.lastElementChild).toBe(customization);
    expect(Array.from(container.children)).toEqual([
      graphics,
      language,
      audio,
      customization,
    ]);
  });
});
