import { describe, expect, it } from 'vitest';

import {
  AVAILABLE_LOCALES,
  getControlOverlayStrings,
  getHelpModalStrings,
} from '../assets/i18n';
import { CONTROL_ITEM_IDS } from '../ui/hud/controlItems';
import { applyControlOverlayStrings } from '../ui/hud/controlOverlay';
import { createHelpModal } from '../ui/hud/helpModal';

describe('applyControlOverlayStrings', () => {
  it('updates heading, list items, and interact defaults', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <p class="overlay__heading" data-control-text="heading">Placeholder</p>
      <ul class="overlay__list" data-role="control-list">
        <li class="overlay__item" data-control-item="keyboardMove">
          <span class="overlay__keys">Keys</span>
          <span class="overlay__description">Move</span>
        </li>
        <li class="overlay__item" data-control-item="keyboardZoom">
          <span class="overlay__keys">Keys</span>
          <span class="overlay__description">Zoom</span>
        </li>
        <li
          class="overlay__item"
          data-control-item="interact"
          data-role="interact"
        >
          <span class="overlay__keys" data-role="interact-label">?</span>
          <span
            class="overlay__description"
            data-role="interact-description"
          >
            ???
          </span>
        </li>
      </ul>
      <button
        class="overlay__collapse-toggle"
        type="button"
        data-role="control-toggle"
      >
        Toggle
      </button>
    `;
    const strings = getControlOverlayStrings('en');
    applyControlOverlayStrings(container, strings);

    const heading = container.querySelector('[data-control-text="heading"]');
    expect(heading?.textContent).toBe(strings.heading);

    const keyboardItem = container.querySelector(
      '[data-control-item="keyboardMove"] .overlay__keys'
    );
    expect(keyboardItem?.textContent).toBe(strings.items.keyboardMove.keys);

    const zoomItem = container.querySelector(
      '[data-control-item="keyboardZoom"] .overlay__keys'
    );
    expect(zoomItem?.textContent).toBe(strings.items.keyboardZoom.keys);

    const interactLabel = container.querySelector(
      '[data-role="interact-label"]'
    );
    const interactDescription = container.querySelector(
      '[data-role="interact-description"]'
    );
    expect(interactLabel?.textContent).toBe(strings.interact.defaultLabel);
    expect(interactDescription?.textContent).toBe(strings.interact.description);

    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-role="control-toggle"]'
    );
    expect(toggle?.textContent).toBe(strings.mobileToggle.expandLabel);
    expect(toggle?.dataset.expandLabel).toBe(strings.mobileToggle.expandLabel);
    expect(toggle?.dataset.collapseLabel).toBe(
      strings.mobileToggle.collapseLabel
    );
    expect(toggle?.dataset.expandAnnouncement).toBe(
      strings.mobileToggle.expandAnnouncement
    );
    expect(toggle?.dataset.collapseAnnouncement).toBe(
      strings.mobileToggle.collapseAnnouncement
    );
    expect(toggle?.dataset.hudAnnounce).toBe(
      strings.mobileToggle.expandAnnouncement
    );
  });

  it('renders the same ordered controls rows in the popover and Settings for every locale', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const overlay = document.createElement('div');
      overlay.innerHTML = `
        <p class="overlay__heading" data-control-text="heading">Placeholder</p>
        <ul class="overlay__list" data-role="control-list">
          ${CONTROL_ITEM_IDS.map(
            (id) => `
              <li class="overlay__item" data-control-item="${id}">
                <span class="overlay__keys"></span>
                <span class="overlay__description"></span>
              </li>`
          ).join('')}
        </ul>
      `;
      applyControlOverlayStrings(overlay, getControlOverlayStrings(locale));

      const popoverRows = Array.from(
        overlay.querySelectorAll<HTMLElement>('[data-control-item]')
      ).map((item) => ({
        label: item.querySelector('.overlay__keys')?.textContent ?? '',
        description:
          item.querySelector('.overlay__description')?.textContent ?? '',
      }));

      const modalHost = document.createElement('div');
      const modal = createHelpModal({
        container: modalHost,
        content: getHelpModalStrings(locale),
      });
      const settingsRows = Array.from(
        modal.element.querySelectorAll<HTMLElement>(
          '#help-modal-section-movement .help-modal__item'
        )
      ).map((item) => ({
        label: item.querySelector('.help-modal__item-label')?.textContent ?? '',
        description:
          item.querySelector('.help-modal__item-description')?.textContent ??
          '',
      }));

      expect(settingsRows, locale).toEqual(popoverRows);
      modal.dispose();
    }
  });
});
