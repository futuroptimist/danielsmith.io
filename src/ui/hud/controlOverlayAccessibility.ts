interface ControlOverlayAccessibilityOptions {
  container: HTMLElement;
  heading?: HTMLElement | null;
  helpButton?: HTMLButtonElement | null;
  documentTarget?: Document;
  focusOnInit?: boolean;
}

const DEFAULT_HEADING_ID = 'control-overlay-heading';

const ensureHeadingId = (heading: HTMLElement, fallbackId: string) => {
  if (!heading.id) {
    heading.id = fallbackId;
  }
  return heading.id;
};

export const applyControlOverlayAccessibility = ({
  container,
  heading,
  helpButton,
  documentTarget = document,
  focusOnInit = false,
}: ControlOverlayAccessibilityOptions) => {
  container.setAttribute('role', 'region');
  if (!container.hasAttribute('tabindex')) {
    container.tabIndex = -1;
  }

  if (heading) {
    const headingId = ensureHeadingId(heading, DEFAULT_HEADING_ID);
    container.setAttribute('aria-labelledby', headingId);
  }

  if (helpButton) {
    helpButton.setAttribute('aria-haspopup', 'dialog');
  }

  if (focusOnInit) {
    const active = documentTarget.activeElement;
    if (!active || active === documentTarget.body) {
      container.focus({ preventScroll: true });
    }
  }
};
