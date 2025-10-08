import { describe, expect, it, vi } from 'vitest';

import {
  createManualModeToggle,
  type ManualModeToggleHandle,
} from '../failover/manualModeToggle';

describe('createManualModeToggle', () => {
  const createContainer = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return container;
  };

  const cleanupHandle = (handle: ManualModeToggleHandle) => {
    handle.dispose();
    if (handle.element.parentElement) {
      handle.element.remove();
    }
  };

  it('activates via click and disables while pending', () => {
    const container = createContainer();
    let fallbackActive = false;
    const onToggle = vi.fn(() => {
      fallbackActive = true;
    });
    const handle = createManualModeToggle({
      container,
      onToggle,
      getIsFallbackActive: () => fallbackActive,
    });

    expect(handle.element.dataset.hudAnnounce).toBe(
      'Switch to the text-only portfolio. Press T to activate.'
    );

    handle.element.click();

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(handle.element.disabled).toBe(true);
    expect(handle.element.dataset.state).toBe('pending');
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Switch to the text-only portfolio. Switching to text mode…'
    );

    cleanupHandle(handle);
    container.remove();
  });

  it('ignores activation when fallback already active', () => {
    const container = createContainer();
    const onToggle = vi.fn();
    const handle = createManualModeToggle({
      container,
      onToggle,
      getIsFallbackActive: () => true,
    });

    expect(handle.element.dataset.hudAnnounce).toBe(
      'Switch to the text-only portfolio. Text mode already active.'
    );

    handle.element.click();

    expect(onToggle).not.toHaveBeenCalled();
    expect(handle.element.disabled).toBe(false);
    expect(handle.element.dataset.state).toBe('idle');

    cleanupHandle(handle);
    container.remove();
  });

  it('re-enables the button if onToggle rejects', async () => {
    const container = createContainer();
    const handle = createManualModeToggle({
      container,
      onToggle: vi
        .fn()
        .mockImplementation(() => Promise.reject(new Error('failed'))),
      getIsFallbackActive: () => false,
    });

    handle.element.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handle.element.disabled).toBe(false);
    expect(handle.element.dataset.state).toBe('idle');
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Switch to the text-only portfolio. Press T to activate.'
    );

    cleanupHandle(handle);
    container.remove();
  });

  it('activates via keyboard using the key hint', () => {
    const container = createContainer();
    const onToggle = vi.fn();
    const handle = createManualModeToggle({
      container,
      onToggle,
      getIsFallbackActive: () => false,
      keyHint: 'T',
    });

    const event = new KeyboardEvent('keydown', { key: 't' });
    window.dispatchEvent(event);

    expect(onToggle).toHaveBeenCalledTimes(1);

    cleanupHandle(handle);
    container.remove();
  });

  it('removes listeners and element on dispose', () => {
    const container = createContainer();
    const onToggle = vi.fn();
    const handle = createManualModeToggle({
      container,
      onToggle,
      getIsFallbackActive: () => false,
    });

    handle.dispose();

    expect(container.contains(handle.element)).toBe(false);

    handle.element.click();
    expect(onToggle).not.toHaveBeenCalled();

    const event = new KeyboardEvent('keydown', { key: 'T' });
    window.dispatchEvent(event);
    expect(onToggle).not.toHaveBeenCalled();

    container.remove();
  });
});
