import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNarrationToggleControl } from '../systems/controls/narrationToggleControl';

const strings = {
  labelEnabled: 'Narration: On',
  labelDisabled: 'Narration: Off',
  descriptionEnabled:
    'Narration popups and captions are enabled. Activate to hide them.',
  descriptionDisabled:
    'Narration popups and captions are hidden until you turn them on.',
};

describe('createNarrationToggleControl', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts off by default and updates UI when toggled', () => {
    const onToggle = vi.fn();
    const handle = createNarrationToggleControl({
      container: document.body,
      onToggle,
      strings,
    });

    expect(handle.element.textContent).toBe('Narration: Off');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');

    handle.element.click();

    expect(onToggle).toHaveBeenCalledWith(true);
    expect(handle.element.textContent).toBe('Narration: On');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');

    handle.dispose();
  });

  it('reflects external preference changes', () => {
    const handle = createNarrationToggleControl({
      container: document.body,
      initialEnabled: true,
      strings,
    });

    handle.setEnabled(false);

    expect(handle.element.textContent).toBe('Narration: Off');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');

    handle.dispose();
  });
});
