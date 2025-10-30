export interface HelpModalSection {
  id: string;
  title: string;
  items: ReadonlyArray<HelpModalItem>;
}

export interface HelpModalItem {
  label: string;
  description: string;
}

export interface HelpModalContent {
  heading: string;
  description: string;
  closeLabel: string;
  closeAriaLabel: string;
  settings?: {
    heading: string;
    description?: string;
  };
  sections: ReadonlyArray<HelpModalSection>;
  announcements?: {
    open: string;
    close: string;
  };
}

export interface HelpModalOptions {
  container: HTMLElement;
  content: HelpModalContent;
}

export interface HelpModalHandle {
  readonly element: HTMLElement;
  readonly settingsContainer: HTMLElement | null;
  open(): void;
  close(): void;
  toggle(force?: boolean): void;
  isOpen(): boolean;
  setContent(content: HelpModalContent): void;
  dispose(): void;
}

interface HelpModalListItemElements {
  label: HTMLElement;
  description: HTMLElement;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input[type="text"]:not([disabled])',
  'input[type="radio"]:not([disabled])',
  'input[type="checkbox"]:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function createList(
  section: HelpModalSection,
  container: HTMLElement
): { list: HTMLUListElement; items: HelpModalListItemElements[] } {
  const list = document.createElement('ul');
  list.className = 'help-modal__list';
  list.id = `help-modal-section-${section.id}`;
  list.setAttribute('aria-labelledby', `help-modal-heading-${section.id}`);
  const items: HelpModalListItemElements[] = [];
  section.items.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.className = 'help-modal__item';

    const label = document.createElement('span');
    label.className = 'help-modal__item-label';
    label.textContent = item.label;

    const description = document.createElement('span');
    description.className = 'help-modal__item-description';
    description.textContent = item.description;

    listItem.append(label, description);
    list.append(listItem);
    items.push({ label, description });
  });
  container.append(list);
  return { list, items };
}

function getFocusableChildren(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (element) => !element.hasAttribute('tabindex') || element.tabIndex >= 0
  );
}

