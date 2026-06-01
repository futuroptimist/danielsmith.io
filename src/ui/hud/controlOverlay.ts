import type { ControlOverlayStrings } from '../../assets/i18n';

const CONTROL_HEADING_SELECTOR = '[data-control-text="heading"]';
const CONTROL_KEYS_SELECTOR = '.overlay__keys';
const CONTROL_DESCRIPTION_SELECTOR = '.overlay__description';
const INTERACT_LABEL_SELECTOR = '[data-role="interact-label"]';
const INTERACT_DESCRIPTION_SELECTOR = '[data-role="interact-description"]';
const CONTROLS_BUTTON_SELECTOR = '[data-role="controls-button"]';
const TEXT_BUTTON_SELECTOR = '[data-control="text-mode"]';
const HELP_BUTTON_SELECTOR = '[data-control="help"]';
const LEGACY_COLLAPSE_TOGGLE_SELECTOR = '[data-role="control-toggle"]';

function setTextContent(
  element: Element | null | undefined,
  value: string
): void {
  if (element instanceof HTMLElement) {
    element.textContent = value;
  }
}

function setMenuButtonContent(
  button: HTMLButtonElement | null,
  label: string,
  keyHint: string
): void {
  if (!button) {
    return;
  }
  const labelElement = button.querySelector<HTMLElement>(
    '[data-role="menu-label"], [data-role="controls-label"]'
  );
  const keyHintElement = button.querySelector<HTMLElement>(
    '[data-role="menu-key-hint"], [data-role="controls-key-hint"]'
  );
  if (labelElement) {
    labelElement.textContent = label;
  } else {
    button.textContent = label;
  }
  if (keyHintElement) {
    keyHintElement.textContent = keyHint;
  }
  const ariaLabel = `${label} (${keyHint})`;
  button.setAttribute('aria-label', ariaLabel);
  button.title = ariaLabel;
}

export function applyControlOverlayStrings(
  container: HTMLElement,
  strings: ControlOverlayStrings
): void {
  setTextContent(
    container.querySelector(CONTROL_HEADING_SELECTOR),
    strings.heading
  );

  const applyItem = (key: keyof ControlOverlayStrings['items']): void => {
    const item = container.querySelector<HTMLElement>(
      `[data-control-item="${key}"]`
    );
    if (!item) {
      return;
    }
    const { keys, description } = strings.items[key];
    setTextContent(item.querySelector(CONTROL_KEYS_SELECTOR), keys);
    setTextContent(
      item.querySelector(CONTROL_DESCRIPTION_SELECTOR),
      description
    );
  };

  applyItem('keyboardMove');
  applyItem('pointerDrag');
  applyItem('pointerZoom');
  applyItem('touchDrag');
  applyItem('touchPinch');
  applyItem('cyclePoi');
  applyItem('toggleTextMode');

  const interactItem = container.querySelector<HTMLElement>(
    '[data-control-item="interact"]'
  );
  if (interactItem) {
    setTextContent(
      interactItem.querySelector(INTERACT_DESCRIPTION_SELECTOR),
      strings.interact.description
    );
    setTextContent(
      interactItem.querySelector(INTERACT_LABEL_SELECTOR),
      strings.interact.defaultLabel
    );
  }

  const controlsButton = container.querySelector<HTMLButtonElement>(
    CONTROLS_BUTTON_SELECTOR
  );
  if (controlsButton) {
    setMenuButtonContent(
      controlsButton,
      strings.menu.controlsLabel,
      strings.menu.controlsKeyHint
    );
    controlsButton.dataset.hudAnnounce =
      strings.mobileToggle.expandAnnouncement;
  }

  setMenuButtonContent(
    container.querySelector<HTMLButtonElement>(TEXT_BUTTON_SELECTOR),
    strings.menu.textLabel,
    strings.menu.textKeyHint
  );
  setMenuButtonContent(
    container.querySelector<HTMLButtonElement>(HELP_BUTTON_SELECTOR),
    strings.menu.settingsLabel,
    strings.menu.settingsKeyHint
  );

  const legacyCollapseToggle = container.querySelector<HTMLButtonElement>(
    LEGACY_COLLAPSE_TOGGLE_SELECTOR
  );
  if (legacyCollapseToggle) {
    const {
      expandLabel,
      collapseLabel,
      expandAnnouncement,
      collapseAnnouncement,
    } = strings.mobileToggle;
    setTextContent(legacyCollapseToggle, expandLabel);
    legacyCollapseToggle.dataset.expandLabel = expandLabel;
    legacyCollapseToggle.dataset.collapseLabel = collapseLabel;
    legacyCollapseToggle.dataset.expandAnnouncement = expandAnnouncement;
    legacyCollapseToggle.dataset.collapseAnnouncement = collapseAnnouncement;
    legacyCollapseToggle.dataset.hudAnnounce = expandAnnouncement;
  }
}
