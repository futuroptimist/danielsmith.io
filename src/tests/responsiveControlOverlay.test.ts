import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it } from 'vitest';

import type { ControlOverlayStrings } from '../assets/i18n/types';
import { DEFAULT_KEY_BINDINGS } from '../systems/controls/keyBindings';
import { applyHudMenuButtonMetadata } from '../ui/hud/controlOverlay';
import { createResponsiveControlOverlay } from '../ui/hud/responsiveControlOverlay';

const createStrings = (heading = 'Controls'): ControlOverlayStrings => ({
  heading,
  items: {
    keyboardMove: { keys: 'WASD / Arrow keys', description: 'Move' },
    pointerDrag: { keys: 'Left mouse button', description: 'Drag to pan' },
    pointerZoom: { keys: 'Scroll wheel', description: 'Zoom' },
    keyboardZoom: {
      keys: 'Shift + = / Shift + -',
      description: 'Keyboard zoom',
    },
    touchDrag: { keys: 'Touch', description: 'Drag to move and pan' },
    touchPinch: { keys: 'Pinch', description: 'Zoom' },
    cyclePoi: { keys: 'Q / E', description: 'Cycle POIs' },
    toggleTextMode: { keys: 'T', description: 'Switch to text mode' },
  },
  interact: {
    defaultLabel: 'F',
    description: 'Interact',
    promptTemplates: {
      default: 'Interact with {title}',
      inspect: 'Inspect {title}',
      activate: 'Activate {title}',
    },
  },
  helpButton: {
    labelTemplate: 'Open menu · Press {shortcut}',
    announcementTemplate: 'Open help with {shortcut}',
    shortcutFallback: 'H',
  },
  menu: {
    controls: { label: 'Controls', keyHint: 'C', title: 'Open controls (C)' },
    text: { label: 'Text', keyHint: 'T', title: 'Switch to text mode (T)' },
    settings: { label: 'Settings', keyHint: 'H', title: 'Open settings (H)' },
  },
  mobileToggle: {
    expandLabel: 'Show all controls',
    collapseLabel: 'Close controls',
    expandAnnouncement: 'Controls closed.',
    collapseAnnouncement: 'Controls open.',
  },
});

