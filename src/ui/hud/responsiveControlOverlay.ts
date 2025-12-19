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
}

const CONTROL_LIST_SELECTOR = '[data-role="control-list"]';
const CONTROL_ITEM_SELECTOR = '[data-control-item]';
const CONTROL_TOGGLE_SELECTOR = '[data-role="control-toggle"]';
const CONTROL_COLLAPSED_KEY = 'controlCollapsed';
const MOBILE_COLLAPSED_KEY = 'mobileCollapsed';
const CONTROL_LIST_ID = 'control-overlay-list';

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
  initialHiddenStates: WeakMap<HTMLElement, boolean>,
  layout: HudLayout,
  collapsed: boolean
) => {
  const activeMethod = getActiveMethod(container);
  const shouldCollapse = layout === 'mobile' && collapsed;

  for (const item of items) {
    const baseHidden = initialHiddenStates.get(item) ?? false;
    if (!shouldCollapse) {
      delete (item.dataset as Record<string, string | undefined>)[
        MOBILE_COLLAPSED_KEY
      ];
      item.hidden = baseHidden;
      continue;
    }
    const controlId = item.dataset.controlItem ?? '';
    if (controlId === 'interact') {
      delete (item.dataset as Record<string, string | undefined>)[
        MOBILE_COLLAPSED_KEY
      ];
      item.hidden = baseHidden;
      continue;
    }
    const methods = parseInputMethods(item.dataset.inputMethods);
    if (matchActiveMethod(methods, activeMethod)) {
      delete (item.dataset as Record<string, string | undefined>)[
        MOBILE_COLLAPSED_KEY
      ];
      item.hidden = baseHidden;
      continue;
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

export function createResponsiveControlOverlay(
  options: ResponsiveControlOverlayOptions
): ResponsiveControlOverlayHandle {
  const {
    container,
    strings,
    initialLayout = 'desktop',
    defaultCollapsed,
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
  controlItems.forEach((item) => {
    initialHiddenStates.set(item, item.hidden);
  });

  const listId = ensureControlListId(list);
  toggle.setAttribute('aria-controls', listId);

  let layout: HudLayout = initialLayout;
  let collapsed = defaultCollapsed ?? layout === 'mobile';
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
      initialHiddenStates,
      layout,
      collapsed
    );
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
        initialHiddenStates,
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
        collapsed = true;
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
