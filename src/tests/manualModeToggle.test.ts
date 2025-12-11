import { describe, expect, it, vi } from 'vitest';

import {
  createManualModeToggle,
  type ManualModeToggleHandle,
} from '../systems/failover/manualModeToggle';

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
};

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

describe('createManualModeToggle', () => {
  it('activates via click and marks text mode active', async () => {
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

    expect(handle.element.getAttribute('aria-disabled')).toBeNull();
    expect(container.getAttribute('aria-disabled')).toBeNull();
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Switch to the text-only portfolio. Press T to activate.'
    );
    expect(container.dataset.modeToggleState).toBe('idle');
    expect(container.getAttribute('aria-busy')).toBeNull();
    expect(handle.element.dataset.state).toBe('idle');
    expect(handle.element.textContent).toBe('Text mode · Press T');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');
    expect(handle.element.getAttribute('aria-busy')).toBeNull();

    handle.element.click();

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(handle.element.disabled).toBe(true);
    expect(handle.element.getAttribute('aria-disabled')).toBe('true');
    expect(container.getAttribute('aria-disabled')).toBe('true');
    expect(container.dataset.modeToggleState).toBe('pending');
    expect(container.getAttribute('aria-busy')).toBe('true');
    expect(handle.element.dataset.state).toBe('pending');
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Switch to the text-only portfolio. Switching to text mode…'
    );
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');
    expect(handle.element.getAttribute('aria-busy')).toBe('true');

    await flushMicrotasks();

    expect(handle.element.dataset.state).toBe('active');
    expect(container.dataset.modeToggleState).toBe('active');
    expect(container.getAttribute('aria-disabled')).toBe('true');
    expect(container.getAttribute('aria-busy')).toBeNull();
    expect(handle.element.textContent).toBe('Text mode active');
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Text mode already active.'
    );
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');
    expect(handle.element.getAttribute('aria-busy')).toBeNull();
    expect(handle.element.disabled).toBe(true);

    cleanupHandle(handle);
    container.remove();
  });

  it('restores idle state after pending completes without activating fallback', async () => {
    const container = createContainer();
    let resolveToggle: (() => void) | null = null;
    const onToggle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveToggle = resolve;
        })
    );
    const handle = createManualModeToggle({
      container,
      onToggle,
      getIsFallbackActive: () => false,
    });

    handle.element.click();
    const togglePromise = onToggle.mock.results[0]?.value as
      | Promise<void>
      | undefined;

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(handle.element.getAttribute('aria-busy')).toBe('true');
    expect(handle.element.getAttribute('aria-disabled')).toBe('true');
    expect(container.getAttribute('aria-disabled')).toBe('true');
    expect(container.dataset.modeToggleState).toBe('pending');

    resolveToggle?.();
    await togglePromise;
    await flushMicrotasks();

    expect(handle.element.getAttribute('aria-busy')).toBeNull();
    expect(handle.element.getAttribute('aria-disabled')).toBeNull();
    expect(container.getAttribute('aria-disabled')).toBeNull();
    expect(container.dataset.modeToggleState).toBe('idle');

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

    expect(handle.element.getAttribute('aria-disabled')).toBe('true');
    expect(container.getAttribute('aria-disabled')).toBe('true');
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Text mode already active.'
    );
    expect(container.dataset.modeToggleState).toBe('active');
    expect(container.getAttribute('aria-busy')).toBeNull();
    expect(handle.element.dataset.state).toBe('active');
    expect(handle.element.textContent).toBe('Text mode active');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');
    expect(handle.element.getAttribute('aria-busy')).toBeNull();
    expect(handle.element.disabled).toBe(true);

    handle.element.click();

    expect(onToggle).not.toHaveBeenCalled();
    expect(handle.element.disabled).toBe(true);
    expect(handle.element.dataset.state).toBe('active');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');

    cleanupHandle(handle);
    container.remove();
  });

  it('re-enables the control if onToggle rejects', async () => {
    const container = createContainer();
    const onToggle = vi
      .fn()
      .mockImplementation(() => Promise.reject(new Error('failed')));
    const handle = createManualModeToggle({
      container,
      onToggle,
      getIsFallbackActive: () => false,
    });

    handle.element.click();
    const togglePromise = onToggle.mock.results[0]?.value as
      | Promise<void>
      | undefined;
    await expect(togglePromise).rejects.toThrow('failed');
    await flushMicrotasks();

    expect(handle.element.disabled).toBe(false);
    expect(handle.element.getAttribute('aria-disabled')).toBeNull();
    expect(container.getAttribute('aria-disabled')).toBeNull();
    expect(container.dataset.modeToggleState).toBe('idle');
    expect(container.getAttribute('aria-busy')).toBeNull();
    expect(handle.element.dataset.state).toBe('idle');
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Switch to the text-only portfolio. Press T to activate.'
    );
    expect(handle.element.getAttribute('aria-busy')).toBeNull();

    cleanupHandle(handle);
    container.remove();
  });

  it('activates via keyboard using the key hint', async () => {
    const container = createContainer();
    const onToggle = vi.fn();
    const handle = createManualModeToggle({
      container,
      onToggle,
      getIsFallbackActive: () => false,
    });

    const event = new KeyboardEvent('keydown', { key: 't' });
    window.dispatchEvent(event);
    await flushMicrotasks();

    expect(onToggle).toHaveBeenCalledTimes(1);

    cleanupHandle(handle);
    container.remove();
  });

  it('updates localized copy and key hint when strings change', () => {
    const container = createContainer();
    const onToggle = vi.fn();
    const handle = createManualModeToggle({
      container,
      onToggle,
      getIsFallbackActive: () => false,
    });

    const customStrings = {
      keyHint: 'Y',
      idleLabel: 'Modo texto · Pulsa Y',
      idleDescription: 'Cambiar al portafolio textual',
      idleHudAnnouncement:
        'Cambiar al portafolio textual. Pulsa Y para activar.',
      idleTitle: 'Cambiar al portafolio textual (Y)',
      pendingLabel: 'Cambiando al modo texto…',
      pendingHudAnnouncement: 'Cambiando al modo texto…',
      activeLabel: 'Modo texto activo',
      activeDescription: 'El modo texto ya está activo.',
      activeHudAnnouncement: 'El modo texto ya está activo.',
    };

    handle.setStrings(customStrings);

    expect(handle.element.textContent).toBe(customStrings.idleLabel);
    expect(handle.element.dataset.hudAnnounce).toBe(
      customStrings.idleHudAnnouncement
    );
    expect(handle.element.title).toBe(customStrings.idleTitle);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));

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
    expect(container.dataset.modeToggleState).toBeUndefined();
    expect(container.hasAttribute('aria-busy')).toBe(false);
    expect(container.hasAttribute('aria-disabled')).toBe(false);

    handle.element.click();
    expect(onToggle).not.toHaveBeenCalled();

    const event = new KeyboardEvent('keydown', { key: 'T' });
    window.dispatchEvent(event);
    expect(onToggle).not.toHaveBeenCalled();

    container.remove();
  });
});
