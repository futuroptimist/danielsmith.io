import type { LocaleInput } from '../../assets/i18n';
import {
  getLocaleDirection,
  getLocaleScript,
  getMovementLegendStrings,
  resolveLocale,
} from '../../assets/i18n';

export type InputMethod = 'keyboard' | 'pointer' | 'touch' | 'gamepad';

export interface MovementLegendOptions {
  container: HTMLElement;
  windowTarget?: Window;
  initialMethod?: InputMethod;
  interactLabels?: Partial<Record<InputMethod, string>>;
  defaultInteractDescription?: string;
  locale?: LocaleInput;
}

export interface MovementLegendHandle {
  getActiveMethod(): InputMethod;
  setActiveMethod(method: InputMethod): void;
  setInteractPrompt(description: string | null): void;
  setInteractLabel(method: InputMethod, label: string): void;
  setKeyboardInteractLabel(label: string): void;
  setLocale(locale: LocaleInput): void;
  dispose(): void;
}

interface LegendItem {
  element: HTMLElement;
  methods: InputMethod[];
}

interface MovementLegendContext {
  items: LegendItem[];
  interactItem: HTMLElement | null;
  interactLabel: HTMLElement | null;
  interactDescription: HTMLElement | null;
  defaultInteractDescription: string;
}

const composeInteractAnnouncement = (
  label: string,
  description: string
): string | null => {
  const trimmedLabel = label.trim();
  const trimmedDescription = description.trim();
  if (trimmedLabel && trimmedDescription) {
    return `${trimmedLabel} — ${trimmedDescription}`;
  }
  if (trimmedLabel) {
    return trimmedLabel;
  }
  if (trimmedDescription) {
    return trimmedDescription;
  }
  return null;
};

const applyHudAnnouncement = (
  context: MovementLegendContext,
  message: string | null
) => {
  if (!context.interactItem) {
    return;
  }
  const trimmed = message?.trim();
  if (trimmed) {
    context.interactItem.dataset.hudAnnounce = trimmed;
  } else {
    delete context.interactItem.dataset.hudAnnounce;
  }
};

const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'NumLock',
  'ScrollLock',
]);

function detectInitialMethod(options: {
  explicit?: InputMethod;
  windowTarget?: Window;
}): InputMethod {
  if (options.explicit) {
    return options.explicit;
  }

  const win = options.windowTarget;
  const nav = win?.navigator as
    | (Navigator & { maxTouchPoints?: number })
    | undefined;

  if (typeof nav?.maxTouchPoints === 'number' && nav.maxTouchPoints > 0) {
    return 'touch';
  }

  if (typeof win?.matchMedia === 'function') {
    const query = win.matchMedia('(hover: none) and (pointer: coarse)');
    if (query.matches) {
      return 'touch';
    }
  }

  return 'keyboard';
}

function parseInputMethods(value: string | null | undefined): InputMethod[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[\s,]+/)
    .map((method) => method.trim())
    .filter(
      (method): method is InputMethod =>
        method === 'keyboard' ||
        method === 'pointer' ||
        method === 'touch' ||
        method === 'gamepad'
    );
}

function resolvePointerMethod(event: PointerEvent | MouseEvent): InputMethod {
  const pointerType = 'pointerType' in event ? event.pointerType : undefined;
  if (typeof pointerType === 'string') {
    const normalized = pointerType.toLowerCase();
    if (normalized === 'touch') {
      return 'touch';
    }
    if (normalized === 'mouse' || normalized === 'pen') {
      return 'pointer';
    }
  }
  return 'pointer';
}

const GAMEPAD_ACTIVITY_THRESHOLD = 0.3;

interface GamepadButtonLike {
  pressed?: boolean;
  value?: number;
}

interface GamepadLike {
  connected?: boolean;
  buttons?: ReadonlyArray<GamepadButtonLike | null | undefined>;
  axes?: ReadonlyArray<number | null | undefined>;
}

