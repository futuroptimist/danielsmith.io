import type { ControlOverlayStrings } from '../../assets/i18n/types';

import type { HudLayout } from './layoutManager';
import type { InputMethod } from './movementLegend';

export type ResponsiveControlOverlayStrings =
  ControlOverlayStrings['mobileToggle'];

export interface ResponsiveControlOverlayHandle {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  setLayout(layout: HudLayout): void;
  setStrings(strings: ResponsiveControlOverlayStrings): void;
  refresh(): void;
  dispose(): void;
}

export interface ResponsiveControlOverlayOptions {
  container: HTMLElement;
  list?: HTMLElement | null;
  toggle?: HTMLButtonElement | null;
  popover?: HTMLElement | null;
  closeButton?: HTMLButtonElement | null;
  strings: ResponsiveControlOverlayStrings;
  initialLayout?: HudLayout;
  defaultOpen?: boolean;
  /** @deprecated kept for compatibility with the previous mobile collapse API. */
  defaultCollapsed?: boolean;
  /** @deprecated kept for compatibility with the previous mobile collapse API. */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  windowTarget?: Window;
}

const CONTROL_LIST_SELECTOR = '[data-role="control-list"]';
const CONTROL_ITEM_SELECTOR = '[data-control-item]';
const CONTROL_TOGGLE_SELECTOR = '[data-role="control-toggle"]';
const CONTROL_POPOVER_SELECTOR = '[data-role="control-popover"]';
const CONTROL_CLOSE_SELECTOR = '[data-role="control-close"]';
const CONTROL_OPEN_KEY = 'controlsOpen';
const ACTIVE_STATE = 'active';
const CONTROL_POPOVER_ID = 'control-overlay-popover';

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
  const value = container.dataset.activeInput;
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

const ensurePopoverId = (popover: HTMLElement): string => {
  if (popover.id) {
    return popover.id;
  }
  popover.id = CONTROL_POPOVER_ID;
  return popover.id;
};

const setAnnouncement = (
  toggle: HTMLButtonElement,
  strings: ResponsiveControlOverlayStrings,
  open: boolean
) => {
  toggle.dataset.hudAnnounce = open
    ? strings.expandAnnouncement
    : strings.collapseAnnouncement;
};

const syncExpandedState = (
  container: HTMLElement,
  popover: HTMLElement,
  toggle: HTMLButtonElement,
  closeButton: HTMLButtonElement | null,
  strings: ResponsiveControlOverlayStrings,
  open: boolean
) => {
  popover.hidden = !open;
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  container.dataset[CONTROL_OPEN_KEY] = open ? 'true' : 'false';
  setAnnouncement(toggle, strings, open);
  if (closeButton) {
    closeButton.dataset.hudAnnounce = strings.collapseAnnouncement;
  }
};

const applyActiveInputState = (
  container: HTMLElement,
  items: ReadonlyArray<HTMLElement>
) => {
  const active = getActiveMethod(container);
  for (const item of items) {
    const methods = parseInputMethods(item.dataset.inputMethods);
    if (matchActiveMethod(methods, active)) {
      item.dataset.state = ACTIVE_STATE;
    } else if (item.dataset.state === ACTIVE_STATE) {
      delete item.dataset.state;
    }
  }
};

const getEventTargetNode = (event: Event): Node | null => {
  const target = event.target;
  return target instanceof Node ? target : null;
};

const isEventInside = (event: Event, elements: ReadonlyArray<HTMLElement>) => {
  const target = getEventTargetNode(event);
  return Boolean(
    target && elements.some((element) => element.contains(target))
  );
};