export function createHelpModal(options: HelpModalOptions): HelpModalHandle {
  const { container, content } = options;
  const {
    heading,
    description,
    sections,
    closeLabel,
    closeAriaLabel,
    settings,
  } = content;

  const backdrop = document.createElement('div');
  backdrop.className = 'help-modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('section');
  modal.className = 'help-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.tabIndex = -1;

  const titleId = 'help-modal-title';
  modal.setAttribute('aria-labelledby', titleId);

  const descriptionId = 'help-modal-description';
  modal.setAttribute('aria-describedby', descriptionId);

  const header = document.createElement('header');
  header.className = 'help-modal__header';

  const title = document.createElement('h2');
  title.className = 'help-modal__title';
  title.id = titleId;
  title.textContent = heading;
  header.appendChild(title);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'help-modal__close';
  closeButton.setAttribute('aria-label', closeAriaLabel);
  closeButton.textContent = closeLabel;
  header.appendChild(closeButton);

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'help-modal__description';
  descriptionParagraph.id = descriptionId;
  descriptionParagraph.textContent = description;

  modal.append(header, descriptionParagraph);

  let settingsContainer: HTMLElement | null = null;
  let settingsElements: {
    heading: HTMLElement;
    description: HTMLElement | null;
  } | null = null;

  if (settings) {
    const settingsSection = document.createElement('section');
    settingsSection.className =
      'help-modal__section help-modal__section--settings';

    const settingsHeading = document.createElement('h3');
    settingsHeading.className =
      'help-modal__section-heading help-modal__section-heading--settings';
    settingsHeading.textContent = settings.heading;
    settingsSection.appendChild(settingsHeading);

    let settingsDescriptionElement: HTMLElement | null = null;
    if (settings.description) {
      const settingsDescription = document.createElement('p');
      settingsDescription.className = 'help-modal__settings-description';
      settingsDescription.textContent = settings.description;
      settingsSection.appendChild(settingsDescription);
      settingsDescriptionElement = settingsDescription;
    }

    settingsContainer = document.createElement('div');
    settingsContainer.className = 'help-modal__settings';
    settingsSection.appendChild(settingsContainer);
    modal.appendChild(settingsSection);

    settingsElements = {
      heading: settingsHeading,
      description: settingsDescriptionElement,
    };
  }

  const sectionElements = new Map<
    string,
    { heading: HTMLElement; items: HelpModalListItemElements[] }
  >();

  sections.forEach((section) => {
    const sectionWrapper = document.createElement('section');
    sectionWrapper.className = 'help-modal__section';

    const sectionHeading = document.createElement('h3');
    sectionHeading.className = 'help-modal__section-heading';
    sectionHeading.id = `help-modal-heading-${section.id}`;
    sectionHeading.textContent = section.title;

    sectionWrapper.appendChild(sectionHeading);
    const { items } = createList(section, sectionWrapper);
    sectionElements.set(section.id, { heading: sectionHeading, items });
    modal.appendChild(sectionWrapper);
  });

  backdrop.appendChild(modal);
  container.appendChild(backdrop);

  let open = false;
  let previouslyFocused: HTMLElement | null = null;

  const focusModal = () => {
    const focusable = getFocusableChildren(modal);
    if (focusable.length) {
      focusable[0].focus();
    } else {
      modal.focus({ preventScroll: true });
    }
  };

  const trapFocus = (event: KeyboardEvent) => {
    if (!open || event.key !== 'Tab') {
      return;
    }
    const focusable = getFocusableChildren(modal);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (!active || active === first || !modal.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (!active || active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const openModal = () => {
    if (open) {
      return;
    }
    open = true;
    previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    backdrop.hidden = false;
    backdrop.dataset.state = 'open';
    document.addEventListener('keydown', handleKeydown);
    focusModal();
  };

  const closeModal = () => {
    if (!open) {
      return;
    }
    open = false;
    backdrop.hidden = true;
    delete backdrop.dataset.state;
    document.removeEventListener('keydown', handleKeydown);
    if (previouslyFocused && document.contains(previouslyFocused)) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  };

  const toggleModal = (force?: boolean) => {
    const shouldOpen = force ?? !open;
    if (shouldOpen) {
      openModal();
    } else {
      closeModal();
    }
  };

  let handle: HelpModalHandle | null = null;

  const invokeClose = () => {
    if (handle) {
      handle.close();
    } else {
      closeModal();
    }
  };

  function handleKeydown(event: KeyboardEvent) {
    if (!open) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      invokeClose();
    }
    trapFocus(event);
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === backdrop) {
      invokeClose();
    }
  }

  function handleCloseClick() {
    invokeClose();
  }

  const dispose = () => {
    invokeClose();
    backdrop.removeEventListener('click', handleBackdropClick);
    closeButton.removeEventListener('click', handleCloseClick);
    backdrop.remove();
  };

  const handleResult: HelpModalHandle = {
    element: modal,
    settingsContainer,
    open: openModal,
    close: closeModal,
    toggle: toggleModal,
    isOpen: () => open,
    setContent(nextContent) {
      title.textContent = nextContent.heading;
      descriptionParagraph.textContent = nextContent.description;
      closeButton.textContent = nextContent.closeLabel;
      closeButton.setAttribute('aria-label', nextContent.closeAriaLabel);

      if (settingsElements && nextContent.settings) {
        settingsElements.heading.textContent = nextContent.settings.heading;
        if (settingsElements.description) {
          settingsElements.description.textContent =
            nextContent.settings.description ?? '';
          settingsElements.description.hidden =
            !nextContent.settings.description;
        }
      }

      if (nextContent.sections.length !== sectionElements.size) {
        throw new Error(
          'Help modal structure mismatch: section count changed.'
        );
      }

      nextContent.sections.forEach((sectionContent) => {
        const existing = sectionElements.get(sectionContent.id);
        if (!existing) {
          throw new Error(`Unknown help modal section: ${sectionContent.id}`);
        }
        existing.heading.textContent = sectionContent.title;
        if (existing.items.length !== sectionContent.items.length) {
          throw new Error(
            `Help modal section ${sectionContent.id} item count mismatch.`
          );
        }
        sectionContent.items.forEach((item, index) => {
          const target = existing.items[index];
          target.label.textContent = item.label;
          target.description.textContent = item.description;
        });
      });
    },
    dispose,
  };

  handle = handleResult;

  backdrop.addEventListener('click', handleBackdropClick);
  closeButton.addEventListener('click', handleCloseClick);

  return handleResult;
}
