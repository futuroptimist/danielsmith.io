import type { ControlOverlayStrings } from '../../assets/i18n';
import { getControlItemRows } from '../../assets/i18n/controlItems';

import { formatMenuButtonTitle } from './menuButtonTitle';

const CONTROL_HEADING_SELECTOR = '[data-control-text="heading"]';
const CONTROL_KEYS_SELECTOR = '.overlay__keys';
const CONTROL_DESCRIPTION_SELECTOR = '.overlay__description';
const INTERACT_LABEL_SELECTOR = '[data-role="interact-label"]';
const INTERACT_DESCRIPTION_SELECTOR = '[data-role="interact-description"]';
const CONTROLS_BUTTON_SELECTOR = '[data-role="controls-button"]';
const TEXT_MODE_BUTTON_SELECTOR = '[data-role="text-mode-button"]';
const TUTORIAL_BUTTON_SELECTOR = '[data-role="tutorial-button"]';
const SETTINGS_BUTTON_SELECTOR = '[data-role="settings-button"]';
const LEGACY_COLLAPSE_TOGGLE_SELECTOR = '[data-role="control-toggle"]';

function setTextContent(
  element: Element | null | undefined,
  value: string
): void {
  if (element instanceof HTMLElement) {
    element.textContent = value;
  }
}

export function applyHudMenuButtonMetadata(
  button: HTMLButtonElement,
  item: ControlOverlayStrings['menu'][keyof ControlOverlayStrings['menu']],
  shortcutLabel: string,
  announcement?: string
): void {
  setTextContent(button.querySelector('[data-hud-menu-label]'), item.label);
  setTextContent(button.querySelector('[data-hud-menu-key]'), shortcutLabel);

  const title = formatMenuButtonTitle(item, shortcutLabel);
  button.setAttribute('aria-label', title);
  button.title = title;
  if (announcement !== undefined) {
    button.dataset.hudAnnounce = announcement;
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

  for (const { id, keys, description } of getControlItemRows(strings)) {
    const item = container.querySelector<HTMLElement>(
      `[data-control-item="${id}"]`
    );
    if (!item) {
      continue;
    }
    setTextContent(item.querySelector(CONTROL_KEYS_SELECTOR), keys);
    setTextContent(
      item.querySelector(CONTROL_DESCRIPTION_SELECTOR),
      description
    );
  }

  const interactItem = container.querySelector<HTMLElement>(
    '[data-role="interact"]'
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

  const applyMenuButton = (
    selector: string,
    key: keyof ControlOverlayStrings['menu']
  ) => {
    const button = container.querySelector<HTMLButtonElement>(selector);
    if (!button) {
      return;
    }
    const item = strings.menu[key];
    applyHudMenuButtonMetadata(button, item, item.keyHint);
  };

  applyMenuButton(CONTROLS_BUTTON_SELECTOR, 'controls');
  applyMenuButton(TEXT_MODE_BUTTON_SELECTOR, 'text');
  applyMenuButton(TUTORIAL_BUTTON_SELECTOR, 'tutorial');
  applyMenuButton(SETTINGS_BUTTON_SELECTOR, 'settings');

  const controlsButton = container.querySelector<HTMLButtonElement>(
    CONTROLS_BUTTON_SELECTOR
  );
  if (controlsButton) {
    controlsButton.dataset.hudAnnounce =
      strings.mobileToggle.expandAnnouncement;
  }

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
