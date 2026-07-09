import { describe, expect, it } from 'vitest';

import {
  AVAILABLE_LOCALES,
  getControlOverlayStrings,
  getHelpModalStrings,
} from '../assets/i18n';
import { CONTROL_ITEM_ORDER } from '../ui/hud/controlItems';
import { applyControlOverlayStrings } from '../ui/hud/controlOverlay';

function createControlOverlayList(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <p data-control-text="heading"></p>
    <ul>
      ${CONTROL_ITEM_ORDER.map(
        ({ id }) => `
          <li data-control-item="${id}">
            <span class="overlay__keys"></span>
            <span class="overlay__description"></span>
          </li>`
      ).join('')}
    </ul>
  `;
  return container;
}

function readControlOverlayRows(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-control-item]')
  ).map((item) => ({
    label: item.querySelector('.overlay__keys')?.textContent ?? '',
    description: item.querySelector('.overlay__description')?.textContent ?? '',
  }));
}

describe('shared controls copy', () => {
  it('renders the C popover and Settings controls rows from identical locale rows', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const overlay = createControlOverlayList();
      applyControlOverlayStrings(overlay, getControlOverlayStrings(locale));

      const settingsControls = getHelpModalStrings(locale).sections[0];
      expect(settingsControls.id, locale).toBe('controls');
      expect(readControlOverlayRows(overlay), locale).toEqual(
        settingsControls.items
      );
    }
  });

  it('keeps pseudo-locale key labels stable while descriptions are pseudo-localized', () => {
    const pseudoControls = getHelpModalStrings('en-x-pseudo').sections[0].items;

    expect(pseudoControls.map(({ label }) => label)).toEqual([
      'WASD / Arrow keys',
      'Left mouse button',
      'Scroll wheel',
      'Shift + = / Shift + -',
      'Touch',
      'Pinch',
      'Q / E',
      'T',
      'Enter',
    ]);
    for (const { description } of pseudoControls) {
      expect(description).toMatch(/^⟦.*⟧$/);
    }
  });
});
