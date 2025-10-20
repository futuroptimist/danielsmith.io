import { describe, expect, it, vi } from 'vitest';

import { createTourGuideToggleControl } from '../systems/controls/tourGuideToggleControl';

describe('tourGuideToggleControl', () => {
  it('renders an enabled toggle by default', () => {
    const container = document.createElement('div');
    const handle = createTourGuideToggleControl({ container });

    expect(container.querySelector('.tour-toggle')).toBe(handle.element);
    expect(handle.element.dataset.state).toBe('enabled');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');
    expect(handle.element.dataset.hudAnnounce).toContain('Guided tour on');

    handle.dispose();
  });

  it('toggles state on click and invokes the callback', () => {
    const container = document.createElement('div');
    const onToggle = vi.fn();
    const handle = createTourGuideToggleControl({
      container,
      initialEnabled: true,
      onToggle,
    });

    handle.element.click();
    expect(handle.element.dataset.state).toBe('disabled');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');
    expect(onToggle).toHaveBeenCalledWith(false);

    handle.element.click();
    expect(handle.element.dataset.state).toBe('enabled');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');
    expect(onToggle).toHaveBeenLastCalledWith(true);

    handle.dispose();
  });

  it('supports programmatic updates without triggering the callback', () => {
    const container = document.createElement('div');
    const onToggle = vi.fn();
    const handle = createTourGuideToggleControl({
      container,
      initialEnabled: false,
      onToggle,
    });

    handle.setEnabled(true);
    expect(handle.element.dataset.state).toBe('enabled');
    expect(onToggle).not.toHaveBeenCalled();

    handle.setEnabled(false);
    expect(handle.element.dataset.state).toBe('disabled');
    expect(onToggle).not.toHaveBeenCalled();

    handle.dispose();
  });

  it('cleans up DOM and listeners on dispose', () => {
    const container = document.createElement('div');
    const handle = createTourGuideToggleControl({ container });

    const button = handle.element;
    handle.dispose();

    expect(container.contains(button)).toBe(false);

    button.click();
    expect(button.dataset.state).toBe('enabled');
  });
});
