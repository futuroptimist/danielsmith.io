import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createResponsiveControlOverlay } from '../ui/hud/responsiveControlOverlay';

const createStrings = () => ({
  expandLabel: 'Show all controls',
  collapseLabel: 'Hide extra controls',
  expandAnnouncement: 'Showing the full controls list for mobile players.',
  collapseAnnouncement: 'Hiding extra controls to keep the list compact.',
});

const flushMicrotasks = async () => {
  await new Promise((resolve) => queueMicrotask(resolve));
};

const COLLAPSE_STORAGE_KEY = 'hud:control-overlay-collapsed';

beforeEach(() => {
  localStorage.removeItem(COLLAPSE_STORAGE_KEY);
});

describe('createResponsiveControlOverlay', () => {
  it('collapses mobile controls and toggles expanded state', async () => {
    const container = document.createElement('div');
    container.dataset.activeInput = 'keyboard';
    container.innerHTML = `
      <ul class="overlay__list" data-role="control-list">
        <li
          class="overlay__item"
          data-control-item="keyboardMove"
          data-input-methods="keyboard"
        ></li>
        <li
          class="overlay__item"
          data-control-item="pointerDrag"
          data-input-methods="pointer"
        ></li>
        <li
          class="overlay__item"
          data-control-item="interact"
          data-input-methods="keyboard pointer"
        ></li>
      </ul>
      <button type="button" data-role="control-toggle">Toggle</button>
    `;

    const list = container.querySelector('[data-role="control-list"]');
    const toggle = container.querySelector('[data-role="control-toggle"]');
    const handle = createResponsiveControlOverlay({
      container,
      list: list as HTMLElement,
      toggle: toggle as HTMLButtonElement,
      strings: createStrings(),
      initialLayout: 'desktop',
    });

    expect(toggle?.getAttribute('aria-controls')).toBe('control-overlay-list');

    const keyboardItem = container.querySelector<HTMLElement>(
      '[data-control-item="keyboardMove"]'
    );
    const pointerItem = container.querySelector<HTMLElement>(
      '[data-control-item="pointerDrag"]'
    );
    const interactItem = container.querySelector<HTMLElement>(
      '[data-control-item="interact"]'
    );

    handle.setLayout('mobile');

    expect(container.dataset.controlCollapsed).toBe('true');
    expect(toggle?.hidden).toBe(false);
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(keyboardItem?.hidden).toBe(false);
    expect(keyboardItem?.dataset.mobileCollapsed).toBeUndefined();
    expect(pointerItem?.hidden).toBe(true);
    expect(pointerItem?.dataset.mobileCollapsed).toBe('true');
    expect(interactItem?.hidden).toBe(false);
    expect(interactItem?.dataset.mobileCollapsed).toBeUndefined();

    container.dataset.activeInput = 'pointer';
    await flushMicrotasks();

    expect(pointerItem?.hidden).toBe(false);
    expect(pointerItem?.dataset.mobileCollapsed).toBeUndefined();
    expect(keyboardItem?.hidden).toBe(true);
    expect(keyboardItem?.dataset.mobileCollapsed).toBe('true');

    (toggle as HTMLButtonElement).click();

    expect(container.dataset.controlCollapsed).toBe('false');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(pointerItem?.hidden).toBe(false);
    expect(pointerItem?.dataset.mobileCollapsed).toBeUndefined();
    expect(keyboardItem?.hidden).toBe(false);
    expect(keyboardItem?.dataset.mobileCollapsed).toBeUndefined();

    handle.setLayout('desktop');
    expect(container.dataset.controlCollapsed).toBeUndefined();
    expect(toggle?.hidden).toBe(true);
    expect(toggle?.hasAttribute('aria-expanded')).toBe(false);
    expect(pointerItem?.hidden).toBe(false);
    expect(pointerItem?.dataset.mobileCollapsed).toBeUndefined();
    expect(keyboardItem?.hidden).toBe(false);
    expect(keyboardItem?.dataset.mobileCollapsed).toBeUndefined();
  });

  it('updates toggle labels when strings change', () => {
    const container = document.createElement('div');
    container.dataset.activeInput = 'keyboard';
    container.innerHTML = `
      <ul class="overlay__list" data-role="control-list"></ul>
      <button type="button" data-role="control-toggle">Toggle</button>
    `;

    const list = container.querySelector('[data-role="control-list"]');
    const toggle = container.querySelector('[data-role="control-toggle"]');
    const handle = createResponsiveControlOverlay({
      container,
      list: list as HTMLElement,
      toggle: toggle as HTMLButtonElement,
      strings: createStrings(),
      initialLayout: 'desktop',
    });

    handle.setLayout('mobile');

    expect(toggle?.textContent).toBe('Show all controls');
    expect(toggle?.dataset.hudAnnounce).toBe(
      'Showing the full controls list for mobile players.'
    );

    handle.setStrings({
      expandLabel: 'Expand',
      collapseLabel: 'Collapse',
      expandAnnouncement: 'Expand controls.',
      collapseAnnouncement: 'Collapse controls.',
    });

    expect(toggle?.textContent).toBe('Expand');
    expect(toggle?.dataset.hudAnnounce).toBe('Expand controls.');

    handle.dispose();
    expect(toggle?.hidden).toBe(true);
    expect(toggle?.textContent).toBe('Expand');
  });

  it('respects baseline hidden states while collapsing and disposing', () => {
    const container = document.createElement('div');
    container.dataset.activeInput = 'keyboard';
    container.innerHTML = `
      <ul class="overlay__list" data-role="control-list">
        <li
          class="overlay__item"
          data-control-item="keyboardMove"
          data-input-methods="keyboard"
        ></li>
        <li
          class="overlay__item"
          data-control-item="interact"
          data-input-methods="keyboard pointer"
          hidden
        ></li>
      </ul>
      <button type="button" data-role="control-toggle">Toggle</button>
    `;

    const list = container.querySelector('[data-role="control-list"]');
    const toggle = container.querySelector('[data-role="control-toggle"]');
    const handle = createResponsiveControlOverlay({
      container,
      list: list as HTMLElement,
      toggle: toggle as HTMLButtonElement,
      strings: createStrings(),
      initialLayout: 'mobile',
    });

    const keyboardItem = container.querySelector<HTMLElement>(
      '[data-control-item="keyboardMove"]'
    );
    const interactItem = container.querySelector<HTMLElement>(
      '[data-control-item="interact"]'
    );

    expect(keyboardItem?.hidden).toBe(false);
    expect(interactItem?.hidden).toBe(true);
    expect(interactItem?.dataset.mobileCollapsed).toBeUndefined();

    (toggle as HTMLButtonElement).click();

    expect(keyboardItem?.hidden).toBe(false);
    expect(interactItem?.hidden).toBe(true);
    expect(interactItem?.dataset.mobileCollapsed).toBeUndefined();

    handle.dispose();
    expect(keyboardItem?.hidden).toBe(false);
    expect(interactItem?.hidden).toBe(true);
    expect(interactItem?.dataset.mobileCollapsed).toBeUndefined();
  });

  it('preserves runtime visibility for interact prompt after collapsing', () => {
    const container = document.createElement('div');
    container.dataset.activeInput = 'keyboard';
    container.innerHTML = `
      <ul class="overlay__list" data-role="control-list">
        <li
          class="overlay__item"
          data-control-item="keyboardMove"
          data-input-methods="keyboard"
        ></li>
        <li
          class="overlay__item"
          data-control-item="interact"
          data-input-methods="keyboard pointer"
          hidden
        ></li>
      </ul>
      <button type="button" data-role="control-toggle">Toggle</button>
    `;

    const list = container.querySelector('[data-role="control-list"]');
    const toggle = container.querySelector('[data-role="control-toggle"]');
    const handle = createResponsiveControlOverlay({
      container,
      list: list as HTMLElement,
      toggle: toggle as HTMLButtonElement,
      strings: createStrings(),
      initialLayout: 'mobile',
    });

    const interactItem = container.querySelector<HTMLElement>(
      '[data-control-item="interact"]'
    );

    expect(interactItem?.hidden).toBe(true);

    if (interactItem) {
      interactItem.hidden = false;
    }

    handle.refresh();

    expect(interactItem?.hidden).toBe(false);

    (toggle as HTMLButtonElement).click();

    expect(container.dataset.controlCollapsed).toBe('false');
    expect(interactItem?.hidden).toBe(false);

    (toggle as HTMLButtonElement).click();

    expect(container.dataset.controlCollapsed).toBe('true');
    expect(interactItem?.hidden).toBe(false);
    expect(interactItem?.dataset.mobileCollapsed).toBeUndefined();

    handle.dispose();
  });

  it('persists mobile collapse preference across layout changes', () => {
    const container = document.createElement('div');
    container.dataset.activeInput = 'keyboard';
    container.innerHTML = `
      <ul class="overlay__list" data-role="control-list">
        <li
          class="overlay__item"
          data-control-item="keyboardMove"
          data-input-methods="keyboard"
        ></li>
        <li
          class="overlay__item"
          data-control-item="pointerDrag"
          data-input-methods="pointer"
        ></li>
      </ul>
      <button type="button" data-role="control-toggle">Toggle</button>
    `;

    const store = new Map<string, string>([
      ['hud:control-overlay-collapsed', 'false'],
    ]);
    const storage = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
    };

    const list = container.querySelector('[data-role="control-list"]');
    const toggle = container.querySelector('[data-role="control-toggle"]');
    const handle = createResponsiveControlOverlay({
      container,
      list: list as HTMLElement,
      toggle: toggle as HTMLButtonElement,
      strings: createStrings(),
      initialLayout: 'mobile',
      storage,
      defaultCollapsed: true,
      windowTarget: undefined,
    });

    expect(storage.getItem).toHaveBeenCalledWith(
      'hud:control-overlay-collapsed'
    );
    expect(container.dataset.controlCollapsed).toBe('false');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');

    (toggle as HTMLButtonElement).click();

    expect(storage.setItem).toHaveBeenCalledWith(
      'hud:control-overlay-collapsed',
      'true'
    );
    expect(container.dataset.controlCollapsed).toBe('true');

    handle.setLayout('desktop');
    expect(container.dataset.controlCollapsed).toBeUndefined();

    handle.setLayout('mobile');
    expect(container.dataset.controlCollapsed).toBe('true');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');

    handle.dispose();
  });

  it('ignores storage access errors while updating collapse state', () => {
    const container = document.createElement('div');
    container.dataset.activeInput = 'keyboard';
    container.innerHTML = `
      <ul class="overlay__list" data-role="control-list">
        <li
          class="overlay__item"
          data-control-item="keyboardMove"
          data-input-methods="keyboard"
        ></li>
      </ul>
      <button type="button" data-role="control-toggle">Toggle</button>
    `;

    const storageError = new Error('denied');
    const storage = {
      getItem: vi.fn(() => {
        throw storageError;
      }),
      setItem: vi.fn(() => {
        throw storageError;
      }),
    };

    const list = container.querySelector('[data-role="control-list"]');
    const toggle = container.querySelector('[data-role="control-toggle"]');
    const handle = createResponsiveControlOverlay({
      container,
      list: list as HTMLElement,
      toggle: toggle as HTMLButtonElement,
      strings: createStrings(),
      initialLayout: 'mobile',
      storage,
    });

    expect(container.dataset.controlCollapsed).toBe('true');

    expect(() => (toggle as HTMLButtonElement).click()).not.toThrow();
    expect(container.dataset.controlCollapsed).toBe('false');
    expect(storage.setItem).toHaveBeenCalled();

    handle.dispose();
  });

  it('falls back gracefully when localStorage is unavailable', () => {
    const container = document.createElement('div');
    container.dataset.activeInput = 'keyboard';
    container.innerHTML = `
      <ul class="overlay__list" data-role="control-list">
        <li
          class="overlay__item"
          data-control-item="keyboardMove"
          data-input-methods="keyboard"
        ></li>
      </ul>
      <button type="button" data-role="control-toggle">Toggle</button>
    `;

    const windowTarget = Object.defineProperty({}, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });

    const list = container.querySelector('[data-role="control-list"]');
    const toggle = container.querySelector('[data-role="control-toggle"]');
    const handle = createResponsiveControlOverlay({
      container,
      list: list as HTMLElement,
      toggle: toggle as HTMLButtonElement,
      strings: createStrings(),
      initialLayout: 'mobile',
      storage: null,
      windowTarget: windowTarget as unknown as Window,
    });

    expect(container.dataset.controlCollapsed).toBe('true');
    (toggle as HTMLButtonElement).click();
    expect(container.dataset.controlCollapsed).toBe('false');

    handle.dispose();
  });

  it('initializes when no storage or window target are available', () => {
    const container = document.createElement('div');
    container.dataset.activeInput = 'keyboard';
    container.innerHTML = `
      <ul class="overlay__list" data-role="control-list">
        <li
          class="overlay__item"
          data-control-item="keyboardMove"
          data-input-methods="keyboard"
        ></li>
      </ul>
      <button type="button" data-role="control-toggle">Toggle</button>
    `;

    const list = container.querySelector('[data-role="control-list"]');
    const toggle = container.querySelector('[data-role="control-toggle"]');
    const handle = createResponsiveControlOverlay({
      container,
      list: list as HTMLElement,
      toggle: toggle as HTMLButtonElement,
      strings: createStrings(),
      initialLayout: 'mobile',
      windowTarget: undefined,
    });

    expect(container.dataset.controlCollapsed).toBe('true');
    (toggle as HTMLButtonElement).click();
    expect(container.dataset.controlCollapsed).toBe('false');

    handle.dispose();
  });
});
