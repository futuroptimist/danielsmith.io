import { describe, expect, it } from 'vitest';

import { getLocaleStrings } from '../assets/i18n';
import { createTutorialPanel } from '../ui/hud/tutorialPanel';

describe('createTutorialPanel', () => {
  it('renders the shell zones and locked placeholder steps', () => {
    const panel = createTutorialPanel({
      container: document.body,
      strings: getLocaleStrings('en').hud.tutorialPanel,
    });

    panel.open();

    expect(panel.element.hidden).toBe(false);
    expect(
      panel.element.querySelector('[data-role="tutorial-sidebar"]')
    ).toBeTruthy();
    expect(
      panel.element.querySelector('[data-role="tutorial-body"]')
    ).toBeTruthy();
    expect(
      panel.element.querySelector('[data-role="tutorial-navigation"]')
    ).toBeTruthy();
    expect(
      panel.element.querySelector('[data-role="tutorial-options"]')
    ).toBeTruthy();

    const steps = Array.from(
      panel.element.querySelectorAll<HTMLButtonElement>(
        '[data-role="tutorial-step"]'
      )
    );
    expect(steps).toHaveLength(4);
    expect(steps[0].disabled).toBe(false);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(steps.slice(1).every((step) => step.disabled)).toBe(true);
    expect(
      steps
        .slice(1)
        .every((step) => step.getAttribute('aria-disabled') === 'true')
    ).toBe(true);

    expect(
      panel.element.querySelector('[data-role="tutorial-previous"]')
        ?.textContent
    ).toBe('Previous');
    expect(
      panel.element.querySelector('[data-role="tutorial-next"]')?.textContent
    ).toBe('Next');
    expect(
      panel.element.querySelector('[data-role="tutorial-show-on-startup"]')
    ).toBeInstanceOf(HTMLInputElement);
    expect(
      panel.element.querySelector('[data-role="tutorial-dismiss"]')?.textContent
    ).toBe('Dismiss');

    panel.dispose();
  });

  it('dismiss closes the panel', () => {
    const panel = createTutorialPanel({
      container: document.body,
      strings: getLocaleStrings('en').hud.tutorialPanel,
    });

    panel.open();
    panel.element
      .querySelector<HTMLButtonElement>('[data-role="tutorial-dismiss"]')
      ?.click();

    expect(panel.isOpen()).toBe(false);
    panel.dispose();
  });
});
