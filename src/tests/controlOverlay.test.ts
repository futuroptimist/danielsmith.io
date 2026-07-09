import { describe, expect, it } from 'vitest';

import {
  AVAILABLE_LOCALES,
  getControlOverlayStrings,
  getHelpModalStrings,
} from '../assets/i18n';
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
});

function buildControlOverlayContainer() {
  const container = document.createElement('div');
  container.innerHTML = `
    <p data-control-text="heading"></p>
    <ul>
      <li data-control-item="keyboardMove"><span class="overlay__keys"></span><span class="overlay__description"></span></li>
      <li data-control-item="pointerDrag"><span class="overlay__keys"></span><span class="overlay__description"></span></li>
      <li data-control-item="pointerZoom"><span class="overlay__keys"></span><span class="overlay__description"></span></li>
      <li data-control-item="keyboardZoom"><span class="overlay__keys"></span><span class="overlay__description"></span></li>
      <li data-control-item="touchDrag"><span class="overlay__keys"></span><span class="overlay__description"></span></li>
      <li data-control-item="touchPinch"><span class="overlay__keys"></span><span class="overlay__description"></span></li>
      <li data-control-item="cyclePoi"><span class="overlay__keys"></span><span class="overlay__description"></span></li>
      <li data-control-item="toggleTextMode"><span class="overlay__keys"></span><span class="overlay__description"></span></li>
      <li data-control-item="interact"><span class="overlay__keys" data-role="interact-label"></span><span class="overlay__description" data-role="interact-description"></span></li>
    </ul>
  `;
  return container;
}

function readOverlayRows(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-control-item]')
  ).map((item) => ({
    label: item.querySelector('.overlay__keys')?.textContent ?? '',
    description: item.querySelector('.overlay__description')?.textContent ?? '',
  }));
}

describe('shared controls copy', () => {
  it('renders identical C popover and Settings controls rows for every locale', () => {
    AVAILABLE_LOCALES.forEach((locale) => {
      document.body.innerHTML = '';
      const overlay = buildControlOverlayContainer();
      applyControlOverlayStrings(overlay, getControlOverlayStrings(locale));

      const helpModal = createHelpModal({
        container: document.body,
        content: getHelpModalStrings(locale),
      });

      const helpRows = Array.from(
        helpModal.element.querySelectorAll<HTMLElement>(
          '#help-modal-section-controls .help-modal__item'
        )
      ).map((item) => ({
        label: item.querySelector('.help-modal__item-label')?.textContent ?? '',
        description:
          item.querySelector('.help-modal__item-description')?.textContent ??
          '',
      }));

      expect(helpRows, locale).toEqual(readOverlayRows(overlay));
      helpModal.dispose();
    });
  });
});
