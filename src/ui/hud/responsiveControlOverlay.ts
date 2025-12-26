import type { ControlOverlayStrings } from '../../assets/i18n/types';

import type { HudLayout } from './layoutManager';
import type { InputMethod } from './movementLegend';

export type ResponsiveControlOverlayStrings =
  ControlOverlayStrings['mobileToggle'];

export interface ResponsiveControlOverlayHandle {
  setLayout(layout: HudLayout): void;
  setStrings(strings: ResponsiveControlOverlayStrings): void;
  refresh(): void;
  dispose(): void;
}

export interface ResponsiveControlOverlayOptions {
  container: HTMLElement;
  list?: HTMLElement | null;
  toggle?: HTMLButtonElement | null;
  strings: ResponsiveControlOverlayStrings;
  initialLayout?: HudLayout;
  defaultCollapsed?: boolean;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  windowTarget?: Window;
}

const CONTROL_LIST_SELECTOR = '[data-role="control-list"]';
const CONTROL_ITEM_SELECTOR = '[data-control-item]';
const CONTROL_TOGGLE_SELECTOR = '[data-role="control-toggle"]';
const CONTROL_COLLAPSED_KEY = 'controlCollapsed';
const MOBILE_COLLAPSED_KEY = 'mobileCollapsed';
const CONTROL_LIST_ID = 'control-overlay-list';
const COLLAPSE_STORAGE_KEY = 'hud:control-overlay-collapsed';

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
    return true;
  }
  if (methods.includes(active)) {
    return true;
  }
  if (active === 'gamepad' && methods.includes('keyboard')) {
    return true;
  }
  return false;
};

const applyAnnouncement = (
  toggle: HTMLButtonElement,
  strings: ResponsiveControlOverlayStrings,
  collapsed: boolean
) => {
  toggle.dataset.hudAnnounce = collapsed
    ? strings.expandAnnouncement
    : strings.collapseAnnouncement;
};

const applyToggleLabel = (
  toggle: HTMLButtonElement,
  strings: ResponsiveControlOverlayStrings,
  collapsed: boolean
) => {
  toggle.textContent = collapsed ? strings.expandLabel : strings.collapseLabel;
  toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  applyAnnouncement(toggle, strings, collapsed);
};

const applyContainerState = (
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

const applyCollapsedState = (
  container: HTMLElement,
  items: ReadonlyArray<HTMLElement>,
  collapsedHiddenStates: WeakMap<HTMLElement, boolean>,
  layout: HudLayout,
  collapsed: boolean
) => {
  const activeMethod = getActiveMethod(container);
  const shouldCollapse = layout === 'mobile' && collapsed;

  const restoreCollapsedState = (item: HTMLElement) => {
    delete (item.dataset as Record<string, string | undefined>)[
      MOBILE_COLLAPSED_KEY
    ];
    const previousHidden = collapsedHiddenStates.get(item);
    if (previousHidden !== undefined) {
      item.hidden = previousHidden;
      collapsedHiddenStates.delete(item);
    }
  };

  for (const item of items) {
    const methods = parseInputMethods(item.dataset.inputMethods);
    if (!shouldCollapse) {
      restoreCollapsedState(item);
      continue;
    }

    const controlId = item.dataset.controlItem ?? '';
    if (controlId === 'interact' || matchActiveMethod(methods, activeMethod)) {
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

const ensureControlListId = (list: HTMLElement): string => {
  if (list.id) {
    return list.id;
  }
  list.id = CONTROL_LIST_ID;
  return list.id;
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

export function createResponsiveControlOverlay(
  options: ResponsiveControlOverlayOptions
): ResponsiveControlOverlayHandle {
  const {
    container,
    strings,
    initialLayout = 'desktop',
    defaultCollapsed,
    windowTarget = typeof window !== 'undefined' ? window : undefined,
    storage: providedStorage,
  } = options;

  const list = options.list ?? container.querySelector(CONTROL_LIST_SELECTOR);
  const toggle =
    options.toggle ?? container.querySelector(CONTROL_TOGGLE_SELECTOR);

  if (
    !(list instanceof HTMLElement) ||
    !(toggle instanceof HTMLButtonElement)
  ) {
    return {
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
  const collapsedHiddenStates = new WeakMap<HTMLElement, boolean>();

  controlItems.forEach((item) => {
    initialHiddenStates.set(item, item.hidden);
  });

  const listId = ensureControlListId(list);
  toggle.setAttribute('aria-controls', listId);

  const storage = getStorage(windowTarget, providedStorage);
  const readStoredCollapsed = () => readPersistedCollapsed(storage);

  const resolveMobileCollapsed = () =>
    readStoredCollapsed() ?? defaultCollapsed ?? true;

  let layout: HudLayout = initialLayout;
  let collapsed = layout === 'mobile' ? resolveMobileCollapsed() : false;
  let currentStrings: ResponsiveControlOverlayStrings = { ...strings };
  let disposed = false;

  const update = () => {
    if (disposed) {
      return;
    }
    applyContainerState(container, layout, collapsed);
    applyCollapsedState(
      container,
      controlItems,
      collapsedHiddenStates,
      layout,
      collapsed
    );
    if (layout === 'mobile') {
      persistCollapsed(storage, collapsed);
    }
    if (layout === 'mobile') {
      toggle.hidden = false;
      applyToggleLabel(toggle, currentStrings, collapsed);
    } else {
      toggle.hidden = true;
      toggle.removeAttribute('aria-expanded');
      toggle.dataset.hudAnnounce = '';
    }
  };

  const setCollapsed = (next: boolean) => {
    const normalized = layout === 'mobile' ? next : false;
    if (collapsed === normalized) {
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
      applyCollapsedState(
        container,
        controlItems,
        collapsedHiddenStates,
        layout,
        collapsed
      );
    }
  });

  observer.observe(container, {
    attributes: true,
    attributeFilter: ['data-active-input'],
  });

  update();

  return {
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
      currentStrings = { ...nextStrings };
      if (layout === 'mobile') {
        applyToggleLabel(toggle, currentStrings, collapsed);
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
}
