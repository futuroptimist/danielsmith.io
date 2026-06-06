import { describe, expect, it, vi } from 'vitest';

import { createNarrationToggleControl } from '../systems/controls/narrationToggleControl';

describe('narrationToggleControl', () => {
  it('starts off by default and toggles persisted preference callback state', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onToggle = vi.fn();

    const handle = createNarrationToggleControl({ container, onToggle });

    expect(handle.element.textContent).toBe('Narration off');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');

    handle.element.click();

    expect(onToggle).toHaveBeenLastCalledWith(true);
    expect(handle.element.textContent).toBe('Narration on');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');

    handle.element.click();

    expect(onToggle).toHaveBeenLastCalledWith(false);
    expect(handle.element.textContent).toBe('Narration off');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');

    handle.dispose();
    document.body.innerHTML = '';
  });

  it('updates labels from preference subscription state', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = createNarrationToggleControl({
      container,
      initialEnabled: true,
    });

    expect(handle.element.textContent).toBe('Narration on');

    handle.setEnabled(false);

    expect(handle.element.textContent).toBe('Narration off');

    handle.dispose();
    document.body.innerHTML = '';
  });
});
