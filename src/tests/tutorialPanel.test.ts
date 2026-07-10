import { describe, expect, it } from 'vitest';

import { getLocaleStrings } from '../assets/i18n';
import { createTutorialPanel } from '../ui/hud/tutorialPanel';

describe('createTutorialPanel', () => {
  it('renders shell zones, locked steps, and localized controls', () => {
    const strings = getLocaleStrings('en').hud.tutorialPanel;
    const panel = createTutorialPanel({ container: document.body, strings });
    panel.open();

    expect(
      panel.element.querySelector('[data-role="tutorial-sidebar"]')
    ).toBeTruthy();
    expect(
      panel.element.querySelector('.tutorial-panel__body')?.textContent
    ).toBe(strings.pages.welcomeMovement.body);
    expect(
      panel.element.querySelector('[data-role="tutorial-navigation"]')
    ).toBeTruthy();
    expect(
      panel.element.querySelector('[data-role="tutorial-options"]')
    ).toBeTruthy();
    expect(
      panel.element.querySelectorAll('[data-role="tutorial-step"]')
    ).toHaveLength(4);
    expect(
      panel.element
        .querySelector('[data-step-id="welcomeMovement"]')
        ?.getAttribute('aria-disabled')
    ).toBe('false');
    expect(
      (
        panel.element.querySelector(
          '[data-step-id="zoom"]'
        ) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      (
        panel.element.querySelector(
          '[data-role="tutorial-previous"]'
        ) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      (
        panel.element.querySelector(
          '[data-role="tutorial-next"]'
        ) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      panel.element.querySelector('[data-role="tutorial-show-on-startup"]')
    ).toBeTruthy();

    panel.element
      .querySelector<HTMLButtonElement>('[data-role="tutorial-dismiss"]')
      ?.click();
    expect(panel.isOpen()).toBe(false);
    panel.dispose();
  });
});
