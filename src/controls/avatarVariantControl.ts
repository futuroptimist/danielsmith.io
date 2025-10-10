import type { PortfolioMannequinPalette } from '../avatar/mannequin';
import type { AvatarVariantId } from '../avatar/variants';

export interface AvatarVariantControlOption {
  id: AvatarVariantId;
  label: string;
  description: string;
  palette: PortfolioMannequinPalette;
}

export interface AvatarVariantControlOptions {
  container: HTMLElement;
  options: ReadonlyArray<AvatarVariantControlOption>;
  getActiveVariant: () => AvatarVariantId;
  setActiveVariant: (variant: AvatarVariantId) => void | Promise<void>;
  title?: string;
  description?: string;
}

export interface AvatarVariantControlHandle {
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

export function createAvatarVariantControl({
  container,
  options,
  getActiveVariant,
  setActiveVariant,
  title = 'Avatar style',
  description = 'Switch outfits for the mannequin explorer.',
}: AvatarVariantControlOptions): AvatarVariantControlHandle {
  if (!options.length) {
    throw new Error('Avatar variant control requires at least one option.');
  }

  const controlId = `avatar-variants-${nextControlId++}`;

  const wrapper = document.createElement('section');
  wrapper.className = 'avatar-variants';
  wrapper.dataset.pending = 'false';

  const heading = document.createElement('h2');
  heading.className = 'avatar-variants__title';
  heading.id = `${controlId}-title`;
  heading.textContent = title;

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'avatar-variants__description';
  descriptionParagraph.textContent = description;

  const optionsList = document.createElement('div');
  optionsList.className = 'avatar-variants__options';
  optionsList.setAttribute('role', 'radiogroup');
  optionsList.setAttribute('aria-labelledby', heading.id);

  const liveRegion = document.createElement('div');
  liveRegion.className = 'avatar-variants__status';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  wrapper.append(heading, descriptionParagraph, optionsList, liveRegion);
  container.appendChild(wrapper);

  const inputs: HTMLInputElement[] = [];
  const optionLabels = new Map<string, HTMLElement>();

  let pending = false;

  const updateLiveRegion = (text: string) => {
    liveRegion.textContent = text;
  };

  const updateSelection = () => {
    const active = getActiveVariant();
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
    updateLiveRegion(`${activeLabel} avatar selected.`);
  };

  const setPending = (value: boolean) => {
    pending = value;
    wrapper.dataset.pending = value ? 'true' : 'false';
    inputs.forEach((input) => {
      input.disabled = value;
    });
  };

  const handleError = (error: unknown) => {
    console.warn('Failed to update avatar variant:', error);
    setPending(false);
    updateSelection();
  };

  const handleSelection = (variant: AvatarVariantId) => {
    if (pending) {
      updateSelection();
      return;
    }
    const current = getActiveVariant();
    if (current === variant) {
      updateSelection();
      return;
    }
    setPending(true);
    try {
      const result = setActiveVariant(variant);
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
    label.className = 'avatar-variants__option';
    label.dataset.state = 'idle';

    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'avatar-variants__radio';
    input.name = controlId;
    input.value = option.id;
    input.setAttribute('role', 'radio');
    input.setAttribute('aria-label', option.label);
    if (index === 0) {
      input.setAttribute('tabindex', '0');
    }

    const details = document.createElement('div');
    details.className = 'avatar-variants__option-details';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'avatar-variants__option-title';
    titleSpan.textContent = option.label;

    const descriptionSpan = document.createElement('span');
    descriptionSpan.className = 'avatar-variants__option-description';
    descriptionSpan.textContent = option.description;

    const swatches = document.createElement('div');
    swatches.className = 'avatar-variants__swatches';

    const createSwatch = (color: string, role: string) => {
      const swatch = document.createElement('span');
      swatch.className = `avatar-variants__swatch avatar-variants__swatch--${role}`;
      swatch.style.setProperty('--avatar-variant-color', color);
      swatch.title = `${option.label} ${role}`;
      return swatch;
    };

    swatches.append(
      createSwatch(option.palette.base, 'base'),
      createSwatch(option.palette.accent, 'accent'),
      createSwatch(option.palette.trim, 'trim')
    );

    details.append(titleSpan, descriptionSpan, swatches);

    input.addEventListener('change', () => {
      if (input.checked) {
        handleSelection(option.id);
      }
    });

    label.append(input, details);
    optionsList.appendChild(label);

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
