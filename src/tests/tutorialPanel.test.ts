import { describe, expect, it } from 'vitest';

import { getLocaleStrings } from '../assets/i18n';
import { createTutorialPanel } from '../ui/hud/tutorialPanel';

describe('createTutorialPanel', () => {
  it('renders the localized shell zones and placeholder lock states', () => {
    const panel = createTutorialPanel({
      container: document.body,
      strings: getLocaleStrings('en').hud.tutorialPanel,
    });

    panel.open();

    expect(panel.element.hidden).toBe(false);
    expect(
      panel.element.querySelector('[data-testid="tutorial-sidebar"]')
    ).toBeTruthy();
    expect(
      panel.element.querySelector('[data-testid="tutorial-body"]')
    ).toBeTruthy();
    expect(
      panel.element.querySelector('[data-testid="tutorial-navigation"]')
    ).toBeTruthy();
    expect(
      panel.element.querySelector('[data-testid="tutorial-options"]')
    ).toBeTruthy();

    const steps = panel.element.querySelectorAll<HTMLButtonElement>(
      '.tutorial-panel__step'
    );
    expect(steps).toHaveLength(4);
    expect(steps[0]?.disabled).toBe(false);
    expect(steps[0]?.getAttribute('aria-current')).toBe('step');
    expect([...steps].slice(1).every((step) => step.disabled)).toBe(true);

    expect(panel.element.textContent).toContain('Previous');
    expect(panel.element.textContent).toContain('Next');
    expect(panel.element.textContent).toContain('Show on startup');
    expect(panel.element.textContent).toContain('Dismiss');

    panel.dispose();
  });

  it('uses pseudo-localized Tutorial shell text', () => {
    const panel = createTutorialPanel({
      container: document.body,
      strings: getLocaleStrings('en-x-pseudo').hud.tutorialPanel,
    });

    expect(panel.element.textContent).toContain('⟦Tutorial⟧');
    expect(panel.element.textContent).toContain('⟦Dismiss⟧');

    panel.dispose();
  });
});
