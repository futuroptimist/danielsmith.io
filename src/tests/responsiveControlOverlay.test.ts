import { beforeEach, describe, expect, it } from 'vitest';

import {
  shouldIgnoreShortcutEvent,
  DEFAULT_KEY_BINDINGS,
} from '../systems/controls/keyBindings';
import { createResponsiveControlOverlay } from '../ui/hud/responsiveControlOverlay';

const createStrings = () => ({
  expandLabel: 'Show all controls',
  collapseLabel: 'Hide controls',
  expandAnnouncement: 'Controls opened.',
  collapseAnnouncement: 'Controls closed.',
});

const flushMicrotasks = async () => {
  await Promise.resolve();
};

const createFixture = () => {
  const container = document.createElement('div');
  container.dataset.activeInput = 'keyboard';
  container.innerHTML = `
    <button type="button" data-role="control-toggle">Controls</button>
    <section data-role="control-popover" hidden>
      <button type="button" data-role="control-close">Close</button>
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
          data-control-item="touchDrag"
          data-input-methods="touch"
        ></li>
      </ul>
    </section>
  `;
  document.body.append(container);

  const toggle = container.querySelector<HTMLButtonElement>(
    '[data-role="control-toggle"]'
  );
  const popover = container.querySelector<HTMLElement>(
    '[data-role="control-popover"]'
  );
  const closeButton = container.querySelector<HTMLButtonElement>(
    '[data-role="control-close"]'
  );
  const list = container.querySelector<HTMLElement>(
    '[data-role="control-list"]'
  );

  if (!toggle || !popover || !closeButton || !list) {
    throw new Error('Fixture failed to render controls overlay elements.');
  }

  return { container, toggle, popover, closeButton, list };
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createResponsiveControlOverlay', () => {
  it('starts closed with a compact toggle and opens through the handle', () => {
    const { container, toggle, popover, list } = createFixture();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      toggle,
      popover,
      strings: createStrings(),
      initialLayout: 'desktop',
    });

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(toggle.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(
      'control-overlay-popover'
    );
    expect(container.dataset.controlsOpen).toBe('false');

    handle.open();

    expect(handle.isOpen()).toBe(true);
    expect(popover.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(container.dataset.controlsOpen).toBe('true');

    handle.dispose();
  });

  it('toggles with the Controls button and closes with the close affordance', () => {
    const { container, toggle, popover, closeButton, list } = createFixture();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      toggle,
      popover,
      closeButton,
      strings: createStrings(),
    });

    toggle.click();

    expect(handle.isOpen()).toBe(true);
    expect(popover.hidden).toBe(false);

    closeButton.click();

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);

    handle.dispose();
  });

  it('closes on Escape while open', () => {
    const { container, toggle, popover, list } = createFixture();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      toggle,
      popover,
      strings: createStrings(),
    });

    handle.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);

    handle.dispose();
  });

  it('closes on outside pointer down but ignores interactions inside the popover', () => {
    const { container, toggle, popover, list } = createFixture();
    const outside = document.createElement('button');
    document.body.append(outside);
    const handle = createResponsiveControlOverlay({
      container,
      list,
      toggle,
      popover,
      strings: createStrings(),
    });

    handle.open();
    popover.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(handle.isOpen()).toBe(true);

    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);

    handle.dispose();
  });

  it('closes when switching to mobile layout and remains available', () => {
    const { container, toggle, popover, list } = createFixture();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      toggle,
      popover,
      strings: createStrings(),
      initialLayout: 'desktop',
      defaultOpen: true,
    });

    expect(handle.isOpen()).toBe(true);

    handle.setLayout('mobile');

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(toggle.hidden).toBe(false);
    expect(container.dataset.hudLayout).toBe('mobile');

    toggle.click();

    expect(handle.isOpen()).toBe(true);
    expect(popover.hidden).toBe(false);

    handle.dispose();
  });

  it('refreshes active input highlighting without hiding other input methods', async () => {
    const { container, toggle, popover, list } = createFixture();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      toggle,
      popover,
      strings: createStrings(),
    });

    const keyboardItem = container.querySelector<HTMLElement>(
      '[data-control-item="keyboardMove"]'
    );
    const pointerItem = container.querySelector<HTMLElement>(
      '[data-control-item="pointerDrag"]'
    );

    expect(keyboardItem?.dataset.state).toBe('active');
    expect(pointerItem?.hidden).toBe(false);

    container.dataset.activeInput = 'pointer';
    await flushMicrotasks();

    expect(keyboardItem?.dataset.state).toBeUndefined();
    expect(keyboardItem?.hidden).toBe(false);
    expect(pointerItem?.dataset.state).toBe('active');
    expect(pointerItem?.hidden).toBe(false);

    handle.dispose();
  });

  it('updates announcements when strings refresh', () => {
    const { container, toggle, popover, closeButton, list } = createFixture();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      toggle,
      popover,
      closeButton,
      strings: createStrings(),
    });

    handle.setStrings({
      expandLabel: 'Afficher les commandes',
      collapseLabel: 'Masquer les commandes',
      expandAnnouncement: 'Commandes ouvertes.',
      collapseAnnouncement: 'Commandes fermées.',
    });

    expect(toggle.dataset.hudAnnounce).toBe('Commandes fermées.');
    expect(closeButton.dataset.hudAnnounce).toBe('Commandes fermées.');

    handle.open();

    expect(toggle.dataset.hudAnnounce).toBe('Commandes ouvertes.');

    handle.dispose();
  });

  it('removes listeners and restores initial state on dispose', () => {
    const { container, toggle, popover, list } = createFixture();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      toggle,
      popover,
      strings: createStrings(),
    });

    handle.open();
    handle.dispose();

    expect(popover.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBeNull();
    expect(container.dataset.controlsOpen).toBeUndefined();

    toggle.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(popover.hidden).toBe(true);
  });

  it('keeps C in the key binding model and ignores editing or modified C shortcuts', () => {
    expect(DEFAULT_KEY_BINDINGS.toggleControls).toEqual(['c']);

    const input = document.createElement('input');
    document.body.append(input);
    const inputEvent = new KeyboardEvent('keydown', { key: 'c' });
    Object.defineProperty(inputEvent, 'target', { value: input });

    expect(shouldIgnoreShortcutEvent(inputEvent)).toBe(true);
    expect(
      shouldIgnoreShortcutEvent(new KeyboardEvent('keydown', { key: 'c' }))
    ).toBe(false);
    expect(
      shouldIgnoreShortcutEvent(
        new KeyboardEvent('keydown', { key: 'c', ctrlKey: true })
      )
    ).toBe(true);
  });
});