const noopHandle = (): ResponsiveControlOverlayHandle => ({
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

export function createResponsiveControlOverlay(
  options: ResponsiveControlOverlayOptions
): ResponsiveControlOverlayHandle {
  const {
    container,
    strings,
    initialLayout = 'desktop',
    defaultOpen = false,
    windowTarget = typeof window !== 'undefined' ? window : undefined,
  } = options;

  const list = options.list ?? container.querySelector(CONTROL_LIST_SELECTOR);
  const toggle =
    options.toggle ?? container.querySelector(CONTROL_TOGGLE_SELECTOR);
  const popover =
    options.popover ?? container.querySelector(CONTROL_POPOVER_SELECTOR);
  const closeButton =
    options.closeButton ?? container.querySelector(CONTROL_CLOSE_SELECTOR);

  if (
    !(list instanceof HTMLElement) ||
    !(toggle instanceof HTMLButtonElement) ||
    !(popover instanceof HTMLElement)
  ) {
    return noopHandle();
  }

  const resolvedCloseButton =
    closeButton instanceof HTMLButtonElement ? closeButton : null;
  const controlItems = Array.from(
    list.querySelectorAll<HTMLElement>(CONTROL_ITEM_SELECTOR)
  );
  const initialOpen = defaultOpen && initialLayout !== 'mobile';
  const initialPopoverHidden = popover.hidden;
  const initialToggleText = toggle.textContent ?? '';
  const initialCloseText = resolvedCloseButton?.textContent ?? '';
  const popoverId = ensurePopoverId(popover);

  let layout: HudLayout = initialLayout;
  let currentStrings: ResponsiveControlOverlayStrings = { ...strings };
  let open = initialOpen;
  let disposed = false;

  toggle.hidden = false;
  toggle.setAttribute('aria-controls', popoverId);
  toggle.setAttribute('aria-haspopup', 'dialog');
  if (resolvedCloseButton) {
    resolvedCloseButton.setAttribute('aria-controls', popoverId);
  }

  const update = () => {
    if (disposed) {
      return;
    }
    applyActiveInputState(container, controlItems);
    syncExpandedState(
      container,
      popover,
      toggle,
      resolvedCloseButton,
      currentStrings,
      open
    );
    container.dataset.hudLayout = layout;
  };

  const setOpen = (nextOpen: boolean) => {
    if (open === nextOpen) {
      update();
      return;
    }
    open = nextOpen;
    update();
  };

  const handleToggleClick = () => {
    setOpen(!open);
  };

  const handleCloseClick = () => {
    setOpen(false);
    toggle.focus({ preventScroll: true });
  };

  const handleDocumentPointerDown = (event: PointerEvent) => {
    if (!open || isEventInside(event, [popover, toggle])) {
      return;
    }
    setOpen(false);
  };

  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (!open || event.key !== 'Escape') {
      return;
    }
    event.preventDefault();
    setOpen(false);
    toggle.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', handleToggleClick);
  resolvedCloseButton?.addEventListener('click', handleCloseClick);
  windowTarget?.document.addEventListener(
    'pointerdown',
    handleDocumentPointerDown
  );
  windowTarget?.document.addEventListener('keydown', handleDocumentKeyDown);

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

  update();

  return {
    open() {
      setOpen(true);
    },
    close() {
      setOpen(false);
    },
    toggle() {
      setOpen(!open);
    },
    isOpen() {
      return open;
    },
    setLayout(nextLayout: HudLayout) {
      layout = nextLayout;
      if (layout === 'mobile') {
        open = false;
      }
      update();
    },
    setStrings(nextStrings: ResponsiveControlOverlayStrings) {
      currentStrings = { ...nextStrings };
      update();
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
      toggle.removeEventListener('click', handleToggleClick);
      resolvedCloseButton?.removeEventListener('click', handleCloseClick);
      windowTarget?.document.removeEventListener(
        'pointerdown',
        handleDocumentPointerDown
      );
      windowTarget?.document.removeEventListener(
        'keydown',
        handleDocumentKeyDown
      );
      popover.hidden = initialPopoverHidden;
      toggle.removeAttribute('aria-expanded');
      toggle.removeAttribute('aria-controls');
      toggle.removeAttribute('aria-haspopup');
      toggle.dataset.hudAnnounce = '';
      toggle.textContent = initialToggleText;
      if (resolvedCloseButton) {
        resolvedCloseButton.removeAttribute('aria-controls');
        resolvedCloseButton.dataset.hudAnnounce = '';
        resolvedCloseButton.textContent = initialCloseText;
      }
      delete (container.dataset as Record<string, string | undefined>)[
        CONTROL_OPEN_KEY
      ];
      delete container.dataset.hudLayout;
      for (const item of controlItems) {
        if (item.dataset.state === ACTIVE_STATE) {
          delete item.dataset.state;
        }
      }
    },
  };
}