type GamepadReader = () => ReadonlyArray<GamepadLike | null>;

const createGamepadReader = (windowTarget?: Window): GamepadReader | null => {
  if (!windowTarget) {
    return null;
  }
  const navigatorCandidate = windowTarget.navigator as
    | (Navigator & { getGamepads?: () => (GamepadLike | null)[] | null })
    | undefined;
  if (
    !navigatorCandidate ||
    typeof navigatorCandidate.getGamepads !== 'function'
  ) {
    return null;
  }
  return () => {
    const pads = navigatorCandidate.getGamepads?.();
    if (!pads) {
      return [];
    }
    return Array.from(pads);
  };
};

const hasGamepadActivity = (
  gamepads: ReadonlyArray<GamepadLike | null>
): boolean => {
  for (const pad of gamepads) {
    if (!pad || pad.connected === false) {
      continue;
    }
    if (
      pad.buttons &&
      pad.buttons.some((button) => {
        if (!button) {
          return false;
        }
        if (button.pressed) {
          return true;
        }
        const value = button.value ?? 0;
        return Math.abs(value) > GAMEPAD_ACTIVITY_THRESHOLD;
      })
    ) {
      return true;
    }
    if (
      pad.axes &&
      pad.axes.some((axis) => {
        if (axis === null || axis === undefined) {
          return false;
        }
        return Math.abs(axis) > GAMEPAD_ACTIVITY_THRESHOLD;
      })
    ) {
      return true;
    }
  }
  return false;
};

const createGamepadMonitor = (
  windowTarget: Window | undefined,
  onActivity: () => void
): (() => void) | null => {
  if (!windowTarget) {
    return null;
  }
  const readGamepads = createGamepadReader(windowTarget);
  if (!readGamepads) {
    return null;
  }
  const request = windowTarget.requestAnimationFrame?.bind(windowTarget);
  if (typeof request !== 'function') {
    return null;
  }
  const cancel = windowTarget.cancelAnimationFrame?.bind(windowTarget);
  let disposed = false;
  let rafId: number | null = null;

  const tick = () => {
    if (disposed) {
      return;
    }
    const pads = readGamepads();
    if (hasGamepadActivity(pads)) {
      onActivity();
    }
    rafId = request(tick);
  };

  rafId = request(tick);

  return () => {
    disposed = true;
    if (rafId !== null && typeof cancel === 'function') {
      cancel(rafId);
    }
  };
};

function collectContext(
  container: HTMLElement,
  fallbackDescription: string
): MovementLegendContext {
  const items = Array.from(
    container.querySelectorAll<HTMLElement>('[data-input-methods]')
  ).map((element) => ({
    element,
    methods: parseInputMethods(element.dataset.inputMethods),
  }));

  const interactItem = container.querySelector<HTMLElement>(
    '[data-role="interact"]'
  );
  const interactLabel =
    interactItem?.querySelector<HTMLElement>('[data-role="interact-label"]') ??
    null;
  const interactDescription =
    interactItem?.querySelector<HTMLElement>(
      '[data-role="interact-description"]'
    ) ?? null;

  const defaultInteractDescription = interactDescription?.textContent?.trim()
    ? interactDescription.textContent.trim()
    : fallbackDescription;

  return {
    items,
    interactItem: interactItem ?? null,
    interactLabel,
    interactDescription,
    defaultInteractDescription,
  };
}

function updateActiveState(
  context: MovementLegendContext,
  method: InputMethod
) {
  for (const item of context.items) {
    if (item.methods.includes(method)) {
      item.element.dataset.state = 'active';
    } else {
      delete item.element.dataset.state;
    }
  }
}

function updateInteractLabel(
  context: MovementLegendContext,
  labels: Record<InputMethod, string>,
  method: InputMethod
) {
  if (!context.interactLabel) {
    return;
  }
  const nextLabel = labels[method] ?? labels.keyboard;
  context.interactLabel.textContent = nextLabel;
}

