import { describe, expect, it } from 'vitest';

import { applyControlOverlayStrings } from '../hud/controlOverlay';
import { getControlOverlayStrings } from '../i18n';

describe('applyControlOverlayStrings', () => {
  it('updates heading, list items, and interact defaults', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <p class="overlay__heading" data-control-text="heading">Placeholder</p>
      <ul class="overlay__list">
        <li class="overlay__item" data-control-item="keyboardMove">
          <span class="overlay__keys">Keys</span>
          <span class="overlay__description">Move</span>
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
    `;
    const strings = getControlOverlayStrings('en');
    applyControlOverlayStrings(container, strings);

    const heading = container.querySelector('[data-control-text="heading"]');
    expect(heading?.textContent).toBe(strings.heading);

    const keyboardItem = container.querySelector(
      '[data-control-item="keyboardMove"] .overlay__keys'
    );
    expect(keyboardItem?.textContent).toBe(strings.items.keyboardMove.keys);

    const interactLabel = container.querySelector('[data-role="interact-label"]');
    const interactDescription = container.querySelector(
      '[data-role="interact-description"]'
    );
    expect(interactLabel?.textContent).toBe(strings.interact.defaultLabel);
    expect(interactDescription?.textContent).toBe(strings.interact.description);
  });
});
