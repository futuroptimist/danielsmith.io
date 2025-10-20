import { describe, expect, it } from 'vitest';

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
    expect(keyboardItem?.dataset.mobileCollapsed).toBeUndefined();
    expect(pointerItem?.dataset.mobileCollapsed).toBe('true');
    expect(interactItem?.dataset.mobileCollapsed).toBeUndefined();

    container.dataset.activeInput = 'pointer';
    await flushMicrotasks();

    expect(pointerItem?.dataset.mobileCollapsed).toBeUndefined();
    expect(keyboardItem?.dataset.mobileCollapsed).toBe('true');

    (toggle as HTMLButtonElement).click();

    expect(container.dataset.controlCollapsed).toBe('false');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(pointerItem?.dataset.mobileCollapsed).toBeUndefined();
    expect(keyboardItem?.dataset.mobileCollapsed).toBeUndefined();

    handle.setLayout('desktop');
    expect(container.dataset.controlCollapsed).toBeUndefined();
    expect(toggle?.hidden).toBe(true);
    expect(toggle?.hasAttribute('aria-expanded')).toBe(false);
    expect(pointerItem?.dataset.mobileCollapsed).toBeUndefined();
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
});
