import { formatKeyLabel, KeyBindings } from './keyBindings';
import type { KeyBindingAction } from './keyBindings';

export interface KeyBindingRemapActionDefinition {
  action: KeyBindingAction;
  label: string;
  description?: string;
}

export interface KeyBindingRemapControlStrings {
  heading: string;
  description: string;
  capturePrompt: string;
  captureInstruction: string;
  unboundLabel: string;
  resetLabel: string;
  resetAllLabel: string;
  slotLabels: {
    primary: string;
    secondary: string;
    fallbackTemplate: string;
  };
}

export interface KeyBindingRemapControlOptions {
  container: HTMLElement;
  keyBindings: KeyBindings;
  actions: readonly KeyBindingRemapActionDefinition[];
  strings: KeyBindingRemapControlStrings;
  maxBindingsPerAction?: number;
  windowTarget?: Window;
  onCommit?: () => void;
}

export interface KeyBindingRemapControlHandle {
  readonly element: HTMLDivElement;
  refresh(): void;
  dispose(): void;
}

type BindingButton = {
  button: HTMLButtonElement;
  slotIndex: number;
  value: HTMLSpanElement;
  slotLabel: HTMLSpanElement;
  cleanup: () => void;
};

type ActionRow = {
  action: KeyBindingAction;
  container: HTMLDivElement;
  bindingButtons: BindingButton[];
  resetButton: HTMLButtonElement;
  resetCleanup: () => void;
};

const DEFAULT_MAX_BINDINGS = 2;

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

const isModifierEvent = (event: KeyboardEvent) =>
  MODIFIER_KEYS.has(event.key) || event.key === 'Dead';

const buildSlotLabel = (
  index: number,
  strings: KeyBindingRemapControlStrings['slotLabels']
): string => {
  if (index === 0) {
    return strings.primary;
  }
  if (index === 1) {
    return strings.secondary;
  }
  return strings.fallbackTemplate.replace('{index}', String(index + 1));
};

const createBindingButton = (
  action: KeyBindingRemapActionDefinition,
  slotIndex: number,
  strings: KeyBindingRemapControlStrings,
  startCapture: (action: KeyBindingAction, slotIndex: number) => void
): BindingButton => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'key-remap__binding';
  button.dataset.slotIndex = String(slotIndex);
  button.dataset.action = action.action;

  const slotLabel = document.createElement('span');
  slotLabel.className = 'key-remap__binding-slot';
  slotLabel.textContent = buildSlotLabel(slotIndex, strings.slotLabels);

  const value = document.createElement('span');
  value.className = 'key-remap__binding-value';

  button.appendChild(slotLabel);
  button.appendChild(value);

  const handleClick = () => {
    startCapture(action.action, slotIndex);
  };

  button.addEventListener('click', handleClick);

  const cleanup = () => {
    button.removeEventListener('click', handleClick);
  };

  return { button, slotIndex, value, slotLabel, cleanup };
};

const formatBindingAnnouncement = (
  actionLabel: string,
  slotLabel: string,
  value: string,
  strings: KeyBindingRemapControlStrings
) => {
  const readable = value || strings.unboundLabel;
  return `${actionLabel} ${slotLabel}: ${readable}. Press Enter to reassign.`;
};

