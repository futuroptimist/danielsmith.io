import { describe, expect, it, vi } from 'vitest';

import { ControlOverlay } from '../hud/controlOverlay';

interface WindowStubOptions {
  coarse?: boolean;
  fine?: boolean;
  maxTouchPoints?: number;
  mobile?: boolean;
}

interface WindowStub {
  matchMedia?: (query: string) => MediaQueryList;
  navigator: Navigator;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject
  ) => void;
}

interface PointerListenerRegistry {
  getListener(type: string): EventListenerOrEventListenerObject | undefined;
}

const MATCH_MEDIA_QUERIES = {
  coarse: '(pointer: coarse)',
  fine: '(pointer: fine)',
} as const;

function createMatchMediaStub(options: WindowStubOptions): (query: string) => MediaQueryList {
  return (query: string) => {
    const matches =
      query === MATCH_MEDIA_QUERIES.coarse
        ? Boolean(options.coarse)
        : query === MATCH_MEDIA_QUERIES.fine
          ? Boolean(options.fine)
          : false;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    };
  };
}

function createWindowStub(
  options: WindowStubOptions = {}
): { window: WindowStub; registry: PointerListenerRegistry } {
  const listeners = new Map<string, EventListenerOrEventListenerObject>();
  const matchMedia = options.coarse ?? options.fine ? createMatchMediaStub(options) : undefined;
  const navigatorLike = {
    maxTouchPoints: options.maxTouchPoints ?? 0,
  } as Navigator & { userAgentData?: { mobile?: boolean } };
  if (options.mobile) {
    navigatorLike.userAgentData = { mobile: true };
  }

  const windowStub: WindowStub = {
    matchMedia,
    navigator: navigatorLike,
    addEventListener: (type, listener) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type, listener) => {
      const current = listeners.get(type);
      if (current === listener) {
        listeners.delete(type);
      }
    },
  };

  const registry: PointerListenerRegistry = {
    getListener: (type) => listeners.get(type),
  };

  return { window: windowStub, registry };
}

function createOverlayElement(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <ul>
      <li class="overlay__item overlay__item--desktop">Desktop</li>
      <li class="overlay__item overlay__item--touch">Touch</li>
    </ul>
  `;
  return overlay;
}

function getItems(overlay: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(overlay.querySelectorAll<HTMLElement>(selector));
}

describe('ControlOverlay', () => {
  it('defaults to desktop mode when only fine pointer is reported', () => {
    const overlay = createOverlayElement();
    const { window: windowStub } = createWindowStub({ fine: true });
    const controlOverlay = new ControlOverlay(overlay, { window: windowStub });

    expect(controlOverlay.getMode()).toBe('desktop');
    const desktopItems = getItems(overlay, '.overlay__item--desktop');
    const touchItems = getItems(overlay, '.overlay__item--touch');
    desktopItems.forEach((item) => expect(item.hidden).toBe(false));
    touchItems.forEach((item) => expect(item.hidden).toBe(true));
    expect(overlay.dataset.inputMode).toBe('desktop');
  });

  it('defaults to touch mode when only coarse pointer is reported', () => {
    const overlay = createOverlayElement();
    const { window: windowStub } = createWindowStub({ coarse: true });
    const controlOverlay = new ControlOverlay(overlay, { window: windowStub });

    expect(controlOverlay.getMode()).toBe('touch');
    const desktopItems = getItems(overlay, '.overlay__item--desktop');
    const touchItems = getItems(overlay, '.overlay__item--touch');
    desktopItems.forEach((item) => expect(item.hidden).toBe(true));
    touchItems.forEach((item) => expect(item.hidden).toBe(false));
    expect(overlay.dataset.inputMode).toBe('touch');
  });

  it('falls back to touch mode using navigator touch points when matchMedia is unavailable', () => {
    const overlay = createOverlayElement();
    const { window: windowStub } = createWindowStub({ maxTouchPoints: 3 });
    const controlOverlay = new ControlOverlay(overlay, { window: windowStub });

    expect(controlOverlay.getMode()).toBe('touch');
    const desktopItems = getItems(overlay, '.overlay__item--desktop');
    const touchItems = getItems(overlay, '.overlay__item--touch');
    desktopItems.forEach((item) => expect(item.hidden).toBe(true));
    touchItems.forEach((item) => expect(item.hidden).toBe(false));
  });

  it('uses navigator mobile hint when provided', () => {
    const overlay = createOverlayElement();
    const { window: windowStub } = createWindowStub({ mobile: true });
    const controlOverlay = new ControlOverlay(overlay, { window: windowStub });

    expect(controlOverlay.getMode()).toBe('touch');
  });

  it('enters all mode when coarse and fine pointers are available', () => {
    const overlay = createOverlayElement();
    const { window: windowStub } = createWindowStub({ coarse: true, fine: true });
    const controlOverlay = new ControlOverlay(overlay, { window: windowStub });

    expect(controlOverlay.getMode()).toBe('all');
    const desktopItems = getItems(overlay, '.overlay__item--desktop');
    const touchItems = getItems(overlay, '.overlay__item--touch');
    desktopItems.forEach((item) => expect(item.hidden).toBe(false));
    touchItems.forEach((item) => expect(item.hidden).toBe(false));
  });

  it('updates mode based on pointer events', () => {
    const overlay = createOverlayElement();
    const { window: windowStub, registry } = createWindowStub({ fine: true });
    const controlOverlay = new ControlOverlay(overlay, { window: windowStub });

    const listener = registry.getListener('pointerdown');
    expect(listener).toBeTypeOf('function');
    if (typeof listener === 'function') {
      listener({ pointerType: 'touch' } as PointerEvent);
      expect(controlOverlay.getMode()).toBe('touch');
      listener({ pointerType: 'mouse' } as PointerEvent);
      expect(controlOverlay.getMode()).toBe('desktop');
      listener({ pointerType: 'pen' } as PointerEvent);
      expect(controlOverlay.getMode()).toBe('touch');
      listener({ pointerType: 'unknown' } as PointerEvent);
      expect(controlOverlay.getMode()).toBe('touch');
    }
  });

  it('does not reapply visibility when mode remains unchanged', () => {
    const overlay = createOverlayElement();
    const { window: windowStub } = createWindowStub({ fine: true });
    const controlOverlay = new ControlOverlay(overlay, { window: windowStub });

    const initialMode = controlOverlay.getMode();
    controlOverlay.setMode(initialMode);
    expect(controlOverlay.getMode()).toBe(initialMode);
  });

  it('cleans up pointer listeners on dispose', () => {
    const overlay = createOverlayElement();
    const { window: windowStub, registry } = createWindowStub({ fine: true });
    const controlOverlay = new ControlOverlay(overlay, { window: windowStub });

    const listener = registry.getListener('pointerdown');
    expect(listener).toBeDefined();
    controlOverlay.dispose();
    expect(registry.getListener('pointerdown')).toBeUndefined();
  });
});
