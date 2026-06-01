import type { ControlOverlayStrings } from '../../assets/i18n/types';

import type { HudLayout } from './layoutManager';

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
  closeButton?: HTMLButtonElement | null;
  popover?: HTMLElement | null;
  strings: ResponsiveControlOverlayStrings;
  initialLayout?: HudLayout;
  defaultCollapsed?: boolean;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  windowTarget?: Window;
}

const CONTROL_LIST_SELECTOR = '[data-role="control-list"]';
const CONTROL_TOGGLE_SELECTOR = '[data-role="control-toggle"]';
const CONTROL_POPOVER_SELECTOR = '[data-role="control-popover"]';
const CONTROL_CLOSE_SELECTOR = '[data-role="control-close"]';
const CONTROL_POPOVER_ID = 'control-overlay-popover';
const CONTROL_OPEN_KEY = 'controlPopoverOpen';

const noopHandle: ResponsiveControlOverlayHandle = {
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
};

const ensurePopoverId = (popover: HTMLElement): string => {
  if (popover.id) {
    return popover.id;
  }
  popover.id = CONTROL_POPOVER_ID;
  return popover.id;
};

const setDatasetValue = (
  container: HTMLElement,
  key: string,
  value?: string
): void => {
  if (value === undefined) {
    delete (container.dataset as Record<string, string | undefined>)[key];
    return;
  }
  (container.dataset as Record<string, string>)[key] = value;
};

export function createResponsiveControlOverlay(
  options: ResponsiveControlOverlayOptions
): ResponsiveControlOverlayHandle {
  const { container, strings, initialLayout = 'desktop' } = options;

  const documentTarget = container.ownerDocument;
  const list = options.list ?? container.querySelector(CONTROL_LIST_SELECTOR);
  const toggleButton =
    options.toggle ?? container.querySelector(CONTROL_TOGGLE_SELECTOR);
  const popover =
    options.popover ?? container.querySelector(CONTROL_POPOVER_SELECTOR);
  const closeButton =
    options.closeButton ?? container.querySelector(CONTROL_CLOSE_SELECTOR);

  if (
    !(list instanceof HTMLElement) ||
    !(toggleButton instanceof HTMLButtonElement) ||
    !(popover instanceof HTMLElement) ||
    !(closeButton instanceof HTMLButtonElement)
  ) {
    return noopHandle;
  }

  const popoverId = ensurePopoverId(popover);
  toggleButton.setAttribute('aria-controls', popoverId);
  closeButton.setAttribute('aria-controls', popoverId);

  let currentStrings: ResponsiveControlOverlayStrings = { ...strings };
  let layout: HudLayout = initialLayout;
  let open = false;
  let disposed = false;

  const applyLabels = () => {
    toggleButton.textContent =
      toggleButton.dataset.controlLabel ?? currentStrings.expandLabel;
    toggleButton.dataset.hudAnnounce = open
      ? currentStrings.collapseAnnouncement
      : currentStrings.expandAnnouncement;
    closeButton.textContent = currentStrings.collapseLabel;
    closeButton.dataset.hudAnnounce = currentStrings.collapseAnnouncement;
  };

  const applyState = () => {
    if (disposed) {
      return;
    }
    popover.hidden = !open;
    toggleButton.hidden = false;
    toggleButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    closeButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    setDatasetValue(container, CONTROL_OPEN_KEY, open ? 'true' : 'false');
    container.dataset.hudLayout = layout;
    container.setAttribute('data-hud-layout', layout);
    applyLabels();
  };

  const setOpen = (nextOpen: boolean) => {
    if (open === nextOpen) {
      applyState();
      return;
    }
    open = nextOpen;
    applyState();
  };

  const handleToggleClick = () => {
    setOpen(!open);
  };

  const handleCloseClick = () => {
    setOpen(false);
  };

  const handleDocumentPointerDown = (event: PointerEvent) => {
    if (!open) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (popover.contains(target) || toggleButton.contains(target)) {
      return;
    }
    setOpen(false);
  };

  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.key !== 'Escape' || !open) {
      return;
    }
    event.preventDefault();
    setOpen(false);
  };

  toggleButton.addEventListener('click', handleToggleClick);
  closeButton.addEventListener('click', handleCloseClick);
  documentTarget.addEventListener('pointerdown', handleDocumentPointerDown, {
    capture: true,
  });
  documentTarget.addEventListener('keydown', handleDocumentKeyDown);

  applyState();

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
      applyState();
    },
    setStrings(nextStrings: ResponsiveControlOverlayStrings) {
      currentStrings = { ...nextStrings };
      applyLabels();
    },
    refresh() {
      applyState();
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      open = false;
      toggleButton.removeEventListener('click', handleToggleClick);
      closeButton.removeEventListener('click', handleCloseClick);
      documentTarget.removeEventListener(
        'pointerdown',
        handleDocumentPointerDown,
        true
      );
      documentTarget.removeEventListener('keydown', handleDocumentKeyDown);
      popover.hidden = true;
      toggleButton.hidden = true;
      toggleButton.removeAttribute('aria-expanded');
      closeButton.removeAttribute('aria-expanded');
      setDatasetValue(container, CONTROL_OPEN_KEY);
      setDatasetValue(container, 'hudLayout');
      container.removeAttribute('data-hud-layout');
    },
  };
}
