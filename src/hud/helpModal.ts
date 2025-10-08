export interface HelpModalOptions {
  container: HTMLElement;
  heading?: string;
  sections?: ReadonlyArray<HelpModalSection>;
  description?: string;
}

export interface HelpModalSection {
  id: string;
  title: string;
  items: ReadonlyArray<HelpModalItem>;
}

export interface HelpModalItem {
  label: string;
  description: string;
}

export interface HelpModalHandle {
  readonly element: HTMLElement;
  open(): void;
  close(): void;
  toggle(force?: boolean): void;
  isOpen(): boolean;
  dispose(): void;
}

const DEFAULT_HEADING = 'Quick Reference';
const DEFAULT_DESCRIPTION =
  'Review controls, accessibility tips, and failover shortcuts. ' +
  'Use the help shortcut (default H or ?) to toggle this panel.';

const DEFAULT_SECTIONS: HelpModalSection[] = [
  {
    id: 'movement',
    title: 'Movement & Camera',
    items: [
      {
        label: 'WASD / Arrow keys',
        description: 'Roll the explorer around the home.',
      },
      { label: 'Mouse drag', description: 'Pan the isometric camera.' },
      { label: 'Scroll wheel', description: 'Adjust zoom level.' },
      {
        label: 'Touch joysticks',
        description: 'Drag the left pad to move and the right pad to pan.',
      },
      { label: 'Pinch', description: 'Zoom on touch devices.' },
    ],
  },
  {
    id: 'interactions',
    title: 'Interactions',
    items: [
      {
        label: 'Approach glowing POIs',
        description:
          'Press your interact key (default F), tap, or click to open the exhibit overlay.',
      },
      {
        label: 'Q / E or ← / →',
        description:
          'Cycle focus between points of interest with the keyboard.',
      },
      {
        label: 'T',
        description: 'Toggle between immersive mode and the text fallback.',
      },
      {
        label: 'Shift + L',
        description: 'Compare cinematic lighting with the debug pass.',
      },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility & Failover',
    items: [
      {
        label: 'Low performance',
        description:
          'The scene automatically switches to text mode below 30 FPS.',
      },
      {
        label: 'Manual toggle',
        description:
          'Use the on-screen Text mode button or press T at any time.',
      },
      {
        label: 'Ambient audio',
        description: 'Toggle with the Audio button or press M.',
      },
    ],
  },
];

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
): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'help-modal__list';
  list.id = `help-modal-section-${section.id}`;
  list.setAttribute('aria-labelledby', `help-modal-heading-${section.id}`);
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
  });
  container.append(list);
  return list;
}

function getFocusableChildren(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (element) => !element.hasAttribute('tabindex') || element.tabIndex >= 0
  );
}

export function createHelpModal(options: HelpModalOptions): HelpModalHandle {
  const {
    container,
    heading = DEFAULT_HEADING,
    sections = DEFAULT_SECTIONS,
  } = options;
  const description = options.description ?? DEFAULT_DESCRIPTION;

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
  closeButton.setAttribute('aria-label', 'Close help');
  closeButton.textContent = 'Close';
  header.appendChild(closeButton);

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'help-modal__description';
  descriptionParagraph.id = descriptionId;
  descriptionParagraph.textContent = description;

  modal.append(header, descriptionParagraph);

  sections.forEach((section) => {
    const sectionWrapper = document.createElement('section');
    sectionWrapper.className = 'help-modal__section';

    const sectionHeading = document.createElement('h3');
    sectionHeading.className = 'help-modal__section-heading';
    sectionHeading.id = `help-modal-heading-${section.id}`;
    sectionHeading.textContent = section.title;

    sectionWrapper.appendChild(sectionHeading);
    createList(section, sectionWrapper);
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

  const handleKeydown = (event: KeyboardEvent) => {
    if (!open) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    trapFocus(event);
  };

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === backdrop) {
      close();
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

  function close() {
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
  }

  const toggle = (force?: boolean) => {
    const shouldOpen = force ?? !open;
    if (shouldOpen) {
      openModal();
    } else {
      close();
    }
  };

  const handleCloseClick = () => close();

  backdrop.addEventListener('click', handleBackdropClick);
  closeButton.addEventListener('click', handleCloseClick);

  const dispose = () => {
    close();
    backdrop.removeEventListener('click', handleBackdropClick);
    closeButton.removeEventListener('click', handleCloseClick);
    backdrop.remove();
  };

  return {
    element: modal,
    open: openModal,
    close,
    toggle,
    isOpen: () => open,
    dispose,
  };
}
