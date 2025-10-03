import type { GraphicsQualityLevel } from '../graphics/qualityManager';

export interface GraphicsQualityControlPreset {
  id: GraphicsQualityLevel;
  label: string;
  description: string;
}

export interface GraphicsQualityControlOptions {
  container: HTMLElement;
  presets: ReadonlyArray<GraphicsQualityControlPreset>;
  getActiveLevel: () => GraphicsQualityLevel;
  setActiveLevel: (
    level: GraphicsQualityLevel
  ) => void | Promise<void>;
  title?: string;
  description?: string;
}

export interface GraphicsQualityControlHandle {
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

export function createGraphicsQualityControl({
  container,
  presets,
  getActiveLevel,
  setActiveLevel,
  title = 'Graphics quality',
  description = 'Pick a preset that matches your device performance.',
}: GraphicsQualityControlOptions): GraphicsQualityControlHandle {
  if (!presets.length) {
    throw new Error('Graphics quality control requires at least one preset.');
  }

  const controlId = `graphics-quality-${nextControlId++}`;

  const wrapper = document.createElement('section');
  wrapper.className = 'graphics-quality';
  wrapper.dataset.pending = 'false';

  const heading = document.createElement('h2');
  heading.className = 'graphics-quality__title';
  heading.textContent = title;

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'graphics-quality__description';
  descriptionParagraph.textContent = description;

  const optionList = document.createElement('div');
  optionList.className = 'graphics-quality__options';
  optionList.setAttribute('role', 'radiogroup');
  optionList.setAttribute('aria-labelledby', `${controlId}-title`);

  heading.id = `${controlId}-title`;

  const liveRegion = document.createElement('div');
  liveRegion.className = 'graphics-quality__status';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  wrapper.append(heading, descriptionParagraph, optionList, liveRegion);
  container.appendChild(wrapper);

  const inputs: HTMLInputElement[] = [];
  const labels = new Map<string, HTMLElement>();

  let pending = false;

  const updateLiveRegion = (text: string) => {
    liveRegion.textContent = text;
  };

  const updateSelection = () => {
    const active = getActiveLevel();
    inputs.forEach((input) => {
      const isActive = input.value === active;
      input.checked = isActive;
      input.setAttribute('aria-checked', isActive ? 'true' : 'false');
      const label = labels.get(input.value);
      if (label) {
        label.dataset.state = isActive ? 'active' : 'idle';
      }
    });
    updateLiveRegion(
      `${presets.find((preset) => preset.id === active)?.label ?? active} preset selected.`
    );
  };

  const setPending = (value: boolean) => {
    pending = value;
    wrapper.dataset.pending = value ? 'true' : 'false';
    inputs.forEach((input) => {
      input.disabled = value;
    });
  };

  const handleError = (error: unknown) => {
    console.warn('Failed to update graphics quality:', error);
    setPending(false);
    updateSelection();
  };

  const handleSelection = (level: GraphicsQualityLevel) => {
    if (pending) {
      updateSelection();
      return;
    }
    const current = getActiveLevel();
    if (current === level) {
      updateSelection();
      return;
    }
    setPending(true);
    try {
      const result = setActiveLevel(level);
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

  presets.forEach((preset, index) => {
    const optionLabel = document.createElement('label');
    optionLabel.className = 'graphics-quality__option';
    optionLabel.dataset.state = 'idle';

    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'graphics-quality__radio';
    input.name = controlId;
    input.value = preset.id;
    input.setAttribute('aria-label', preset.label);
    input.setAttribute('role', 'radio');
    if (index === 0) {
      input.setAttribute('tabindex', '0');
    }

    const titleSpan = document.createElement('span');
    titleSpan.className = 'graphics-quality__option-title';
    titleSpan.textContent = preset.label;

    const descriptionSpan = document.createElement('span');
    descriptionSpan.className = 'graphics-quality__option-description';
    descriptionSpan.textContent = preset.description;

    input.addEventListener('change', () => {
      if (input.checked) {
        handleSelection(preset.id);
      }
    });

    optionLabel.append(input, titleSpan, descriptionSpan);
    optionList.appendChild(optionLabel);

    inputs.push(input);
    labels.set(preset.id, optionLabel);
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
