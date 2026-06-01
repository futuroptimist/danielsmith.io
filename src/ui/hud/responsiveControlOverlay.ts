import type { ControlOverlayStrings } from '../../assets/i18n/types';

import type { HudLayout } from './layoutManager';
import type { InputMethod } from './movementLegend';

export type LegacyResponsiveControlOverlayStrings =
  ControlOverlayStrings['mobileToggle'];
export type ResponsiveControlOverlayStrings =
  | ControlOverlayStrings
  | LegacyResponsiveControlOverlayStrings;

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
  button?: HTMLButtonElement | null;
  toggle?: HTMLButtonElement | null;
  popover?: HTMLElement | null;
  closeButton?: HTMLButtonElement | null;
  strings: ResponsiveControlOverlayStrings;
  initialLayout?: HudLayout;
  defaultCollapsed?: boolean;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  documentTarget?: Document;
  windowTarget?: Window;
}

const CONTROL_LIST_SELECTOR = '[data-role="control-list"]';
const CONTROL_ITEM_SELECTOR = '[data-control-item]';
const CONTROL_BUTTON_SELECTOR = '[data-role="controls-button"]';
const LEGACY_CONTROL_TOGGLE_SELECTOR = '[data-role="control-toggle"]';
const CONTROL_POPOVER_SELECTOR = '[data-role="controls-popover"]';
const CONTROL_CLOSE_SELECTOR = '[data-role="controls-close"]';
const CONTROL_HEADING_SELECTOR = '[data-control-text="heading"]';
const CONTROL_LIST_ID = 'control-overlay-list';
const CONTROL_POPOVER_ID = 'control-overlay-popover';
const CONTROL_OPEN_KEY = 'controlsOpen';
const CONTROL_COLLAPSED_KEY = 'controlCollapsed';
const MOBILE_COLLAPSED_KEY = 'mobileCollapsed';
const COLLAPSE_STORAGE_KEY = 'hud:control-overlay-collapsed';
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

const getToggleStrings = (
  strings: ResponsiveControlOverlayStrings
): LegacyResponsiveControlOverlayStrings =>
  'mobileToggle' in strings ? strings.mobileToggle : strings;

const legacyMatchActiveMethod = (
  methods: ReadonlyArray<InputMethod>,
  active: InputMethod | null
): boolean => !active || matchActiveMethod(methods, active);

const getLegacyCollapsibleItems = (
  container: HTMLElement,
  items: ReadonlyArray<HTMLElement>
): ReadonlyArray<HTMLElement> => {
  const activeMethod = getActiveMethod(container);
  return items.filter((item) => {
    const methods = parseInputMethods(item.dataset.inputMethods);
    const controlId = item.dataset.controlItem ?? '';
    if (controlId === 'interact') {
      return false;
    }
    return !legacyMatchActiveMethod(methods, activeMethod);
  });
};

const applyLegacyToggleLabel = (
  toggle: HTMLButtonElement,
  strings: LegacyResponsiveControlOverlayStrings,
  collapsed: boolean
) => {
  toggle.textContent = collapsed ? strings.expandLabel : strings.collapseLabel;
  toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  toggle.dataset.hudAnnounce = collapsed
    ? strings.expandAnnouncement
    : strings.collapseAnnouncement;
};

const applyLegacyContainerState = (
  container: HTMLElement,
  layout: HudLayout,
  collapsed: boolean
) => {
  if (layout !== 'mobile') {
    delete (container.dataset as Record<string, string | undefined>)[
      CONTROL_COLLAPSED_KEY
    ];
    return;
  }
  container.dataset[CONTROL_COLLAPSED_KEY] = collapsed ? 'true' : 'false';
};

