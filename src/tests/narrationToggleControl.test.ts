import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNarrationToggleControl } from '../systems/controls/narrationToggleControl';

describe('createNarrationToggleControl', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts off by default and toggles persisted state callbacks', () => {
    const onToggle = vi.fn();
    const control = createNarrationToggleControl({
      container: document.body,
      onToggle,
      strings: {
        labelEnabled: 'Narration: On',
        labelDisabled: 'Narration: Off',
        descriptionEnabled: 'Narration popups are shown.',
        descriptionDisabled: 'Narration popups are hidden.',
      },
    });

    expect(control.element.textContent).toBe('Narration: Off');
    expect(control.element.getAttribute('aria-pressed')).toBe('false');

    control.element.click();

    expect(onToggle).toHaveBeenLastCalledWith(true);
    expect(control.element.textContent).toBe('Narration: On');
    expect(control.element.getAttribute('aria-pressed')).toBe('true');

    control.element.click();

    expect(onToggle).toHaveBeenLastCalledWith(false);
    expect(control.element.textContent).toBe('Narration: Off');
    control.dispose();
  });

  it('updates UI when external preference changes arrive', () => {
    const control = createNarrationToggleControl({
      container: document.body,
      initialEnabled: true,
    });

    control.setEnabled(false);

    expect(control.element.textContent).toBe('Narration: Off');
    expect(control.element.getAttribute('aria-pressed')).toBe('false');
    control.dispose();
  });
});
