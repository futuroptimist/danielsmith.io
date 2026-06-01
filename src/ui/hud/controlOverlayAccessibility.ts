interface ControlOverlayAccessibilityOptions {
  container: HTMLElement;
  heading?: HTMLElement | null;
  controlsButton?: HTMLButtonElement | null;
  helpButton?: HTMLButtonElement | null;
  documentTarget?: Document;
  focusOnInit?: boolean;
}

const DEFAULT_HEADING_ID = 'control-overlay-heading';
const DEFAULT_CONTROLS_BUTTON_ID = 'control-overlay-controls';
const DEFAULT_HELP_BUTTON_ID = 'control-overlay-help';

const ensureHeadingId = (heading: HTMLElement, fallbackId: string) => {
  if (!heading.id) {
    heading.id = fallbackId;
  }
  return heading.id;
};

const ensureButtonId = (helpButton: HTMLButtonElement, fallbackId: string) => {
  if (!helpButton.id) {
    helpButton.id = fallbackId;
  }
  return helpButton.id;
};

const appendDescribedBy = (element: HTMLElement, id: string) => {
  const current = element.getAttribute('aria-describedby');
  if (!current) {
    element.setAttribute('aria-describedby', id);
    return;
  }

  const ids = new Set(current.split(/\s+/).filter(Boolean));
  ids.add(id);
  element.setAttribute('aria-describedby', Array.from(ids).join(' '));
};

export const applyControlOverlayAccessibility = ({
  container,
  heading,
  controlsButton,
  helpButton,
  documentTarget = document,
  focusOnInit = false,
}: ControlOverlayAccessibilityOptions) => {
  container.setAttribute('role', 'region');
  if (!container.hasAttribute('tabindex')) {
    container.tabIndex = -1;
  }

  if (controlsButton) {
    const controlsButtonId = ensureButtonId(
      controlsButton,
      DEFAULT_CONTROLS_BUTTON_ID
    );
    container.setAttribute('aria-labelledby', controlsButtonId);
  } else if (heading) {
    const headingId = ensureHeadingId(heading, DEFAULT_HEADING_ID);
    container.setAttribute('aria-labelledby', headingId);
  }

  if (helpButton) {
    helpButton.setAttribute('aria-haspopup', 'dialog');
    const helpId = ensureButtonId(helpButton, DEFAULT_HELP_BUTTON_ID);
    appendDescribedBy(container, helpId);
  }

  if (focusOnInit) {
    const active = documentTarget.activeElement;
    if (!active || active === documentTarget.body) {
      container.focus({ preventScroll: true });
    }
  }
};
