import { describe, expect, it, vi } from 'vitest';

import { createDebugCoordinatesControl } from '../systems/controls/debugCoordinatesControl';

describe('debugCoordinatesControl', () => {
  it('defaults to the disabled debug coordinates state', () => {
    const container = document.createElement('div');
    const handle = createDebugCoordinatesControl({ container });

    expect(container.querySelector('.debug-coordinates-toggle')).toBe(
      handle.element
    );
    expect(handle.element.dataset.state).toBe('disabled');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');
    expect(handle.element.dataset.hudAnnounce).toContain(
      'Debug coordinates off'
    );

    handle.dispose();
  });

  it('toggles state on click and notifies consumers', () => {
    const container = document.createElement('div');
    const onToggle = vi.fn();
    const handle = createDebugCoordinatesControl({ container, onToggle });

    handle.element.click();
    expect(handle.element.dataset.state).toBe('enabled');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');
    expect(onToggle).toHaveBeenCalledWith(true);

    handle.element.click();
    expect(handle.element.dataset.state).toBe('disabled');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');
    expect(onToggle).toHaveBeenLastCalledWith(false);

    handle.dispose();
  });
});
