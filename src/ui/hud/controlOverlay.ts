import type { ControlOverlayStrings } from '../../assets/i18n';

const CONTROL_HEADING_SELECTOR = '[data-control-text="heading"]';
const CONTROL_KEYS_SELECTOR = '.overlay__keys';
const CONTROL_DESCRIPTION_SELECTOR = '.overlay__description';
const INTERACT_LABEL_SELECTOR = '[data-role="interact-label"]';
const INTERACT_DESCRIPTION_SELECTOR = '[data-role="interact-description"]';
const CONTROL_TOGGLE_SELECTOR = '[data-role="control-toggle"]';
const CONTROL_CLOSE_SELECTOR = '[data-role="control-close"]';

function setTextContent(
  element: Element | null | undefined,
  value: string
): void {
  if (element instanceof HTMLElement) {
    element.textContent = value;
  }
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

  const controlToggle = container.querySelector<HTMLButtonElement>(
    CONTROL_TOGGLE_SELECTOR
  );
  if (controlToggle) {
    const { expandAnnouncement, collapseAnnouncement } = strings.mobileToggle;
    setTextContent(controlToggle, strings.heading);
    controlToggle.dataset.expandAnnouncement = expandAnnouncement;
    controlToggle.dataset.collapseAnnouncement = collapseAnnouncement;
    controlToggle.dataset.hudAnnounce = expandAnnouncement;
  }

  const closeButton = container.querySelector<HTMLButtonElement>(
    CONTROL_CLOSE_SELECTOR
  );
  if (closeButton) {
    setTextContent(closeButton, strings.mobileToggle.collapseLabel);
    closeButton.dataset.hudAnnounce = strings.mobileToggle.collapseAnnouncement;
  }
}