export function createMovementLegend(
  options: MovementLegendOptions
): MovementLegendHandle {
  const {
    container,
    windowTarget = typeof window !== 'undefined' ? window : undefined,
    initialMethod,
    interactLabels,
    defaultInteractDescription,
    locale,
  } = options;

  const navigatorLanguage =
    windowTarget?.navigator && 'language' in windowTarget.navigator
      ? String((windowTarget.navigator as Navigator).language)
      : undefined;
  const localeInput = locale ?? navigatorLanguage;
  const resolvedLocale = resolveLocale(localeInput);
  const direction = getLocaleDirection(localeInput);
  const script = getLocaleScript(localeInput);
  container.dir = direction;
  container.dataset.localeDirection = direction;
  container.dataset.localeScript = script;
  const legendStrings = getMovementLegendStrings(resolvedLocale);
  const fallbackInteractDescription =
    defaultInteractDescription ?? legendStrings.defaultDescription;

  const context = collectContext(container, fallbackInteractDescription);

  let defaultLabels: Record<InputMethod, string> = {
    ...legendStrings.labels,
    ...interactLabels,
  } as Record<InputMethod, string>;

  const labels: Record<InputMethod, string> = { ...defaultLabels };

  const defaultKeyboardLabel = labels.keyboard;

  const getInteractDescription = () => {
    const text = context.interactDescription?.textContent?.trim();
    if (text && text.length > 0) {
      return text;
    }
    return context.defaultInteractDescription || fallbackInteractDescription;
  };

  const refreshInteractAnnouncement = () => {
    if (!context.interactItem) {
      return;
    }
    if (context.interactItem.hidden) {
      applyHudAnnouncement(context, null);
      return;
    }
    const description = getInteractDescription();
    const label = labels[activeMethod] ?? labels.keyboard ?? '';
    const message = composeInteractAnnouncement(label, description);
    applyHudAnnouncement(context, message);
  };

  if (context.interactDescription) {
    context.interactDescription.textContent =
      context.defaultInteractDescription || fallbackInteractDescription;
  }

  const activeLabelsDescription = context.interactDescription
    ? context.interactDescription.textContent
    : fallbackInteractDescription;
  context.defaultInteractDescription =
    activeLabelsDescription || fallbackInteractDescription;

  let activeMethod = detectInitialMethod({
    explicit: initialMethod,
    windowTarget,
  });

  const applyMethod = (method: InputMethod) => {
    if (activeMethod === method) {
      return;
    }
    activeMethod = method;
    if (container.dataset.activeInput !== method) {
      container.dataset.activeInput = method;
    }
    updateActiveState(context, method);
    updateInteractLabel(context, labels, method);
    refreshInteractAnnouncement();
  };

  const ensureInteractLabel = () => {
    updateInteractLabel(context, labels, activeMethod);
    refreshInteractAnnouncement();
  };

  const setInteractLabel = (method: InputMethod, label: string) => {
    const fallback = defaultLabels[method] ?? defaultLabels.keyboard;
    const normalized = label && label.trim() ? label.trim() : fallback;
    if (labels[method] === normalized) {
      return;
    }
    labels[method] = normalized;
    ensureInteractLabel();
  };

  const setKeyboardInteractLabel = (label: string) => {
    setInteractLabel('keyboard', label);
  };

  const setActiveMethod = (method: InputMethod) => {
    applyMethod(method);
  };

  const setLocale = (nextLocale: LocaleInput) => {
    const previousDefaults: Record<InputMethod, string> = {
      ...defaultLabels,
    };
    const nextResolved = resolveLocale(nextLocale ?? resolvedLocale);
    const nextDirection = getLocaleDirection(nextLocale);
    const nextScript = getLocaleScript(nextLocale);
    container.dir = nextDirection;
    container.dataset.localeDirection = nextDirection;
    container.dataset.localeScript = nextScript;

    const nextLegendStrings = getMovementLegendStrings(nextResolved);
    const nextFallbackDescription =
      defaultInteractDescription ?? nextLegendStrings.defaultDescription;

    defaultLabels = {
      ...nextLegendStrings.labels,
      ...interactLabels,
    } as Record<InputMethod, string>;

    const descriptionNode = context.interactDescription;
    const previousDefaultDescription = context.defaultInteractDescription;
    if (descriptionNode) {
      const currentText = descriptionNode.textContent?.trim() ?? '';
      if (!currentText || currentText === previousDefaultDescription) {
        descriptionNode.textContent = nextFallbackDescription;
      }
    }

    const normalizedDescription =
      context.interactDescription?.textContent?.trim() ||
      nextFallbackDescription;
    context.defaultInteractDescription = normalizedDescription;

    (Object.keys(defaultLabels) as InputMethod[]).forEach((method) => {
      if (labels[method] === previousDefaults[method]) {
        labels[method] = defaultLabels[method];
      }
    });

    ensureInteractLabel();
  };

  const setInteractPrompt = (description: string | null) => {
    if (!context.interactItem || !context.interactDescription) {
      return;
    }
    if (description) {
      context.interactItem.hidden = false;
      context.interactDescription.textContent = description;
    } else {
      context.interactItem.hidden = true;
      context.interactDescription.textContent =
        context.defaultInteractDescription;
    }
    ensureInteractLabel();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (MODIFIER_KEYS.has(event.key)) {
      return;
    }
    applyMethod('keyboard');
  };

  const handlePointerEvent = (event: PointerEvent | MouseEvent) => {
    const method = resolvePointerMethod(event);
    applyMethod(method);
  };

  const handleTouchStart = () => {
    applyMethod('touch');
  };

  const listeners: Array<() => void> = [];

  if (windowTarget) {
    const addListener = <K extends keyof WindowEventMap>(
      type: K,
      listener: (event: WindowEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions
    ) => {
      windowTarget.addEventListener(type, listener as EventListener, options);
      listeners.push(() =>
        windowTarget.removeEventListener(
          type,
          listener as EventListener,
          options
        )
      );
    };

    addListener('keydown', handleKeydown);

    const hasPointerDownSupport = 'onpointerdown' in windowTarget;

    addListener('pointerdown', handlePointerEvent as EventListener);

    if (!hasPointerDownSupport) {
      addListener('mousedown', handlePointerEvent as EventListener);
    }

    addListener('touchstart', handleTouchStart, { passive: true });

    const gamepadCleanup = createGamepadMonitor(windowTarget, () => {
      applyMethod('gamepad');
    });
    if (gamepadCleanup) {
      listeners.push(gamepadCleanup);
    }

    addListener('gamepadconnected', () => {
      applyMethod('gamepad');
    });
  }

  // Apply the initial method after listeners to ensure the DOM is in sync.
  container.dataset.activeInput = activeMethod;
  updateActiveState(context, activeMethod);
  ensureInteractLabel();

  return {
    getActiveMethod() {
      return activeMethod;
    },
    setActiveMethod,
    setInteractPrompt,
    setInteractLabel,
    setKeyboardInteractLabel,
    setLocale,
    dispose() {
      while (listeners.length > 0) {
        const remove = listeners.pop();
        remove?.();
      }
      context.items.forEach((item) => {
        delete item.element.dataset.state;
      });
      delete container.dataset.activeInput;
      if (context.interactItem) {
        context.interactItem.hidden = true;
      }
      if (context.interactDescription) {
        context.interactDescription.textContent =
          context.defaultInteractDescription;
      }
      applyHudAnnouncement(context, null);
      (Object.keys(labels) as InputMethod[]).forEach((method) => {
        labels[method] = defaultLabels[method];
      });
      labels.keyboard = defaultKeyboardLabel;
      if (context.interactLabel) {
        context.interactLabel.textContent = defaultKeyboardLabel;
      }
    },
  };
}