const createOverlay = () => {
  const container = document.createElement('div');
  container.dataset.activeInput = 'keyboard';
  container.innerHTML = `
    <button type="button" data-role="controls-button">Controls</button>
    <div data-role="controls-popover">
      <div>
        <p data-control-text="heading">Controls</p>
        <button type="button" data-role="controls-close">Close</button>
      </div>
      <ul data-role="control-list">
        <li data-control-item="keyboardMove" data-input-methods="keyboard"></li>
        <li data-control-item="pointerDrag" data-input-methods="pointer"></li>
        <li data-control-item="touchDrag" data-input-methods="touch"></li>
        <li data-control-item="interact" data-input-methods="keyboard pointer touch" hidden></li>
      </ul>
    </div>
  `;
  document.body.append(container);
  const button = container.querySelector<HTMLButtonElement>(
    '[data-role="controls-button"]'
  );
  const popover = container.querySelector<HTMLElement>(
    '[data-role="controls-popover"]'
  );
  const closeButton = container.querySelector<HTMLButtonElement>(
    '[data-role="controls-close"]'
  );
  const list = container.querySelector<HTMLElement>(
    '[data-role="control-list"]'
  );

  if (!button || !popover || !closeButton || !list) {
    throw new Error('Failed to create control overlay fixture.');
  }

  return { container, button, popover, closeButton, list };
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createResponsiveControlOverlay', () => {
  it('starts closed with a compact controls button', () => {
    const { container, button, popover, list } = createOverlay();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      button,
      popover,
      strings: createStrings(),
      initialLayout: 'mobile',
    });

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(button.textContent).toBe('Controls');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe(popover.id);
    expect(container.dataset.controlsOpen).toBe('false');
    expect(container.dataset.hudLayout).toBe('mobile');
    expect(container.getAttribute('aria-label')).toBe('Controls');
    expect(container.getAttribute('aria-labelledby')).toBeNull();
    expect(popover.getAttribute('aria-labelledby')).toBe(
      container.querySelector('[data-control-text="heading"]')?.id
    );

    handle.dispose();
  });

  it('opens and closes through the button, handle, and close affordance', () => {
    const { container, button, popover, closeButton, list } = createOverlay();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      button,
      popover,
      closeButton,
      strings: createStrings(),
    });

    button.click();
    expect(handle.isOpen()).toBe(true);
    expect(popover.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-pressed')).toBe('true');

    handle.toggle();
    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('false');

    handle.open();
    closeButton.click();
    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement).toBe(button);

    handle.dispose();
  });

  it('closes with Escape when the popover is open', () => {
    const { container, button, popover, list } = createOverlay();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      button,
      popover,
      strings: createStrings(),
    });

    handle.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(handle.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);

    handle.dispose();
  });

  it('closes on outside pointer input but ignores pointer input in the popover or button', () => {
    const { container, button, popover, list } = createOverlay();
    const outside = document.createElement('button');
    document.body.append(outside);
    const handle = createResponsiveControlOverlay({
      container,
      list,
      button,
      popover,
      strings: createStrings(),
    });

    handle.open();
    popover.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(handle.isOpen()).toBe(true);

    button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(handle.isOpen()).toBe(true);

    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(handle.isOpen()).toBe(false);

    handle.dispose();
  });

  it('refreshes highlighted input methods without hiding other controls', () => {
    const { container, button, popover, list } = createOverlay();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      button,
      popover,
      strings: createStrings(),
    });
    const keyboard = container.querySelector<HTMLElement>(
      '[data-control-item="keyboardMove"]'
    );
    const pointer = container.querySelector<HTMLElement>(
      '[data-control-item="pointerDrag"]'
    );

    expect(keyboard?.hidden).toBe(false);
    expect(pointer?.hidden).toBe(false);
    expect(keyboard?.dataset.activeMethod).toBe('true');
    expect(pointer?.dataset.activeMethod).toBe('false');

    container.dataset.activeInput = 'pointer';
    handle.refresh();

    expect(keyboard?.hidden).toBe(false);
    expect(pointer?.hidden).toBe(false);
    expect(keyboard?.dataset.activeMethod).toBe('false');
    expect(pointer?.dataset.activeMethod).toBe('true');

    handle.dispose();
  });

  it('keeps menu shortcut metadata aligned with remapped Controls bindings', () => {
    const { container, button, popover, list } = createOverlay();
    button.innerHTML = `
      <span data-hud-menu-label="controls">Controls</span>
      <kbd data-hud-menu-key="controls">C</kbd>
    `;
    const handle = createResponsiveControlOverlay({
      container,
      list,
      button,
      popover,
      strings: createStrings(),
    });

    handle.setControlsShortcutLabel('K');

    expect(button.querySelector('[data-hud-menu-key]')?.textContent).toBe('K');
    expect(button.getAttribute('aria-label')).toBe('Open controls (K)');
    expect(button.title).toBe('Open controls (K)');

    handle.dispose();
  });

  it('keeps pseudo-locale Controls titles aligned with remapped bindings', () => {
    const { container, button, popover, list } = createOverlay();
    button.innerHTML = `
      <span data-hud-menu-label="controls">⟦Controls⟧</span>
      <kbd data-hud-menu-key="controls">⟦C⟧</kbd>
    `;
    const handle = createResponsiveControlOverlay({
      container,
      list,
      button,
      popover,
      strings: {
        ...createStrings('⟦Controls⟧'),
        menu: {
          ...createStrings().menu,
          controls: {
            label: '⟦Controls⟧',
            keyHint: '⟦C⟧',
            title: '⟦Open controls (C)⟧',
          },
        },
      },
    });

    handle.setControlsShortcutLabel('K');

    expect(button.querySelector('[data-hud-menu-key]')?.textContent).toBe('K');
    expect(button.getAttribute('aria-label')).toBe('⟦Open controls (K)⟧');
    expect(button.title).toBe('⟦Open controls (K)⟧');

    handle.dispose();
  });

  it('keeps Settings shortcut metadata aligned with remapped Help bindings', () => {
    const button = document.createElement('button');
    button.innerHTML = `
      <span data-hud-menu-label="settings">Settings</span>
      <kbd data-hud-menu-key="settings">H</kbd>
    `;

    applyHudMenuButtonMetadata(
      button,
      createStrings().menu.settings,
      '?',
      'Open help with ?'
    );

    expect(button.querySelector('[data-hud-menu-key]')?.textContent).toBe('?');
    expect(button.getAttribute('aria-label')).toBe('Open settings (?)');
    expect(button.title).toBe('Open settings (?)');
    expect(button.dataset.hudAnnounce).toBe('Open help with ?');
  });

  it('keeps pseudo-locale Settings titles aligned with remapped Help bindings', () => {
    const button = document.createElement('button');
    button.innerHTML = `
      <span data-hud-menu-label="settings">⟦Settings⟧</span>
      <kbd data-hud-menu-key="settings">⟦H⟧</kbd>
    `;

    applyHudMenuButtonMetadata(
      button,
      {
        label: '⟦Settings⟧',
        keyHint: '⟦H⟧',
        title: '⟦Open settings and help (H)⟧',
      },
      '?',
      '⟦Open help with ?⟧'
    );

    expect(button.querySelector('[data-hud-menu-key]')?.textContent).toBe('?');
    expect(button.getAttribute('aria-label')).toBe(
      '⟦Open settings and help (?)⟧'
    );
    expect(button.title).toBe('⟦Open settings and help (?)⟧');
    expect(button.dataset.hudAnnounce).toBe('⟦Open help with ?⟧');
  });

  it('updates button and close labels when strings refresh', () => {
    const { container, button, popover, closeButton, list } = createOverlay();
    const handle = createResponsiveControlOverlay({
      container,
      list,
      button,
      popover,
      closeButton,
      strings: createStrings(),
    });

    handle.setStrings(createStrings('Controls menu'));

    expect(button.textContent).toBe('Controls menu');
    expect(button.getAttribute('aria-label')).toBe('Controls menu');
    expect(closeButton.getAttribute('aria-label')).toBe('Close controls');

    handle.dispose();
  });

  it('removes listeners and restores initial hidden state on dispose', () => {
    const { container, button, popover, list } = createOverlay();
    const interact = container.querySelector<HTMLElement>(
      '[data-control-item="interact"]'
    );
    const handle = createResponsiveControlOverlay({
      container,
      list,
      button,
      popover,
      strings: createStrings(),
    });

    handle.open();
    expect(popover.hidden).toBe(false);
    handle.dispose();

    expect(popover.hidden).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBeNull();
    expect(container.dataset.controlsOpen).toBeUndefined();
    expect(interact?.hidden).toBe(true);

    button.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(popover.hidden).toBe(true);
  });

  it('requires the popover contract instead of reviving legacy collapse markup', () => {
    const container = document.createElement('div');
    container.dataset.activeInput = 'keyboard';
    container.innerHTML = `
      <button type="button" data-role="control-toggle">Show all controls</button>
      <ul data-role="control-list">
        <li data-control-item="keyboardMove" data-input-methods="keyboard"></li>
        <li data-control-item="pointerDrag" data-input-methods="pointer"></li>
      </ul>
    `;
    document.body.append(container);
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-role="control-toggle"]'
    );
    const list = container.querySelector<HTMLElement>(
      '[data-role="control-list"]'
    );
    const pointer = container.querySelector<HTMLElement>(
      '[data-control-item="pointerDrag"]'
    );

    if (!toggle || !list || !pointer) {
      throw new Error('Failed to create legacy control overlay fixture.');
    }

    const handle = createResponsiveControlOverlay({
      container,
      list,
      strings: createStrings(),
      initialLayout: 'mobile',
    });

    expect(handle.isOpen()).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBeNull();
    expect(pointer.hidden).toBe(false);
    expect(pointer.dataset.mobileCollapsed).toBeUndefined();

    toggle.click();
    handle.toggle();

    expect(handle.isOpen()).toBe(false);
    expect(pointer.hidden).toBe(false);
    expect(container.dataset.controlCollapsed).toBeUndefined();

    handle.dispose();
  });

  it('keeps reduced-motion HUD selectors wired for popover controls', () => {
    const styles = readFileSync('src/ui/styles.css', 'utf8');

    expect(styles).toContain(
      ":root[data-accessibility-motion='reduced'] .overlay__menu-button"
    );
    expect(styles).toContain(
      ":root[data-accessibility-motion='reduced'] .overlay__popover"
    );
    expect(styles).toContain(
      ":root[data-accessibility-motion='reduced'] .overlay__popover-close"
    );
    expect(styles).toContain('transform: none;');
  });

  it('represents the controls popover shortcut in the key binding model', () => {
    expect(DEFAULT_KEY_BINDINGS.toggleControls).toEqual(['c']);
    expect(DEFAULT_KEY_BINDINGS.zoomIn).toEqual(['Shift+Equal']);
    expect(DEFAULT_KEY_BINDINGS.zoomOut).toEqual(['Shift+Minus']);
  });
});
