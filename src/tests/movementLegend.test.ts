import { describe, expect, it, vi } from 'vitest';

import { createMovementLegend } from '../ui/hud/movementLegend';

function createOverlayContainer(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <ul>
      <li class="overlay__item" data-input-methods="keyboard">
        <span class="overlay__keys">WASD / Arrow keys</span>
        <span class="overlay__description">Move</span>
      </li>
      <li class="overlay__item" data-input-methods="pointer">
        <span class="overlay__keys">Left mouse</span>
        <span class="overlay__description">Pan</span>
      </li>
      <li class="overlay__item" data-input-methods="touch">
        <span class="overlay__keys">Touch</span>
        <span class="overlay__description">Drag</span>
      </li>
      <li class="overlay__item" data-input-methods="gamepad">
        <span class="overlay__keys">A</span>
        <span class="overlay__description">Interact</span>
      </li>
      <li
        class="overlay__item"
        data-role="interact"
        data-input-methods="keyboard pointer touch gamepad"
        hidden
      >
        <span class="overlay__keys" data-role="interact-label">F</span>
        <span class="overlay__description" data-role="interact-description">
          Interact
        </span>
      </li>
    </ul>
  `;
  return wrapper.firstElementChild as HTMLElement;
}

function createStubWindow(
  options: {
    maxTouchPoints?: number;
    coarsePointer?: boolean;
  } = {}
) {
  const { maxTouchPoints = 0, coarsePointer = false } = options;
  class StubWindow extends EventTarget {
    navigator = { maxTouchPoints };
    matchMedia(query: string) {
      const matches =
        coarsePointer && query === '(hover: none) and (pointer: coarse)';
      return {
        matches,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
      };
    }
  }
  return new StubWindow() as unknown as Window;
}

function dispatchPointerEvent(target: Window, pointerType: string): void {
  let event: Event;
  if (typeof window.PointerEvent === 'function') {
    event = new window.PointerEvent('pointerdown', { pointerType });
  } else {
    event = new window.Event('pointerdown');
    Object.assign(event, { pointerType });
  }
  target.dispatchEvent(event);
}

class GamepadStubWindow extends EventTarget {
  navigator = {
    language: 'en-US',
    getGamepads: () => this.gamepads,
  };

  private nextFrameId = 1;

  private scheduled = new Map<number, FrameRequestCallback>();

  readonly cancelled: number[] = [];

  gamepads: Array<{
    connected: boolean;
    buttons: Array<{ pressed: boolean; value?: number }>;
    axes: number[];
  }> = [
    {
      connected: true,
      buttons: [{ pressed: false, value: 0 }],
      axes: [0, 0],
    },
  ];

  requestAnimationFrame(callback: FrameRequestCallback): number {
    const id = this.nextFrameId++;
    this.scheduled.set(id, callback);
    return id;
  }

  cancelAnimationFrame(id: number): void {
    if (this.scheduled.delete(id)) {
      this.cancelled.push(id);
    }
  }

  flushFrame(): void {
    const pending = Array.from(this.scheduled.entries());
    this.scheduled.clear();
    pending.forEach(([id, callback]) => {
      callback(id);
    });
  }
}

function createVisibilityMockWindow() {
  let scheduled: FrameRequestCallback | null = null;
  let activeId: number | null = null;
  let nextId = 1;
  let visibility: Document['visibilityState'] = 'visible';
  let gamepads: Array<{ connected: boolean; buttons: [{ pressed: boolean }] }> =
    [{ connected: true, buttons: [{ pressed: true }] }];

  const visibilityListeners = new Set<EventListener>();
  const listenerMap = new Map<
    EventListenerOrEventListenerObject,
    EventListener
  >();

  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    scheduled = callback;
    activeId = nextId;
    nextId += 1;
    return activeId;
  });

  const cancelAnimationFrame = vi.fn((id: number) => {
    if (id === activeId) {
      scheduled = null;
      activeId = null;
    }
  });

  const documentTarget: Document = {
    get visibilityState() {
      return visibility;
    },
    addEventListener: (_type, listener) => {
      const normalized =
        typeof listener === 'function'
          ? listener
          : listener.handleEvent.bind(listener);
      listenerMap.set(listener, normalized);
      visibilityListeners.add(normalized);
    },
    removeEventListener: (_type, listener) => {
      const normalized = listenerMap.get(listener);
      if (normalized) {
        visibilityListeners.delete(normalized);
        listenerMap.delete(listener);
      }
    },
  } as Document;

  const triggerFrame = () => {
    const callback = scheduled;
    if (!callback) {
      return;
    }
    scheduled = null;
    callback(0);
  };

  const setVisibility = (state: Document['visibilityState']) => {
    visibility = state;
    visibilityListeners.forEach((listener) =>
      listener(new Event('visibility'))
    );
  };

  const windowTarget: Window = {
    navigator: {
      getGamepads: () => gamepads,
    } as Navigator,
    document: documentTarget,
    requestAnimationFrame,
    cancelAnimationFrame,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as Window;

  return {
    windowTarget,
    requestAnimationFrame,
    cancelAnimationFrame,
    triggerFrame,
    setVisibility,
    setGamepads: (next: typeof gamepads) => {
      gamepads = next;
    },
    hasScheduledFrame: () => scheduled !== null,
  };
}

describe('createMovementLegend', () => {
  it('highlights the configured input method and allows manual switching', () => {
    const container = createOverlayContainer();
    const legend = createMovementLegend({
      container,
      initialMethod: 'keyboard',
    });

    expect(container.dataset.localeDirection).toBe('ltr');
    expect(container.getAttribute('dir')).toBe('ltr');

    const [keyboardItem, pointerItem] = container.querySelectorAll('li');
    expect(keyboardItem?.dataset.state).toBe('active');
    expect(pointerItem?.dataset.state).toBeUndefined();

    legend.setActiveMethod('pointer');
    expect(keyboardItem?.dataset.state).toBeUndefined();
    expect(pointerItem?.dataset.state).toBe('active');

    legend.dispose();
  });

  it('updates the interact prompt visibility and labels per input method', () => {
    const container = createOverlayContainer();
    const legend = createMovementLegend({
      container,
      initialMethod: 'keyboard',
    });

    const interactItem = container.querySelector('[data-role="interact"]');
    const interactLabel = container.querySelector(
      '[data-role="interact-label"]'
    );
    const interactDescription = container.querySelector(
      '[data-role="interact-description"]'
    );

    legend.setInteractPrompt('Inspect Futuroptimist');
    expect(interactItem?.hidden).toBe(false);
    expect(interactDescription?.textContent).toBe(
      'Press F to Inspect Futuroptimist'
    );
    expect(interactLabel?.textContent).toBe('F');
    expect(interactItem?.dataset.hudAnnounce).toBe('F — Inspect Futuroptimist');

    legend.setActiveMethod('touch');
    expect(interactLabel?.textContent).toBe('Tap');
    expect(interactDescription?.textContent).toBe(
      'Tap to Inspect Futuroptimist'
    );
    expect(interactItem?.dataset.hudAnnounce).toBe(
      'Tap — Inspect Futuroptimist'
    );

    legend.setActiveMethod('gamepad');
    expect(interactLabel?.textContent).toBe('A');
    expect(interactDescription?.textContent).toBe(
      'Press A to Inspect Futuroptimist'
    );
    expect(interactItem?.dataset.hudAnnounce).toBe('A — Inspect Futuroptimist');

    legend.setInteractPrompt(null);
    expect(interactItem?.hidden).toBe(true);
    expect(interactDescription?.textContent).toBe('Interact');
    expect(interactItem?.dataset.hudAnnounce).toBeUndefined();

    legend.dispose();
  });

  it('updates the keyboard interact label when bindings change', () => {
    const container = createOverlayContainer();
    const legend = createMovementLegend({
      container,
      initialMethod: 'keyboard',
    });

    const interactLabel = container.querySelector(
      '[data-role="interact-label"]'
    );
    const interactDescription = container.querySelector(
      '[data-role="interact-description"]'
    );

    legend.setInteractPrompt('Inspect Exhibit');
    legend.setKeyboardInteractLabel('E');
    expect(interactLabel?.textContent).toBe('E');
    expect(interactDescription?.textContent).toBe('Press E to Inspect Exhibit');

    legend.setActiveMethod('touch');
    legend.setKeyboardInteractLabel('Space');
    legend.setActiveMethod('keyboard');
    expect(interactLabel?.textContent).toBe('Space');
    expect(interactDescription?.textContent).toBe(
      'Press Space to Inspect Exhibit'
    );

    legend.setInteractLabel('gamepad', 'X');
    legend.setActiveMethod('gamepad');
    expect(interactLabel?.textContent).toBe('X');
    expect(interactDescription?.textContent).toBe('Press X to Inspect Exhibit');

    legend.dispose();
    expect(interactLabel?.textContent).toBe('F');
  });

  it('reacts to runtime input signals from window events', () => {
    const container = createOverlayContainer();
    const legend = createMovementLegend({ container, windowTarget: window });

    dispatchPointerEvent(window, 'touch');
    expect(legend.getActiveMethod()).toBe('touch');

    const keyboardEvent = new window.KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(keyboardEvent);
    expect(legend.getActiveMethod()).toBe('keyboard');

    dispatchPointerEvent(window, 'mouse');
    expect(legend.getActiveMethod()).toBe('pointer');

    legend.dispose();
  });

  it('derives the initial method from navigator touch heuristics', () => {
    const container = createOverlayContainer();
    const stubWindow = createStubWindow({ maxTouchPoints: 3 });
    const legend = createMovementLegend({
      container,
      windowTarget: stubWindow,
    });

    expect(legend.getActiveMethod()).toBe('touch');
    legend.dispose();
  });

  it('falls back to coarse pointer media query when touch points are zero', () => {
    const container = createOverlayContainer();
    const stubWindow = createStubWindow({ coarsePointer: true });
    const legend = createMovementLegend({
      container,
      windowTarget: stubWindow,
    });

    expect(legend.getActiveMethod()).toBe('touch');
    legend.dispose();
  });

  it('activates the gamepad method when controller activity is detected', () => {
    const container = createOverlayContainer();
    const stubWindow = new GamepadStubWindow();

    const legend = createMovementLegend({
      container,
      windowTarget: stubWindow as unknown as Window,
    });

    // Initial frame without activity keeps the keyboard hint.
    stubWindow.flushFrame();
    expect(legend.getActiveMethod()).toBe('keyboard');

    // Simulate input and advance the monitor loop.
    stubWindow.gamepads[0].buttons[0].pressed = true;
    stubWindow.flushFrame();
    expect(legend.getActiveMethod()).toBe('gamepad');

    const cancellationsBeforeDispose = stubWindow.cancelled.length;
    legend.dispose();
    expect(stubWindow.cancelled.length).toBeGreaterThanOrEqual(
      cancellationsBeforeDispose + 1
    );
  });

  it('switches to gamepad mode when the gamepadconnected event fires', () => {
    const container = createOverlayContainer();
    const stubWindow = new GamepadStubWindow();

    const legend = createMovementLegend({
      container,
      windowTarget: stubWindow as unknown as Window,
    });

    stubWindow.dispatchEvent(new Event('gamepadconnected'));
    expect(legend.getActiveMethod()).toBe('gamepad');

    legend.dispose();
  });

  it('falls back to the last non-gamepad method when the controller disconnects', () => {
    const container = createOverlayContainer();
    const stubWindow = new GamepadStubWindow();

    const legend = createMovementLegend({
      container,
      windowTarget: stubWindow as unknown as Window,
    });

    legend.setActiveMethod('pointer');
    stubWindow.dispatchEvent(new Event('gamepadconnected'));
    expect(legend.getActiveMethod()).toBe('gamepad');

    stubWindow.dispatchEvent(new Event('gamepaddisconnected'));
    expect(legend.getActiveMethod()).toBe('pointer');

    legend.dispose();
  });

  it('pauses gamepad polling when the tab is hidden and resumes on show', () => {
    const container = createOverlayContainer();
    const mockWindow = createVisibilityMockWindow();

    const legend = createMovementLegend({
      container,
      windowTarget: mockWindow.windowTarget,
    });

    const initialCalls = mockWindow.requestAnimationFrame.mock.calls.length;
    mockWindow.triggerFrame();
    expect(legend.getActiveMethod()).toBe('gamepad');

    mockWindow.setVisibility('hidden');
    expect(mockWindow.cancelAnimationFrame).toHaveBeenCalled();
    expect(mockWindow.hasScheduledFrame()).toBe(false);

    mockWindow.setGamepads([{ connected: true, buttons: [{ pressed: true }] }]);
    mockWindow.setVisibility('visible');
    expect(mockWindow.requestAnimationFrame.mock.calls.length).toBeGreaterThan(
      initialCalls
    );
    expect(mockWindow.hasScheduledFrame()).toBe(true);

    mockWindow.triggerFrame();
    expect(legend.getActiveMethod()).toBe('gamepad');

    legend.dispose();
    expect(mockWindow.cancelAnimationFrame).toHaveBeenCalled();
    container.remove();
  });

  it('cleans up listeners and restores defaults on dispose', () => {
    const container = createOverlayContainer();
    const legend = createMovementLegend({
      container,
      initialMethod: 'pointer',
    });

    legend.setInteractPrompt('Inspect Exhibit');
    legend.dispose();

    expect(container.dataset.activeInput).toBeUndefined();
    const interactItem = container.querySelector('[data-role="interact"]');
    const interactDescription = container.querySelector(
      '[data-role="interact-description"]'
    );
    expect(interactItem?.hidden).toBe(true);
    expect(interactDescription?.textContent).toBe('Interact');
    expect(interactItem?.dataset.hudAnnounce).toBeUndefined();

    dispatchPointerEvent(window, 'touch');
    expect(legend.getActiveMethod()).toBe('pointer');
  });

  it('exposes locale direction metadata for rtl overlays', () => {
    const container = createOverlayContainer();
    createMovementLegend({
      container,
      locale: 'ar',
    });

    expect(container.dataset.localeDirection).toBe('rtl');
    expect(container.getAttribute('dir')).toBe('rtl');
    expect(container.dataset.localeScript).toBe('rtl');
  });

  it('exposes cjk locale script metadata for overlays', () => {
    const container = createOverlayContainer();
    createMovementLegend({
      container,
      locale: 'zh-CN',
    });

    expect(container.dataset.localeDirection).toBe('ltr');
    expect(container.dataset.localeScript).toBe('cjk');
  });

  it('updates copy and direction when locale changes', () => {
    const container = createOverlayContainer();
    const legend = createMovementLegend({
      container,
      locale: 'en',
    });

    const description = container.querySelector<HTMLElement>(
      '[data-role="interact-description"]'
    );
    expect(description?.textContent).toBe('Interact');
    expect(container.dataset.localeDirection).toBe('ltr');

    legend.setLocale('ar');

    expect(container.dataset.localeDirection).toBe('rtl');
    expect(container.getAttribute('dir')).toBe('rtl');
    expect(description?.textContent).toBe('تفاعل');

    legend.setLocale('en');

    expect(container.dataset.localeDirection).toBe('ltr');
    expect(container.getAttribute('dir')).toBe('ltr');
    expect(description?.textContent).toBe('Interact');
  });

  it('reformats interact prompts using locale templates', () => {
    const container = createOverlayContainer();
    const legend = createMovementLegend({
      container,
      locale: 'en',
    });

    const description = container.querySelector<HTMLElement>(
      '[data-role="interact-description"]'
    );

    legend.setInteractPrompt('Inspect Exhibit');
    expect(description?.textContent).toBe('Press F to Inspect Exhibit');

    legend.setLocale('ar');
    expect(description?.textContent).toBe('اضغط F لـ Inspect Exhibit');

    legend.setActiveMethod('touch');
    expect(description?.textContent).toBe('المس لـ Inspect Exhibit');

    legend.dispose();
  });

  it('surfaces announcements on a focus target with an optional prefix', () => {
    const container = createOverlayContainer();
    const focusTarget = document.createElement('div');

    const legend = createMovementLegend({
      container,
      focusTarget,
      focusLabel: 'Controls',
    });

    expect(focusTarget.dataset.hudAnnounce).toBeUndefined();

    legend.setInteractPrompt('Inspect Exhibit');

    expect(focusTarget.dataset.hudAnnounce).toBe(
      'Controls. F — Inspect Exhibit'
    );

    legend.setInteractPrompt(null);

    expect(focusTarget.dataset.hudAnnounce).toBeUndefined();

    legend.dispose();
  });
});
