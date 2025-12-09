import type { HudCustomizationStrings } from '../../assets/i18n/types';
import type { AvatarAccessoryControlHandle } from '../../systems/controls/avatarAccessoryControl';
import type { AvatarVariantControlHandle } from '../../systems/controls/avatarVariantControl';

export interface HudCustomizationSectionFactoryOptions {
  readonly container: HTMLElement;
  readonly title: string;
  readonly description: string;
}

export interface HudCustomizationSectionFactories {
  readonly createVariantControl?: (
    options: HudCustomizationSectionFactoryOptions
  ) => AvatarVariantControlHandle | null;
  readonly createAccessoryControl?: (
    options: HudCustomizationSectionFactoryOptions
  ) => AvatarAccessoryControlHandle | null;
}

export interface HudCustomizationHandle {
  readonly element: HTMLElement;
  refresh(): void;
  setStrings(strings: HudCustomizationStrings): void;
  dispose(): void;
}

export interface HudCustomizationSectionOptions
  extends HudCustomizationSectionFactories {
  readonly container: HTMLElement;
  readonly strings: HudCustomizationStrings;
}

function updateControlCopy(
  element: HTMLElement,
  title: string,
  description: string,
  selectors: { title: string; description: string }
): void {
  const titleElement = element.querySelector<HTMLElement>(selectors.title);
  if (titleElement) {
    titleElement.textContent = title;
  }
  const descriptionElement = element.querySelector<HTMLElement>(
    selectors.description
  );
  if (descriptionElement) {
    descriptionElement.textContent = description;
  }
}

export function createHudCustomizationSection({
  container,
  strings,
  createVariantControl,
  createAccessoryControl,
}: HudCustomizationSectionOptions): HudCustomizationHandle {
  const wrapper = document.createElement('section');
  wrapper.className = 'hud-customization';

  const heading = document.createElement('h2');
  heading.className = 'hud-customization__heading';
  heading.textContent = strings.heading;

  const description = document.createElement('p');
  description.className = 'hud-customization__description';
  description.textContent = strings.description ?? '';
  description.hidden = !strings.description;

  const content = document.createElement('div');
  content.className = 'hud-customization__controls';

  wrapper.append(heading, description, content);
  container.appendChild(wrapper);

  const variantHandle = createVariantControl?.({
    container: content,
    title: strings.variants.title,
    description: strings.variants.description,
  });

  const accessoryHandle = createAccessoryControl?.({
    container: content,
    title: strings.accessories.title,
    description: strings.accessories.description,
  });

  if (!variantHandle && !accessoryHandle) {
    wrapper.remove();
    throw new Error(
      'HUD customization requires at least one control to render.'
    );
  }

  return {
    element: wrapper,
    refresh() {
      variantHandle?.refresh();
      accessoryHandle?.refresh();
    },
    setStrings(nextStrings) {
      heading.textContent = nextStrings.heading;
      description.textContent = nextStrings.description ?? '';
      description.hidden = !nextStrings.description;

      if (variantHandle?.element) {
        updateControlCopy(
          variantHandle.element,
          nextStrings.variants.title,
          nextStrings.variants.description,
          {
            title: '.avatar-variants__title',
            description: '.avatar-variants__description',
          }
        );
      }

      if (accessoryHandle?.element) {
        updateControlCopy(
          accessoryHandle.element,
          nextStrings.accessories.title,
          nextStrings.accessories.description,
          {
            title: '.avatar-accessories__title',
            description: '.avatar-accessories__description',
          }
        );
      }
    },
    dispose() {
      variantHandle?.dispose();
      accessoryHandle?.dispose();
      if (wrapper.parentElement) {
        wrapper.remove();
      }
    },
  };
}