const applyLegacyCollapsedState = (
  items: ReadonlyArray<HTMLElement>,
  collapsedHiddenStates: WeakMap<HTMLElement, boolean>,
  layout: HudLayout,
  collapsed: boolean,
  collapsibleTargets: ReadonlyArray<HTMLElement>
) => {
  const collapsibleSet =
    collapsibleTargets.length > 0 ? new Set(collapsibleTargets) : null;
  const shouldCollapse =
    layout === 'mobile' && collapsed && collapsibleTargets.length > 0;

  const restoreCollapsedState = (item: HTMLElement) => {
    delete (item.dataset as Record<string, string | undefined>)[
      MOBILE_COLLAPSED_KEY
    ];
    if (!collapsedHiddenStates.has(item)) {
      return;
    }
    const previousHidden = collapsedHiddenStates.get(item);
    collapsedHiddenStates.delete(item);
    if (previousHidden !== undefined) {
      item.hidden = previousHidden;
    }
  };

  for (const item of items) {
    if (!shouldCollapse || !collapsibleSet?.has(item)) {
      restoreCollapsedState(item);
      continue;
    }

    if (!collapsedHiddenStates.has(item)) {
      collapsedHiddenStates.set(item, item.hidden);
    }
    item.dataset[MOBILE_COLLAPSED_KEY] = 'true';
    item.hidden = true;
  }
};

const getStorage = (
  windowTarget?: Window,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
): Pick<Storage, 'getItem' | 'setItem'> | null => {
  if (storage === null) {
    return null;
  }
  if (storage) {
    return storage;
  }
  if (!windowTarget) {
    return null;
  }
  try {
    return windowTarget.localStorage ?? null;
  } catch {
    return null;
  }
};

const readPersistedCollapsed = (
  storage: Pick<Storage, 'getItem'> | null
): boolean | null => {
  if (!storage) {
    return null;
  }
  try {
    const value = storage.getItem(COLLAPSE_STORAGE_KEY);
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
  } catch {
    return null;
  }
  return null;
};

const persistCollapsed = (
  storage: Pick<Storage, 'setItem'> | null,
  collapsed: boolean
) => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? 'true' : 'false');
  } catch {
    /* ignore storage errors */
  }
};

const createLegacyResponsiveControlOverlay = (
  options: ResponsiveControlOverlayOptions,
  list: HTMLElement,
  toggle: HTMLButtonElement
): ResponsiveControlOverlayHandle => {
  const {
    container,
    strings,
    initialLayout = 'desktop',
    defaultCollapsed,
    windowTarget = typeof window !== 'undefined' ? window : undefined,
    storage: providedStorage,
  } = options;
  const controlItems = Array.from(
    list.querySelectorAll<HTMLElement>(CONTROL_ITEM_SELECTOR)
  );
  const initialHiddenStates = new WeakMap<HTMLElement, boolean>();
  const collapsedHiddenStates = new WeakMap<HTMLElement, boolean>();
  controlItems.forEach((item) => {
    initialHiddenStates.set(item, item.hidden);
  });

  const listId = ensureId(list, CONTROL_LIST_ID);
  toggle.setAttribute('aria-controls', listId);

  const storage = getStorage(windowTarget, providedStorage);
  const readStoredCollapsed = () => readPersistedCollapsed(storage);
  const resolveMobileCollapsed = () =>
    readStoredCollapsed() ?? defaultCollapsed ?? true;

  let layout: HudLayout = initialLayout;
  let collapsed = layout === 'mobile' ? resolveMobileCollapsed() : false;
  let currentStrings = getToggleStrings(strings);
  let disposed = false;
  let canCollapse = false;

  const update = () => {
    if (disposed) {
      return;
    }
    const collapsibleItems = getLegacyCollapsibleItems(container, controlItems);
    canCollapse = layout === 'mobile' && collapsibleItems.length > 0;
    const effectiveCollapsed = canCollapse ? collapsed : false;

    applyLegacyContainerState(container, layout, effectiveCollapsed);
    applyLegacyCollapsedState(
      controlItems,
      collapsedHiddenStates,
      layout,
      effectiveCollapsed,
      collapsibleItems
    );
    if (layout === 'mobile' && canCollapse) {
      persistCollapsed(storage, collapsed);
      toggle.hidden = false;
      applyLegacyToggleLabel(toggle, currentStrings, effectiveCollapsed);
    } else {
      toggle.hidden = true;
      toggle.removeAttribute('aria-expanded');
      toggle.dataset.hudAnnounce = '';
    }
  };

  const setCollapsed = (next: boolean) => {
    const normalized = layout === 'mobile' ? next : false;
    if (collapsed === normalized) {
      update();
      return;
    }
    collapsed = normalized;
    update();
  };

  const handleToggleClick = () => {
    if (layout !== 'mobile') {
      return;
    }
    setCollapsed(!collapsed);
  };

  toggle.addEventListener('click', handleToggleClick);

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
      setCollapsed(false);
    },
    close() {
      setCollapsed(true);
    },
    toggle() {
      handleToggleClick();
    },
    isOpen() {
      return layout === 'mobile' && canCollapse ? !collapsed : false;
    },
    setLayout(nextLayout: HudLayout) {
      if (layout === nextLayout) {
        update();
        return;
      }
      layout = nextLayout;
      if (layout === 'mobile') {
        collapsed = resolveMobileCollapsed();
      } else {
        collapsed = false;
      }
      update();
    },
    setStrings(nextStrings: ResponsiveControlOverlayStrings) {
      currentStrings = getToggleStrings(nextStrings);
      if (layout === 'mobile') {
        applyLegacyToggleLabel(toggle, currentStrings, collapsed);
      }
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
      toggle.hidden = true;
      toggle.removeAttribute('aria-expanded');
      toggle.removeAttribute('aria-controls');
      toggle.dataset.hudAnnounce = '';
      toggle.textContent = currentStrings.expandLabel;
      delete (container.dataset as Record<string, string | undefined>)[
        CONTROL_COLLAPSED_KEY
      ];
      for (const item of controlItems) {
        delete (item.dataset as Record<string, string | undefined>)[
          MOBILE_COLLAPSED_KEY
        ];
        item.hidden = initialHiddenStates.get(item) ?? false;
      }
    },
  };
};

