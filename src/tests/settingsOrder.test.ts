import { describe, expect, it } from 'vitest';

import { applySettingsControlOrder } from '../ui/hud/settingsOrder';

describe('applySettingsControlOrder', () => {
  it('places graphics quality first and customization last', () => {
    const container = document.createElement('div');
    const customization = document.createElement('section');
    customization.className = 'hud-customization';
    const language = document.createElement('section');
    language.className = 'locale-toggle';
    const motionBlur = document.createElement('section');
    motionBlur.className = 'motion-blur-control';
    const graphics = document.createElement('section');
    graphics.className = 'graphics-quality';

    container.append(customization, language, motionBlur, graphics);

    applySettingsControlOrder({
      container,
      graphicsQuality: graphics,
      customization,
    });

    expect(Array.from(container.children)).toEqual([
      graphics,
      language,
      motionBlur,
      customization,
    ]);
  });
});
