import { formatMessage } from '../../assets/i18n';
import type { AvatarAccessoryId } from '../../scene/avatar/accessories';

export interface AvatarAccessoryControlOption {
  readonly id: AvatarAccessoryId;
  readonly label: string;
  readonly description: string;
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
  readonly enabledAnnouncementTemplate?: string;
  readonly disabledAnnouncementTemplate?: string;
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
  title,
  description,
  enabledAnnouncementTemplate = '{label} enabled.',
  disabledAnnouncementTemplate = '{label} disabled.',
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
  heading.textContent = title ?? '';

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'avatar-accessories__description';
  descriptionParagraph.textContent = description ?? '';

  const list = document.createElement('div');
  list.className = 'avatar-accessories__options';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-labelledby', heading.id);

  const liveRegion = document.createElement('div');
  liveRegion.className = 'avatar-accessories__status';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  wrapper.append(heading, descriptionParagraph);
  wrapper.append(list, liveRegion);
  container.appendChild(wrapper);

  const checkboxes: HTMLInputElement[] = [];
  const optionLabels = new Map<AvatarAccessoryId, HTMLElement>();

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
  };

  const handleError = (error: unknown) => {
    console.warn('Failed to update avatar accessories:', error);
    setPending(false);
    updateSelection();
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
            updateLiveRegion(
              formatMessage(
                enabled
                  ? enabledAnnouncementTemplate
                  : disabledAnnouncementTemplate,
                { label }
              )
            );
          })
          .catch(handleError);
      } else {
        setPending(false);
        updateSelection();
        const option = options.find((entry) => entry.id === id);
        const label = option?.label ?? id;
        updateLiveRegion(
          formatMessage(
            enabled
              ? enabledAnnouncementTemplate
              : disabledAnnouncementTemplate,
            { label }
          )
        );
      }
    } catch (error) {
      handleError(error);
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
  return {
    element: wrapper,
    refresh() {
      updateSelection();
    },
    dispose() {
      checkboxes.forEach((checkbox) => {
        const clone = checkbox.cloneNode(true) as HTMLInputElement;
        checkbox.replaceWith(clone);
      });
      if (wrapper.parentElement) {
        wrapper.remove();
      }
    },
  };
}
