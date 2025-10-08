export type InputMethod = 'keyboard' | 'pointer' | 'touch';

export interface MovementLegendOptions {
  container: HTMLElement;
  windowTarget?: Window;
  initialMethod?: InputMethod;
  interactLabels?: Partial<Record<InputMethod, string>>;
  defaultInteractDescription?: string;
}

export interface MovementLegendHandle {
  getActiveMethod(): InputMethod;
  setActiveMethod(method: InputMethod): void;
  setInteractPrompt(description: string | null): void;
  setKeyboardInteractLabel(label: string): void;
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

const DEFAULT_INTERACT_LABELS: Record<InputMethod, string> = {
  keyboard: 'F',
  pointer: 'Click',
  touch: 'Tap',
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
        method === 'keyboard' || method === 'pointer' || method === 'touch'
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

function collectContext(container: HTMLElement): MovementLegendContext {
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
    : 'Interact';

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
    defaultInteractDescription = 'Interact',
  } = options;

  const context = collectContext(container);

  const labels: Record<InputMethod, string> = {
    ...DEFAULT_INTERACT_LABELS,
    ...interactLabels,
  } as Record<InputMethod, string>;

  const defaultKeyboardLabel = labels.keyboard;

  if (context.interactDescription) {
    context.interactDescription.textContent =
      context.defaultInteractDescription || defaultInteractDescription;
  }

  const activeLabelsDescription = context.interactDescription
    ? context.interactDescription.textContent
    : defaultInteractDescription;
  context.defaultInteractDescription = activeLabelsDescription || 'Interact';

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
  };

  const ensureInteractLabel = () => {
    updateInteractLabel(context, labels, activeMethod);
  };

  const setKeyboardInteractLabel = (label: string) => {
    const normalized =
      label && label.trim() ? label.trim() : defaultKeyboardLabel;
    if (labels.keyboard === normalized) {
      return;
    }
    labels.keyboard = normalized;
    ensureInteractLabel();
  };

  const setActiveMethod = (method: InputMethod) => {
    applyMethod(method);
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
    setKeyboardInteractLabel,
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
      labels.keyboard = defaultKeyboardLabel;
      ensureInteractLabel();
    },
  };
}
