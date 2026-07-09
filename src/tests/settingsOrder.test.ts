import { afterEach, describe, expect, it, vi } from 'vitest';

import { applySettingsControlOrder } from '../ui/hud/settingsOrder';

describe('applySettingsControlOrder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('warns when an anchor control has not been registered yet', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = document.createElement('div');
    const customization = document.createElement('section');
    customization.className = 'hud-customization';
    const graphics = document.createElement('section');
    graphics.className = 'graphics-quality';
    const language = document.createElement('section');
    language.className = 'locale-toggle';

    container.append(customization, language);

    applySettingsControlOrder({
      container,
      graphicsQuality: graphics,
      customization,
    });

    expect(warn).toHaveBeenCalledWith(
      'Graphics Quality settings control must be registered before applying Settings ordering.'
    );
    expect(Array.from(container.children)).toEqual([language, customization]);
  });
});
