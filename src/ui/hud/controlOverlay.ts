import type { ControlOverlayStrings } from '../../assets/i18n';

const CONTROL_HEADING_SELECTOR = '[data-control-text="heading"]';
const CONTROL_KEYS_SELECTOR = '.overlay__keys';
const CONTROL_DESCRIPTION_SELECTOR = '.overlay__description';
const INTERACT_LABEL_SELECTOR = '[data-role="interact-label"]';
const INTERACT_DESCRIPTION_SELECTOR = '[data-role="interact-description"]';

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
}
