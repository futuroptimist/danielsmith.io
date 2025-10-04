import type {
  AccessibilityPreferenceId,
  AccessibilityPreferencesState,
} from '../accessibility/preferences';

export interface AccessibilityHudToggleDefinition {
  id: AccessibilityPreferenceId;
  label: string;
  description: string;
  getState: () => boolean;
  setState: (value: boolean) => void | Promise<void>;
}

export interface AccessibilityHudControlOptions {
  container: HTMLElement;
  toggles: ReadonlyArray<AccessibilityHudToggleDefinition>;
  title?: string;
  description?: string;
}

export interface AccessibilityHudControlHandle {
  readonly element: HTMLElement;
  refresh(): void;
  dispose(): void;
}

function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

interface ToggleEntry {
  checkbox: HTMLInputElement;
  getState: () => boolean;
  setState: (value: boolean) => void | Promise<void>;
  pending: boolean;
  label: HTMLElement;
}

const LIVE_REGION_LABEL: Record<AccessibilityPreferenceId, string> = {
  reduceMotion: 'Reduce motion',
  highContrast: 'High contrast',
};

export function createAccessibilityHudControl({
  container,
  toggles,
  title = 'Accessibility presets',
  description = 'Adjust comfort and contrast options for the HUD.',
}: AccessibilityHudControlOptions): AccessibilityHudControlHandle {
  if (!toggles.length) {
    throw new Error('Accessibility HUD control requires at least one toggle.');
  }

  const root = document.createElement('section');
  root.className = 'accessibility-presets';
  root.dataset.pending = 'false';

  const heading = document.createElement('h2');
  heading.className = 'accessibility-presets__title';
  heading.textContent = title;

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'accessibility-presets__description';
  descriptionParagraph.textContent = description;

  const list = document.createElement('div');
  list.className = 'accessibility-presets__toggles';

  const liveRegion = document.createElement('div');
  liveRegion.className = 'accessibility-presets__status';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  root.append(heading, descriptionParagraph, list, liveRegion);
  container.appendChild(root);

  const entries = new Map<AccessibilityPreferenceId, ToggleEntry>();
  let pendingCount = 0;

  const setPending = (id: AccessibilityPreferenceId, pending: boolean) => {
    const entry = entries.get(id);
    if (!entry) {
      return;
    }
    if (entry.pending === pending) {
      return;
    }
    pendingCount += pending ? 1 : -1;
    entry.pending = pending;
    entry.checkbox.disabled = pending;
    entry.label.dataset.state = pending ? 'pending' : 'idle';
    root.dataset.pending = pendingCount > 0 ? 'true' : 'false';
  };

  const updateLiveRegion = (
    id: AccessibilityPreferenceId,
    value: boolean
  ) => {
    liveRegion.textContent = `${LIVE_REGION_LABEL[id]} ${value ? 'enabled' : 'disabled'}.`;
  };

  const updateEntry = (id: AccessibilityPreferenceId) => {
    const entry = entries.get(id);
    if (!entry) {
      return;
    }
    const checked = Boolean(entry.getState());
    entry.checkbox.checked = checked;
    entry.checkbox.setAttribute('aria-checked', checked ? 'true' : 'false');
    entry.label.dataset.state = checked ? 'active' : 'idle';
  };

  const handleError = (id: AccessibilityPreferenceId, error: unknown) => {
    console.warn('Failed to update accessibility toggle:', error);
    setPending(id, false);
    updateEntry(id);
  };

  toggles.forEach((toggle) => {
    const label = document.createElement('label');
    label.className = 'accessibility-presets__toggle';
    label.dataset.state = 'idle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'accessibility-presets__checkbox';
    checkbox.setAttribute('role', 'switch');
    checkbox.setAttribute('aria-label', toggle.label);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'accessibility-presets__toggle-title';
    titleSpan.textContent = toggle.label;

    const descriptionSpan = document.createElement('span');
    descriptionSpan.className = 'accessibility-presets__toggle-description';
    descriptionSpan.textContent = toggle.description;

    const entry: ToggleEntry = {
      checkbox,
      getState: toggle.getState,
      setState: toggle.setState,
      pending: false,
      label,
    };

    const commitState = (value: boolean) => {
      setPending(toggle.id, true);
      try {
        const result = entry.setState(value);
        if (isPromiseLike(result)) {
          result
            .then(() => {
              setPending(toggle.id, false);
              updateEntry(toggle.id);
              updateLiveRegion(toggle.id, value);
            })
            .catch((error) => {
              handleError(toggle.id, error);
            });
        } else {
          setPending(toggle.id, false);
          updateEntry(toggle.id);
          updateLiveRegion(toggle.id, value);
        }
      } catch (error) {
        handleError(toggle.id, error);
      }
    };

    checkbox.addEventListener('change', () => {
      commitState(checkbox.checked);
    });

    label.append(checkbox, titleSpan, descriptionSpan);
    list.appendChild(label);
    entries.set(toggle.id, entry);
    updateEntry(toggle.id);
  });

  return {
    element: root,
    refresh() {
      entries.forEach((_entry, id) => {
        updateEntry(id);
      });
    },
    dispose() {
      entries.forEach((entry) => {
        const clone = entry.checkbox.cloneNode(true) as HTMLInputElement;
        entry.checkbox.replaceWith(clone);
      });
      entries.clear();
      pendingCount = 0;
      root.dataset.pending = 'false';
      if (root.parentElement) {
        root.remove();
      }
    },
  };
}

export function applyAccessibilityDataset(
  element: HTMLElement,
  state: AccessibilityPreferencesState
) {
  element.dataset.accessibilityReduceMotion = state.reduceMotion ? 'true' : 'false';
  element.dataset.accessibilityContrast = state.highContrast ? 'high' : 'default';
}
