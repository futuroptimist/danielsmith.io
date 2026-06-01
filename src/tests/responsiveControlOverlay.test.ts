import { beforeEach, describe, expect, it } from 'vitest';

import { createResponsiveControlOverlay } from '../ui/hud/responsiveControlOverlay';

const createStrings = () => ({
  expandLabel: 'Show all controls',
  collapseLabel: 'Hide controls',
  expandAnnouncement: 'Showing the controls popover.',
  collapseAnnouncement: 'Hiding the controls popover.',
});

function createFixture() {
  const container = document.createElement('div');
  container.id = 'control-overlay';
  container.dataset.activeInput = 'keyboard';
  container.innerHTML = `
    <button type="button" data-role="control-toggle" data-control-label="Controls">Controls</button>
    <div data-role="control-popover" hidden>
      <div>
        <p data-control-text="heading">Controls</p>
        <button type="button" data-role="control-close">Close</button>
      </div>
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
        <li
          class="overlay__item"
          data-control-item="interact"
          data-input-methods="keyboard pointer touch"
          hidden
        ></li>
      </ul>
    </div>
  `;
  document.body.appendChild(container);

  const handle = createResponsiveControlOverlay({
    container,
    list: container.querySelector<HTMLElement>('[data-role="control-list"]'),
    toggle: container.querySelector<HTMLButtonElement>(
      '[data-role="control-toggle"]'
    ),
    closeButton: container.querySelector<HTMLButtonElement>(
      '[data-role="control-close"]'
    ),
    popover: container.querySelector<HTMLElement>(
      '[data-role="control-popover"]'
    ),
    strings: createStrings(),
    initialLayout: 'desktop',
  });

  return {
    container,
    handle,
    toggle: container.querySelector<HTMLButtonElement>(
      '[data-role="control-toggle"]'
    )!,
    closeButton: container.querySelector<HTMLButtonElement>(
      '[data-role="control-close"]'
    )!,
    popover: container.querySelector<HTMLElement>(
      '[data-role="control-popover"]'
    )!,
    keyboardItem: container.querySelector<HTMLElement>(
      '[data-control-item="keyboardMove"]'
    )!,
    pointerItem: container.querySelector<HTMLElement>(
      '[data-control-item="pointerDrag"]'
    )!,
    touchItem: container.querySelector<HTMLElement>(
      '[data-control-item="touchDrag"]'
    )!,
    interactItem: container.querySelector<HTMLElement>(
      '[data-control-item="interact"]'
    )!,
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createResponsiveControlOverlay', () => {
  it('starts closed and keeps all control methods discoverable', () => {
    const {
      container,
      handle,
      toggle,
      popover,
      keyboardItem,
      pointerItem,
      touchItem,
    } = createFixture();

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(container.dataset.controlPopoverOpen).toBe('false');
    expect(toggle.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(popover.id);
    expect(toggle.textContent).toBe('Controls');
    expect(toggle.dataset.hudAnnounce).toBe('Showing the controls popover.');
    expect(keyboardItem.hidden).toBe(false);
    expect(pointerItem.hidden).toBe(false);
    expect(touchItem.hidden).toBe(false);

    handle.dispose();
  });

  it('toggles the popover from the Controls button and handle methods', () => {
    const { container, handle, toggle, popover } = createFixture();

    toggle.click();

    expect(handle.isOpen()).toBe(true);
    expect(popover.hidden).toBe(false);
    expect(container.dataset.controlPopoverOpen).toBe('true');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('Controls');

    handle.toggle();
    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);

    handle.open();
    expect(handle.isOpen()).toBe(true);
    expect(popover.hidden).toBe(false);

    handle.close();
    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);

    handle.dispose();
  });

  it('closes from the internal close affordance', () => {
    const { handle, closeButton, popover } = createFixture();

    handle.open();
    closeButton.click();

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);

    handle.dispose();
  });

  it('closes on Escape when open', () => {
    const { handle, popover } = createFixture();

    handle.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);

    handle.dispose();
  });

  it('closes on outside pointerdown but ignores internal and button clicks', () => {
    const { handle, toggle, popover } = createFixture();
    const inside = document.createElement('button');
    popover.appendChild(inside);

    handle.open();
    inside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(handle.isOpen()).toBe(true);

    toggle.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(handle.isOpen()).toBe(true);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(handle.isOpen()).toBe(false);

    handle.dispose();
  });

  it('updates layout state without opening the mobile popover by default', () => {
    const { container, handle, popover } = createFixture();

    handle.setLayout('mobile');

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(container.dataset.hudLayout).toBe('mobile');
    expect(container.getAttribute('data-hud-layout')).toBe('mobile');

    handle.setLayout('desktop');
    expect(container.dataset.hudLayout).toBe('desktop');
    expect(container.getAttribute('data-hud-layout')).toBe('desktop');

    handle.dispose();
  });

  it('refreshes labels when localized strings change', () => {
    const { handle, toggle, closeButton } = createFixture();

    handle.setStrings({
      expandLabel: 'Open controls',
      collapseLabel: 'Close controls',
      expandAnnouncement: 'Open the controls popover.',
      collapseAnnouncement: 'Close the controls popover.',
    });

    expect(toggle.textContent).toBe('Controls');
    expect(toggle.dataset.hudAnnounce).toBe('Open the controls popover.');
    expect(closeButton.textContent).toBe('Close controls');

    handle.open();
    handle.refresh();

    expect(toggle.textContent).toBe('Controls');
    expect(toggle.dataset.hudAnnounce).toBe('Close the controls popover.');

    handle.dispose();
  });

  it('cleans up listeners and hidden state on dispose', () => {
    const { container, handle, toggle, popover } = createFixture();

    handle.open();
    handle.dispose();

    expect(popover.hidden).toBe(true);
    expect(toggle.hidden).toBe(true);
    expect(toggle.hasAttribute('aria-expanded')).toBe(false);
    expect(container.dataset.controlPopoverOpen).toBeUndefined();

    toggle.click();
    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
  });
});
