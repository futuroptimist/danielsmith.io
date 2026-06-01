import type { ControlOverlayStrings } from '../../assets/i18n/types';

import type { HudLayout } from './layoutManager';
import type { InputMethod } from './movementLegend';

export interface ResponsiveControlOverlayHandle {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  setLayout(layout: HudLayout): void;
  setStrings(strings: ControlOverlayStrings): void;
  refresh(): void;
  dispose(): void;
}

export interface ResponsiveControlOverlayOptions {
  container: HTMLElement;
  list?: HTMLElement | null;
  button?: HTMLButtonElement | null;
  popover?: HTMLElement | null;
  closeButton?: HTMLButtonElement | null;
  strings: ControlOverlayStrings;
  initialLayout?: HudLayout;
  documentTarget?: Document;
  manageButtonClick?: boolean;
}

const CONTROL_LIST_SELECTOR = '[data-role="control-list"]';
const CONTROL_ITEM_SELECTOR = '[data-control-item]';
const CONTROL_BUTTON_SELECTOR = '[data-role="controls-button"]';
const CONTROL_POPOVER_SELECTOR = '[data-role="controls-popover"]';
const CONTROL_CLOSE_SELECTOR = '[data-role="controls-close"]';
const CONTROL_HEADING_SELECTOR = '[data-control-text="heading"]';
const CONTROL_POPOVER_ID = 'control-overlay-popover';
const CONTROL_OPEN_KEY = 'controlsOpen';
const ACTIVE_INPUT_KEY = 'activeInput';
const ACTIVE_METHOD_KEY = 'activeMethod';

const INPUT_METHODS: ReadonlyArray<InputMethod> = [
  'keyboard',
  'pointer',
  'touch',
  'gamepad',
];

const isInputMethod = (
  value: string | null | undefined
): value is InputMethod => INPUT_METHODS.includes(value as InputMethod);

const parseInputMethods = (
  value: string | null | undefined
): ReadonlyArray<InputMethod> => {
  if (!value) {
    return [];
  }
  return value
    .split(/[\s,]+/)
    .map((method) => method.trim())
    .filter(isInputMethod);
};

const getActiveMethod = (container: HTMLElement): InputMethod | null => {
  const value = container.dataset[ACTIVE_INPUT_KEY];
  return isInputMethod(value) ? value : null;
};

const matchActiveMethod = (
  methods: ReadonlyArray<InputMethod>,
  active: InputMethod | null
): boolean => {
  if (!active) {
    return false;
  }
  if (methods.includes(active)) {
    return true;
  }
  return active === 'gamepad' && methods.includes('keyboard');
};

const ensureId = (element: HTMLElement, fallback: string): string => {
  if (element.id) {
    return element.id;
  }
  element.id = fallback;
  return element.id;
};

const createNoopResponsiveControlOverlay =
  (): ResponsiveControlOverlayHandle => ({
    open() {
      /* noop */
    },
    close() {
      /* noop */
    },
    toggle() {
      /* noop */
    },
    isOpen() {
      return false;
    },
    setLayout() {
      /* noop */
    },
    setStrings() {
      /* noop */
    },
    refresh() {
      /* noop */
    },
    dispose() {
      /* noop */
    },
  });

const setOpenState = (
  container: HTMLElement,
  popover: HTMLElement,
  button: HTMLButtonElement,
  open: boolean,
  strings: ControlOverlayStrings
) => {
  popover.hidden = !open;
  container.dataset[CONTROL_OPEN_KEY] = open ? 'true' : 'false';
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  button.dataset.hudAnnounce = open
    ? strings.mobileToggle.collapseAnnouncement
    : strings.mobileToggle.expandAnnouncement;
};