const createRow = (
  definition: KeyBindingRemapActionDefinition,
  strings: KeyBindingRemapControlStrings,
  maxBindings: number,
  startCapture: (action: KeyBindingAction, slotIndex: number) => void,
  handleReset: (action: KeyBindingAction) => void
): ActionRow => {
  const container = document.createElement('div');
  container.className = 'key-remap__action';

  const header = document.createElement('div');
  header.className = 'key-remap__action-header';

  const label = document.createElement('span');
  label.className = 'key-remap__label';
  label.textContent = definition.label;

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'key-remap__reset';
  resetButton.textContent = strings.resetLabel;
  const handleClick = () => {
    handleReset(definition.action);
  };
  resetButton.addEventListener('click', handleClick);

  header.appendChild(label);
  header.appendChild(resetButton);
  container.appendChild(header);

  if (definition.description) {
    const description = document.createElement('p');
    description.className = 'key-remap__description';
    description.textContent = definition.description;
    container.appendChild(description);
  }

  const bindingsContainer = document.createElement('div');
  bindingsContainer.className = 'key-remap__bindings';

  const bindingButtons: BindingButton[] = [];

  for (let i = 0; i < maxBindings; i += 1) {
    const bindingButton = createBindingButton(
      definition,
      i,
      strings,
      startCapture
    );
    bindingsContainer.appendChild(bindingButton.button);
    bindingButtons.push(bindingButton);
  }

  container.appendChild(bindingsContainer);

  return {
    action: definition.action,
    container,
    bindingButtons,
    resetButton,
    resetCleanup: () => {
      resetButton.removeEventListener('click', handleClick);
    },
  };
};

