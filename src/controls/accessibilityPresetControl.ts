import type { AccessibilityPresetId } from '../accessibility/presetManager';

export interface AccessibilityPresetOption {
  id: AccessibilityPresetId;
  label: string;
  description: string;
}

export interface AccessibilityPresetControlOptions {
  container: HTMLElement;
  options: readonly AccessibilityPresetOption[];
  getActivePreset: () => AccessibilityPresetId;
  setActivePreset: (preset: AccessibilityPresetId) => void | Promise<void>;
  title?: string;
  description?: string;
}

export interface AccessibilityPresetControlHandle {
  readonly element: HTMLElement;
  refresh(): void;
  dispose(): void;
}

let nextControlId = 0;

function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

export function createAccessibilityPresetControl({
  container,
  options,
  getActivePreset,
  setActivePreset,
  title = 'Accessibility presets',
  description = 'Tune motion assists and HUD contrast.',
}: AccessibilityPresetControlOptions): AccessibilityPresetControlHandle {
  if (!options.length) {
    throw new Error(
      'Accessibility preset control requires at least one option.'
    );
  }

  const controlId = `accessibility-presets-${nextControlId++}`;

  const wrapper = document.createElement('section');
  wrapper.className = 'accessibility-presets';
  wrapper.dataset.pending = 'false';

  const heading = document.createElement('h2');
  heading.className = 'accessibility-presets__title';
  heading.id = `${controlId}-title`;
  heading.textContent = title;

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'accessibility-presets__description';
  descriptionParagraph.textContent = description;

  const list = document.createElement('div');
  list.className = 'accessibility-presets__options';
  list.setAttribute('role', 'radiogroup');
  list.setAttribute('aria-labelledby', heading.id);

  const liveRegion = document.createElement('div');
  liveRegion.className = 'accessibility-presets__status';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  wrapper.append(heading, descriptionParagraph, list, liveRegion);
  container.appendChild(wrapper);

  const inputs: HTMLInputElement[] = [];
  const optionLabels = new Map<string, HTMLElement>();

  let pending = false;

  const updateLiveRegion = (text: string) => {
    liveRegion.textContent = text;
  };

  const updateSelection = () => {
    const active = getActivePreset();
    inputs.forEach((input) => {
      const isActive = input.value === active;
      input.checked = isActive;
      input.setAttribute('aria-checked', isActive ? 'true' : 'false');
      const label = optionLabels.get(input.value);
      if (label) {
        label.dataset.state = isActive ? 'active' : 'idle';
      }
    });
    const activeLabel =
      options.find((option) => option.id === active)?.label ?? active;
    updateLiveRegion(`${activeLabel} preset selected.`);
  };

  const setPending = (value: boolean) => {
    pending = value;
    wrapper.dataset.pending = value ? 'true' : 'false';
    inputs.forEach((input) => {
      input.disabled = value;
    });
  };

  const handleError = (error: unknown) => {
    console.warn('Failed to update accessibility preset:', error);
    setPending(false);
    updateSelection();
  };

  const handleSelection = (preset: AccessibilityPresetId) => {
    if (pending) {
      updateSelection();
      return;
    }
    const current = getActivePreset();
    if (current === preset) {
      updateSelection();
      return;
    }
    setPending(true);
    try {
      const result = setActivePreset(preset);
      if (isPromiseLike(result)) {
        result
          .then(() => {
            setPending(false);
            updateSelection();
          })
          .catch(handleError);
      } else {
        setPending(false);
        updateSelection();
      }
    } catch (error) {
      handleError(error);
    }
  };

  options.forEach((option, index) => {
    const label = document.createElement('label');
    label.className = 'accessibility-presets__option';
    label.dataset.state = 'idle';

    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'accessibility-presets__radio';
    input.name = controlId;
    input.value = option.id;
    input.setAttribute('role', 'radio');
    input.setAttribute('aria-label', option.label);
    if (index === 0) {
      input.setAttribute('tabindex', '0');
    }

    const titleSpan = document.createElement('span');
    titleSpan.className = 'accessibility-presets__option-title';
    titleSpan.textContent = option.label;

    const descriptionSpan = document.createElement('span');
    descriptionSpan.className = 'accessibility-presets__option-description';
    descriptionSpan.textContent = option.description;

    input.addEventListener('change', () => {
      if (input.checked) {
        handleSelection(option.id);
      }
    });

    label.append(input, titleSpan, descriptionSpan);
    list.appendChild(label);

    inputs.push(input);
    optionLabels.set(option.id, label);
  });

  updateSelection();

  return {
    element: wrapper,
    refresh() {
      updateSelection();
    },
    dispose() {
      inputs.forEach((input) => {
        const clone = input.cloneNode(true) as HTMLInputElement;
        input.replaceWith(clone);
      });
      if (wrapper.parentElement) {
        wrapper.remove();
      }
    },
  };
}
