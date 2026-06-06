import { describe, expect, it, vi } from 'vitest';

import { createNarrationToggleControl } from '../systems/controls/narrationToggleControl';

describe('narrationToggleControl', () => {
  it('defaults to the off state and toggles persisted preference callbacks', () => {
    const container = document.createElement('div');
    const onToggle = vi.fn();

    const handle = createNarrationToggleControl({ container, onToggle });

    expect(handle.element.textContent).toBe('Narration: Off');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');

    handle.element.click();

    expect(onToggle).toHaveBeenCalledWith(true);
    expect(handle.element.textContent).toBe('Narration: On');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');

    handle.dispose();
  });

  it('updates localized strings without changing state', () => {
    const container = document.createElement('div');
    const handle = createNarrationToggleControl({
      container,
      initialEnabled: true,
    });

    handle.setStrings({
      labelEnabled: 'Narración: activada',
      labelDisabled: 'Narración: desactivada',
      descriptionEnabled: 'Desactivar narración.',
      descriptionDisabled: 'Activar narración.',
    });

    expect(handle.element.textContent).toBe('Narración: activada');
    expect(handle.element.title).toBe('Desactivar narración.');

    handle.dispose();
  });
});