export function createKeyBindingRemapControl({
  container,
  keyBindings,
  actions,
  strings,
  maxBindingsPerAction = DEFAULT_MAX_BINDINGS,
  windowTarget = typeof window === 'undefined' ? undefined : window,
  onCommit,
}: KeyBindingRemapControlOptions): KeyBindingRemapControlHandle {
  const maxBindings = Math.max(1, Math.floor(maxBindingsPerAction));
  const root = document.createElement('div');
  root.className = 'key-remap';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', strings.heading);
  root.dataset.capturing = 'false';

  const heading = document.createElement('div');
  heading.className = 'key-remap__heading';

  const title = document.createElement('h3');
  title.textContent = strings.heading;
  heading.appendChild(title);

  const intro = document.createElement('p');
  intro.className = 'key-remap__intro';
  intro.textContent = strings.description;
  heading.appendChild(intro);

  root.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'key-remap__list';
  root.appendChild(list);

  const actionRows: ActionRow[] = [];
  const actionOrder = actions.map((item) => item.action);

  let activeCapture: {
    action: KeyBindingAction;
    slotIndex: number;
    button: BindingButton;
    handler: (event: KeyboardEvent) => void;
  } | null = null;

  const stopCapture = (shouldRefocus: boolean) => {
    if (!activeCapture) {
      return;
    }
    if (windowTarget) {
      windowTarget.removeEventListener('keydown', activeCapture.handler);
    }
    const { button } = activeCapture;
    button.button.disabled = false;
    button.button.dataset.state = 'idle';
    button.button.dataset.hudAnnounce = formatBindingAnnouncement(
      actions.find((item) => item.action === activeCapture?.action)?.label ||
        '',
      button.slotLabel.textContent,
      button.value.textContent || strings.unboundLabel,
      strings
    );
    button.button.setAttribute(
      'aria-label',
      button.button.dataset.hudAnnounce ?? ''
    );
    if (shouldRefocus) {
      button.button.focus();
    }
    root.dataset.capturing = 'false';
    activeCapture = null;
  };

  const applyBindings = (
    action: KeyBindingAction,
    slotIndex: number,
    key: string
  ) => {
    const current = keyBindings.getBindings(action).slice();
    const base = current.slice(0, maxBindings);
    while (base.length < maxBindings) {
      base.push('');
    }
    base[slotIndex] = key;
    const remainder = current.slice(maxBindings);
    const merged = [...base, ...remainder];
    const seen = new Set<string>();
    const normalized: string[] = [];
    merged.forEach((binding) => {
      const trimmed = typeof binding === 'string' ? binding : '';
      if (!trimmed) {
        return;
      }
      const normalizedKey = trimmed;
      if (seen.has(normalizedKey)) {
        return;
      }
      seen.add(normalizedKey);
      normalized.push(normalizedKey);
    });
    keyBindings.setBindings(action, normalized);
    onCommit?.();
  };

  const updateBindingButton = (
    row: ActionRow,
    binding: BindingButton,
    value: string
  ) => {
    const formatted = value ? formatKeyLabel(value) : strings.unboundLabel;
    binding.value.textContent = formatted;
    binding.button.dataset.state = 'idle';
    binding.button.dataset.keyValue = value || '';
    const actionDefinition = actions.find((item) => item.action === row.action);
    const announcement = formatBindingAnnouncement(
      actionDefinition?.label ?? '',
      binding.slotLabel.textContent,
      formatted,
      strings
    );
    binding.button.dataset.hudAnnounce = announcement;
    binding.button.setAttribute('aria-label', announcement);
  };

  const refreshRow = (row: ActionRow) => {
    const bindings = keyBindings.getBindings(row.action);
    for (let i = 0; i < row.bindingButtons.length; i += 1) {
      const button = row.bindingButtons[i];
      const value = bindings[i] ?? '';
      updateBindingButton(row, button, value);
    }
  };

  const startCapture = (action: KeyBindingAction, slotIndex: number) => {
    const row = actionRows.find((item) => item.action === action);
    if (!row) {
      return;
    }
    const button = row.bindingButtons[slotIndex];
    if (!button) {
      return;
    }
    if (activeCapture?.button === button) {
      return;
    }
    if (activeCapture) {
      stopCapture(false);
    }
    const handler = (event: KeyboardEvent) => {
      if (!activeCapture) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        stopCapture(true);
        return;
      }
      if (event.repeat) {
        return;
      }
      if (
        isModifierEvent(event) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      applyBindings(action, slotIndex, event.key);
      refreshRow(row);
      stopCapture(true);
    };

    activeCapture = {
      action,
      slotIndex,
      button,
      handler,
    };

    button.button.disabled = true;
    button.button.dataset.state = 'listening';
    button.value.textContent = strings.capturePrompt;
    button.button.dataset.hudAnnounce = strings.captureInstruction;
    button.button.setAttribute('aria-label', strings.captureInstruction);
    root.dataset.capturing = 'true';

    if (windowTarget) {
      windowTarget.addEventListener('keydown', handler);
    }
  };

  const handleReset = (action: KeyBindingAction) => {
    keyBindings.reset(action);
    onCommit?.();
    const row = actionRows.find((item) => item.action === action);
    if (row) {
      refreshRow(row);
    }
  };

  actions.forEach((definition) => {
    const row = createRow(
      definition,
      strings,
      maxBindings,
      startCapture,
      handleReset
    );
    list.appendChild(row.container);
    actionRows.push(row);
  });

  const resetAllButton = document.createElement('button');
  resetAllButton.type = 'button';
  resetAllButton.className = 'key-remap__reset-all';
  resetAllButton.textContent = strings.resetAllLabel;
  resetAllButton.addEventListener('click', () => {
    keyBindings.resetAll();
    onCommit?.();
    actionRows.forEach((row) => refreshRow(row));
  });
  root.appendChild(resetAllButton);

  container.appendChild(root);

  const refresh = () => {
    actionRows.forEach((row) => refreshRow(row));
    stopCapture(false);
  };

  refresh();

  const unsubscribe = keyBindings.subscribe((action, bindings) => {
    if (!actionOrder.includes(action)) {
      return;
    }
    const row = actionRows.find((item) => item.action === action);
    if (!row) {
      return;
    }
    bindings.forEach((binding, index) => {
      const button = row.bindingButtons[index];
      if (button) {
        updateBindingButton(row, button, binding);
      }
    });
    for (let i = bindings.length; i < row.bindingButtons.length; i += 1) {
      updateBindingButton(row, row.bindingButtons[i], '');
    }
  });

  return {
    element: root,
    refresh,
    dispose() {
      stopCapture(false);
      unsubscribe();
      actionRows.forEach((row) => {
        row.bindingButtons.forEach((binding) => {
          binding.cleanup();
        });
        row.resetCleanup();
      });
      if (root.parentElement) {
        root.remove();
      }
    },
  };
}
