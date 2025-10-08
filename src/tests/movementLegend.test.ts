import { describe, expect, it } from 'vitest';

import { createMovementLegend } from '../hud/movementLegend';

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
      <li
        class="overlay__item"
        data-role="interact"
        data-input-methods="keyboard pointer touch"
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

describe('createMovementLegend', () => {
  it('highlights the configured input method and allows manual switching', () => {
    const container = createOverlayContainer();
    const legend = createMovementLegend({
      container,
      initialMethod: 'keyboard',
    });

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

    legend.setInteractPrompt('Interact with Futuroptimist');
    expect(interactItem?.hidden).toBe(false);
    expect(interactDescription?.textContent).toBe(
      'Interact with Futuroptimist'
    );
    expect(interactLabel?.textContent).toBe('F');

    legend.setActiveMethod('touch');
    expect(interactLabel?.textContent).toBe('Tap');

    legend.setInteractPrompt(null);
    expect(interactItem?.hidden).toBe(true);
    expect(interactDescription?.textContent).toBe('Interact');

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

    legend.setInteractPrompt('Interact with Exhibit');
    legend.setKeyboardInteractLabel('E');
    expect(interactLabel?.textContent).toBe('E');

    legend.setActiveMethod('touch');
    legend.setKeyboardInteractLabel('Space');
    legend.setActiveMethod('keyboard');
    expect(interactLabel?.textContent).toBe('Space');

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

  it('cleans up listeners and restores defaults on dispose', () => {
    const container = createOverlayContainer();
    const legend = createMovementLegend({
      container,
      initialMethod: 'pointer',
    });

    legend.setInteractPrompt('Interact with Exhibit');
    legend.dispose();

    expect(container.dataset.activeInput).toBeUndefined();
    const interactItem = container.querySelector('[data-role="interact"]');
    const interactDescription = container.querySelector(
      '[data-role="interact-description"]'
    );
    expect(interactItem?.hidden).toBe(true);
    expect(interactDescription?.textContent).toBe('Interact');

    dispatchPointerEvent(window, 'touch');
    expect(legend.getActiveMethod()).toBe('pointer');
  });
});
