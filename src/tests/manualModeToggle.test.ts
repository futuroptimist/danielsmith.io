import { describe, expect, it, vi } from 'vitest';

import {
  createManualModeToggle,
  type ManualModeToggleHandle,
} from '../systems/failover/manualModeToggle';

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

  it('activates via click, shows pending state, then marks text mode active', async () => {
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
    expect(container.dataset.modeToggleState).toBe('idle');
    expect(container.getAttribute('aria-busy')).toBe('false');
    expect(handle.element.dataset.state).toBe('idle');
    expect(handle.element.textContent).toBe('Text mode · Press T');
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');
    expect(handle.element.getAttribute('aria-busy')).toBe('false');

    handle.element.click();

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(handle.element.disabled).toBe(true);
    expect(container.dataset.modeToggleState).toBe('pending');
    expect(container.getAttribute('aria-busy')).toBe('true');
    expect(handle.element.dataset.state).toBe('pending');
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Switch to the text-only portfolio. Switching to text mode…'
    );
    expect(handle.element.getAttribute('aria-pressed')).toBe('false');
    expect(handle.element.getAttribute('aria-busy')).toBe('true');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handle.element.dataset.state).toBe('active');
    expect(container.dataset.modeToggleState).toBe('active');
    expect(container.getAttribute('aria-busy')).toBe('false');
    expect(handle.element.textContent).toBe('Text mode active');
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Text mode already active.'
    );
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');
    expect(handle.element.getAttribute('aria-busy')).toBe('false');
    expect(handle.element.disabled).toBe(true);

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
      'Text mode already active.'
    );
    expect(container.dataset.modeToggleState).toBe('active');
    expect(container.getAttribute('aria-busy')).toBe('false');
    expect(handle.element.dataset.state).toBe('active');
    expect(handle.element.textContent).toBe('Text mode active');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');
    expect(handle.element.getAttribute('aria-busy')).toBe('false');
    expect(handle.element.disabled).toBe(true);

    handle.element.click();

    expect(onToggle).not.toHaveBeenCalled();
    expect(handle.element.disabled).toBe(true);
    expect(handle.element.dataset.state).toBe('active');
    expect(handle.element.getAttribute('aria-pressed')).toBe('true');

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
    expect(container.dataset.modeToggleState).toBe('idle');
    expect(container.getAttribute('aria-busy')).toBe('false');
    expect(handle.element.dataset.state).toBe('idle');
    expect(handle.element.dataset.hudAnnounce).toBe(
      'Switch to the text-only portfolio. Press T to activate.'
    );
    expect(handle.element.getAttribute('aria-busy')).toBe('false');

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
    });

    const event = new KeyboardEvent('keydown', { key: 't' });
    window.dispatchEvent(event);

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

    handle.element.click();
    expect(onToggle).not.toHaveBeenCalled();

    const event = new KeyboardEvent('keydown', { key: 'T' });
    window.dispatchEvent(event);
    expect(onToggle).not.toHaveBeenCalled();

    container.remove();
  });
});
