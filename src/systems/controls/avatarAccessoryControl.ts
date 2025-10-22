import type { AvatarAccessoryId } from '../../scene/avatar/accessories';
import type { AvatarAccessoryPresetId } from '../../scene/avatar/accessoryPresets';

export interface AvatarAccessoryControlOption {
  readonly id: AvatarAccessoryId;
  readonly label: string;
  readonly description: string;
}

export interface AvatarAccessoryControlPreset {
  readonly id: AvatarAccessoryPresetId;
  readonly label: string;
  readonly description: string;
  readonly unlocked: boolean;
  readonly applied: boolean;
}

export interface AvatarAccessoryControlOptions {
  readonly container: HTMLElement;
  readonly options: ReadonlyArray<AvatarAccessoryControlOption>;
  readonly isAccessoryEnabled: (id: AvatarAccessoryId) => boolean;
  readonly setAccessoryEnabled: (
    id: AvatarAccessoryId,
    enabled: boolean
  ) => void | Promise<void>;
  readonly title?: string;
  readonly description?: string;
  readonly presets?: {
    readonly getPresets: () => ReadonlyArray<AvatarAccessoryControlPreset>;
    readonly applyPreset: (id: AvatarAccessoryPresetId) => void | Promise<void>;
  };
}

export interface AvatarAccessoryControlHandle {
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

export function createAvatarAccessoryControl({
  container,
  options,
  isAccessoryEnabled,
  setAccessoryEnabled,
  title = 'Accessories',
  description = 'Toggle companion gear for the avatar.',
  presets,
}: AvatarAccessoryControlOptions): AvatarAccessoryControlHandle {
  if (!options.length) {
    throw new Error('Avatar accessory control requires at least one option.');
  }

  const controlId = `avatar-accessories-${nextControlId++}`;

  const wrapper = document.createElement('section');
  wrapper.className = 'avatar-accessories';
  wrapper.dataset.pending = 'false';

  const heading = document.createElement('h2');
  heading.className = 'avatar-accessories__title';
  heading.id = `${controlId}-title`;
  heading.textContent = title;

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'avatar-accessories__description';
  descriptionParagraph.textContent = description;

  const list = document.createElement('div');
  list.className = 'avatar-accessories__options';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-labelledby', heading.id);

  let presetGroup: HTMLElement | null = null;
  let presetList: HTMLElement | null = null;
  if (presets) {
    presetGroup = document.createElement('section');
    presetGroup.className = 'avatar-accessories__preset-group';
    const presetHeading = document.createElement('h3');
    presetHeading.className = 'avatar-accessories__preset-title';
    presetHeading.id = `${controlId}-presets-title`;
    presetHeading.textContent = 'Loadouts';

    presetList = document.createElement('div');
    presetList.className = 'avatar-accessories__presets';
    presetList.setAttribute('role', 'list');
    presetList.setAttribute('aria-labelledby', presetHeading.id);

    presetGroup.append(presetHeading, presetList);
  }

  const liveRegion = document.createElement('div');
  liveRegion.className = 'avatar-accessories__status';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  wrapper.append(heading, descriptionParagraph);
  if (presetGroup) {
    wrapper.append(presetGroup);
  }
  wrapper.append(list, liveRegion);
  container.appendChild(wrapper);

  const checkboxes: HTMLInputElement[] = [];
  const optionLabels = new Map<AvatarAccessoryId, HTMLElement>();
  const presetEntries = new Map<
    AvatarAccessoryPresetId,
    {
      container: HTMLElement;
      button: HTMLButtonElement;
      description: HTMLElement;
    }
  >();

  let pending = false;

  const updateLiveRegion = (text: string) => {
    liveRegion.textContent = text;
  };

  const updateSelection = () => {
    checkboxes.forEach((checkbox) => {
      const id = checkbox.value as AvatarAccessoryId;
      const enabled = isAccessoryEnabled(id);
      checkbox.checked = enabled;
      checkbox.setAttribute('aria-checked', enabled ? 'true' : 'false');
      const label = optionLabels.get(id);
      if (label) {
        label.dataset.state = enabled ? 'active' : 'idle';
      }
    });
  };

  const setPending = (value: boolean) => {
    pending = value;
    wrapper.dataset.pending = value ? 'true' : 'false';
    checkboxes.forEach((checkbox) => {
      checkbox.disabled = value;
    });
    presetEntries.forEach(({ button }) => {
      button.disabled = value || button.dataset.unlocked !== 'true';
    });
  };

  const handleError = (error: unknown) => {
    console.warn('Failed to update avatar accessories:', error);
    setPending(false);
    updateSelection();
    updatePresets();
  };

  const handleToggle = (id: AvatarAccessoryId, enabled: boolean) => {
    if (pending) {
      updateSelection();
      return;
    }

    const current = isAccessoryEnabled(id);
    if (current === enabled) {
      updateSelection();
      return;
    }

    setPending(true);
    try {
      const result = setAccessoryEnabled(id, enabled);
      if (isPromiseLike(result)) {
        result
          .then(() => {
            setPending(false);
            updateSelection();
            const option = options.find((entry) => entry.id === id);
            const label = option?.label ?? id;
            updateLiveRegion(`${label} ${enabled ? 'enabled' : 'disabled'}.`);
          })
          .catch(handleError);
      } else {
        setPending(false);
        updateSelection();
        const option = options.find((entry) => entry.id === id);
        const label = option?.label ?? id;
        updateLiveRegion(`${label} ${enabled ? 'enabled' : 'disabled'}.`);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const updatePresets = () => {
    if (!presets) {
      return;
    }
    const snapshot = presets.getPresets();
    const seen = new Set<AvatarAccessoryPresetId>();
    snapshot.forEach((preset) => {
      seen.add(preset.id);
      let entry = presetEntries.get(preset.id);
      if (!entry) {
        const presetContainer = document.createElement('div');
        presetContainer.className = 'avatar-accessories__preset';
        presetContainer.dataset.state = 'locked';
        presetContainer.setAttribute('role', 'listitem');

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'avatar-accessories__preset-button';
        button.textContent = preset.label;
        button.dataset.unlocked = 'false';
        button.setAttribute('aria-pressed', 'false');
        button.disabled = true;

        const presetDescription = document.createElement('p');
        presetDescription.className = 'avatar-accessories__preset-description';
        presetDescription.textContent = preset.description;

        button.addEventListener('click', () => {
          if (pending) {
            updatePresets();
            return;
          }
          if (button.disabled) {
            return;
          }
          setPending(true);
          try {
            const result = presets.applyPreset(preset.id);
            if (isPromiseLike(result)) {
              result
                .then(() => {
                  setPending(false);
                  updateSelection();
                  updatePresets();
                  updateLiveRegion(`${preset.label} loadout equipped.`);
                })
                .catch(handleError);
            } else {
              setPending(false);
              updateSelection();
              updatePresets();
              updateLiveRegion(`${preset.label} loadout equipped.`);
            }
          } catch (error) {
            handleError(error);
          }
        });

        presetContainer.append(button, presetDescription);
        presetList?.appendChild(presetContainer);
        entry = {
          container: presetContainer,
          button,
          description: presetDescription,
        };
        presetEntries.set(preset.id, entry);
      }

      entry.button.dataset.unlocked = preset.unlocked ? 'true' : 'false';
      entry.button.disabled = pending || !preset.unlocked;
      entry.button.setAttribute(
        'aria-pressed',
        preset.applied ? 'true' : 'false'
      );
      entry.container.dataset.state = preset.unlocked
        ? preset.applied
          ? 'active'
          : 'idle'
        : 'locked';
      entry.description.textContent = preset.unlocked
        ? preset.description
        : `${preset.description} (locked)`;
    });

    for (const [id, entry] of presetEntries) {
      if (seen.has(id)) {
        continue;
      }
      entry.button.replaceWith(entry.button.cloneNode(true));
      entry.container.remove();
      presetEntries.delete(id);
    }
  };

  options.forEach((option, index) => {
    const label = document.createElement('label');
    label.className = 'avatar-accessories__option';
    label.dataset.state = 'idle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'avatar-accessories__checkbox';
    checkbox.name = controlId;
    checkbox.value = option.id;
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-label', option.label);
    if (index === 0) {
      checkbox.setAttribute('tabindex', '0');
    }

    const details = document.createElement('div');
    details.className = 'avatar-accessories__option-details';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'avatar-accessories__option-title';
    titleSpan.textContent = option.label;

    const descriptionSpan = document.createElement('span');
    descriptionSpan.className = 'avatar-accessories__option-description';
    descriptionSpan.textContent = option.description;

    details.append(titleSpan, descriptionSpan);

    checkbox.addEventListener('change', () => {
      handleToggle(option.id, checkbox.checked);
    });

    label.append(checkbox, details);
    list.appendChild(label);

    checkboxes.push(checkbox);
    optionLabels.set(option.id, label);
  });

  updateSelection();
  updatePresets();

  return {
    element: wrapper,
    refresh() {
      updateSelection();
      updatePresets();
    },
    dispose() {
      checkboxes.forEach((checkbox) => {
        const clone = checkbox.cloneNode(true) as HTMLInputElement;
        checkbox.replaceWith(clone);
      });
      presetEntries.forEach(({ button, container }) => {
        button.replaceWith(button.cloneNode(true));
        container.remove();
      });
      if (wrapper.parentElement) {
        wrapper.remove();
      }
    },
  };
}