const setOpenState = (
  container: HTMLElement,
  popover: HTMLElement,
  button: HTMLButtonElement,
  open: boolean,
  strings: ResponsiveControlOverlayStrings
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
  } = options;

  const list = options.list ?? container.querySelector(CONTROL_LIST_SELECTOR);
  const button =
    options.button ??
    options.toggle ??
    container.querySelector(CONTROL_BUTTON_SELECTOR) ??
    container.querySelector(LEGACY_CONTROL_TOGGLE_SELECTOR);
  const popover =
    options.popover ?? container.querySelector(CONTROL_POPOVER_SELECTOR);
  const closeButton =
    options.closeButton ?? container.querySelector(CONTROL_CLOSE_SELECTOR);

  if (
    list instanceof HTMLElement &&
    button instanceof HTMLButtonElement &&
    !(popover instanceof HTMLElement)
  ) {
    return createLegacyResponsiveControlOverlay(options, list, button);
  }

  if (
    !(list instanceof HTMLElement) ||
    !(button instanceof HTMLButtonElement) ||
    !(popover instanceof HTMLElement)
  ) {
    return {
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
  const labelId = ensureId(labelElement, CONTROL_LIST_ID);
  const popoverId = ensureId(popover, CONTROL_POPOVER_ID);
  button.setAttribute('aria-controls', popoverId);
  button.setAttribute('aria-haspopup', 'dialog');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'false');
  popover.setAttribute('aria-labelledby', labelId);

  let currentStrings: ControlOverlayStrings =
    'mobileToggle' in strings
      ? { ...strings }
      : ({ mobileToggle: strings } as ControlOverlayStrings);
  let layout: HudLayout = initialLayout;
  let open = false;
  let disposed = false;

  const applyStrings = () => {
    button.textContent = currentStrings.heading;
    button.setAttribute('aria-label', currentStrings.heading);
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

  button.addEventListener('click', handleButtonClick);
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
    setStrings(nextStrings: ResponsiveControlOverlayStrings) {
      currentStrings =
        'mobileToggle' in nextStrings
          ? { ...nextStrings }
          : ({ mobileToggle: nextStrings } as ControlOverlayStrings);
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
      button.removeEventListener('click', handleButtonClick);
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
