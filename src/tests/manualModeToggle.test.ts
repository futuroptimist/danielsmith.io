import { describe, expect, it, vi } from 'vitest';

import { createManualModeToggle } from '../systems/failover/manualModeToggle';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createManualModeToggle', () => {
  it('exposes idle state accessibility metadata', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const toggle = createManualModeToggle({
      container,
      onToggle: () => {},
      getIsFallbackActive: () => false,
    });

    expect(toggle.element.getAttribute('aria-disabled')).toBe('false');
    expect(container.getAttribute('aria-disabled')).toBe('false');
    expect(toggle.element.getAttribute('aria-busy')).toBe('false');
    expect(container.dataset.modeToggleState).toBe('idle');

    toggle.dispose();
    container.remove();
  });

  it('applies pending state when toggle is processing', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    let resolveToggle: (() => void) | null = null;
    const onToggle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveToggle = resolve;
        })
    );

    const toggle = createManualModeToggle({
      container,
      onToggle,
      getIsFallbackActive: () => false,
    });

    toggle.element.click();

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(toggle.element.getAttribute('aria-busy')).toBe('true');
    expect(toggle.element.getAttribute('aria-disabled')).toBe('true');
    expect(container.getAttribute('aria-disabled')).toBe('true');
    expect(container.dataset.modeToggleState).toBe('pending');

    resolveToggle?.();
    await flush();
    await flush();

    expect(toggle.element.getAttribute('aria-busy')).toBe('false');
    expect(toggle.element.getAttribute('aria-disabled')).toBe('false');
    expect(container.dataset.modeToggleState).toBe('idle');

    toggle.dispose();
    container.remove();
  });

  it('locks the control when fallback mode is already active', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const toggle = createManualModeToggle({
      container,
      onToggle: () => {},
      getIsFallbackActive: () => true,
    });

    expect(toggle.element.getAttribute('aria-disabled')).toBe('true');
    expect(container.getAttribute('aria-disabled')).toBe('true');
    expect(toggle.element.getAttribute('aria-pressed')).toBe('true');
    expect(container.dataset.modeToggleState).toBe('active');

    toggle.dispose();
    container.remove();
  });
});