export function createResponsiveControlOverlay(
  options: ResponsiveControlOverlayOptions
): ResponsiveControlOverlayHandle {
  const {
    container,
    strings,
    initialLayout = 'desktop',
    documentTarget = typeof document !== 'undefined' ? document : undefined,
    manageButtonClick = true,
  } = options;

  const list = options.list ?? container.querySelector(CONTROL_LIST_SELECTOR);
  const button =
    options.button ?? container.querySelector(CONTROL_BUTTON_SELECTOR);
  const popover =
    options.popover ?? container.querySelector(CONTROL_POPOVER_SELECTOR);
  const closeButton =
    options.closeButton ?? container.querySelector(CONTROL_CLOSE_SELECTOR);

  if (
    !(list instanceof HTMLElement) ||
    !(button instanceof HTMLButtonElement) ||
    !(popover instanceof HTMLElement)
  ) {
    return createNoopResponsiveControlOverlay();
  }

  const controlItems = Array.from(
    list.querySelectorAll<HTMLElement>(CONTROL_ITEM_SELECTOR)
  );
  const initialHiddenStates = new WeakMap<HTMLElement, boolean>();
  controlItems.forEach((item) => {
    initialHiddenStates.set(item, item.hidden);
  });

  const heading = container.querySelector(CONTROL_HEADING_SELECTOR);
  const labelElement = heading instanceof HTMLElement ? heading : list;
  const labelId = ensureId(labelElement, 'control-overlay-popover-heading');
  const popoverId = ensureId(popover, CONTROL_POPOVER_ID);
  const ownsContainerLabel =
    !container.hasAttribute('aria-label') &&
    !container.hasAttribute('aria-labelledby');
  button.setAttribute('aria-controls', popoverId);
  button.setAttribute('aria-haspopup', 'dialog');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'false');
  popover.setAttribute('aria-labelledby', labelId);

  let currentStrings: ControlOverlayStrings = { ...strings };
  let layout: HudLayout = initialLayout;
  let open = false;
  let disposed = false;

  const applyStrings = () => {
    if (ownsContainerLabel) {
      container.setAttribute('aria-label', currentStrings.heading);
    }
    const menuLabel = button.querySelector('[data-hud-menu-label]');
    if (menuLabel instanceof HTMLElement) {
      menuLabel.textContent = currentStrings.menu.controls.label;
      const menuKey = button.querySelector('[data-hud-menu-key]');
      if (menuKey instanceof HTMLElement) {
        menuKey.textContent = currentStrings.menu.controls.keyHint;
      }
      button.setAttribute('aria-label', currentStrings.menu.controls.title);
      button.title = currentStrings.menu.controls.title;
    } else {
      button.textContent = currentStrings.heading;
      button.setAttribute('aria-label', currentStrings.heading);
    }
    if (closeButton instanceof HTMLButtonElement) {
      closeButton.setAttribute(
        'aria-label',
        currentStrings.mobileToggle.collapseLabel
      );
      closeButton.title = currentStrings.mobileToggle.collapseLabel;
    }
    setOpenState(container, popover, button, open, currentStrings);
  };

  const refreshActiveInput = () => {
    const activeMethod = getActiveMethod(container);
    for (const item of controlItems) {
      const methods = parseInputMethods(item.dataset.inputMethods);
      const isActive = matchActiveMethod(methods, activeMethod);
      item.dataset[ACTIVE_METHOD_KEY] = isActive ? 'true' : 'false';
    }
  };

  const update = () => {
    if (disposed) {
      return;
    }
    container.dataset.hudLayout = layout;
    refreshActiveInput();
    setOpenState(container, popover, button, open, currentStrings);
  };

  const close = () => {
    if (!open) {
      update();
      return;
    }
    open = false;
    update();
  };

  const openPopover = () => {
    if (open) {
      update();
      return;
    }
    open = true;
    update();
  };

  const togglePopover = () => {
    if (open) {
      close();
    } else {
      openPopover();
    }
  };

  const handleButtonClick = () => {
    togglePopover();
  };

  const handleCloseClick = () => {
    close();
    button.focus();
  };

  const handleDocumentPointerDown = (event: MouseEvent | PointerEvent) => {
    if (!open) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (popover.contains(target) || button.contains(target)) {
      return;
    }
    close();
  };

  const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
      button.focus();
    }
  };

  if (manageButtonClick) {
    button.addEventListener('click', handleButtonClick);
  }
  closeButton?.addEventListener('click', handleCloseClick);
  documentTarget?.addEventListener('pointerdown', handleDocumentPointerDown);
  documentTarget?.addEventListener('keydown', handleDocumentKeydown);

  const observer = new MutationObserver((mutations) => {
    if (
      mutations.some(
        (mutation) =>
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-active-input'
      )
    ) {
      update();
    }
  });

  observer.observe(container, {
    attributes: true,
    attributeFilter: ['data-active-input'],
  });

  applyStrings();
  update();

  return {
    open: openPopover,
    close,
    toggle: togglePopover,
    isOpen() {
      return open;
    },
    setLayout(nextLayout: HudLayout) {
      layout = nextLayout;
      update();
    },
    setStrings(nextStrings: ControlOverlayStrings) {
      currentStrings = { ...nextStrings };
      applyStrings();
    },
    refresh() {
      update();
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      observer.disconnect();
      if (manageButtonClick) {
        button.removeEventListener('click', handleButtonClick);
      }
      closeButton?.removeEventListener('click', handleCloseClick);
      documentTarget?.removeEventListener(
        'pointerdown',
        handleDocumentPointerDown
      );
      documentTarget?.removeEventListener('keydown', handleDocumentKeydown);
      popover.hidden = true;
      button.removeAttribute('aria-expanded');
      button.removeAttribute('aria-controls');
      button.removeAttribute('aria-haspopup');
      button.dataset.hudAnnounce = '';
      if (ownsContainerLabel) {
        container.removeAttribute('aria-label');
      }
      delete (container.dataset as Record<string, string | undefined>)[
        CONTROL_OPEN_KEY
      ];
      delete (container.dataset as Record<string, string | undefined>)
        .hudLayout;
      for (const item of controlItems) {
        delete (item.dataset as Record<string, string | undefined>)[
          ACTIVE_METHOD_KEY
        ];
        item.hidden = initialHiddenStates.get(item) ?? false;
      }
    },
  };
}
