import { describe, expect, it } from 'vitest';

import { getTutorialPanelStrings } from '../assets/i18n';
import {
  createDefaultTutorialState,
  unlockTutorialPage,
} from '../systems/tutorial/tutorialState';
import { createTutorialPanel } from '../ui/hud/tutorialPanel';

describe('createTutorialPanel', () => {
  it('renders the shell zones and localized placeholder controls', () => {
    const strings = getTutorialPanelStrings('en');
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state: createDefaultTutorialState(),
    });

    panel.open();

    expect(panel.isOpen()).toBe(true);
    expect(
      panel.element.querySelector('[data-testid="tutorial-sidebar"]')
    ).not.toBeNull();
    expect(
      panel.element.querySelector('[data-testid="tutorial-body"]')
    ).not.toBeNull();
    expect(
      panel.element.querySelector('[data-testid="tutorial-navigation"]')
    ).not.toBeNull();
    expect(
      panel.element.querySelector('[data-testid="tutorial-options"]')
    ).not.toBeNull();
    expect(
      panel.element.querySelectorAll('[data-testid^="tutorial-step-"]')
    ).toHaveLength(4);
    expect(
      panel.element.querySelector<HTMLButtonElement>(
        '[data-testid="tutorial-step-welcomeMovement"]'
      )?.disabled
    ).toBe(false);
    expect(
      panel.element.querySelector<HTMLButtonElement>(
        '[data-testid="tutorial-step-zoom"]'
      )?.disabled
    ).toBe(true);
    expect(panel.element.textContent).toContain(strings.showOnStartupLabel);
    expect(panel.element.textContent).toContain(strings.dismissLabel);
    expect(
      panel.element
        .querySelector('[data-testid="tutorial-sidebar-collapse"]')
        ?.getAttribute('aria-controls')
    ).toBe('tutorial-panel-steps');
    expect(panel.element.querySelector('#tutorial-panel-steps')).not.toBeNull();

    panel.dispose();
  });

  it('renders state-driven navigation and checkbox callbacks', () => {
    const strings = getTutorialPanelStrings('en');
    let state = unlockTutorialPage(createDefaultTutorialState(), 'zoom');
    const selected: string[] = [];
    const startupValues: boolean[] = [];
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state,
      showOnStartup: false,
      onSelectPage: (pageId) => selected.push(pageId),
      onToggleShowOnStartup: (value) => startupValues.push(value),
    });

    panel.open();
    expect(
      panel.element
        .querySelector('[data-testid="tutorial-step-welcomeMovement"]')
        ?.getAttribute('aria-current')
    ).toBe('step');
    expect(
      panel.element
        .querySelector('[data-testid="tutorial-step-visitPois"]')
        ?.getAttribute('aria-disabled')
    ).toBe('true');
    expect(
      panel.element.querySelector<HTMLButtonElement>(
        '[data-testid="tutorial-step-zoom"]'
      )?.disabled
    ).toBe(false);
    expect(
      panel.element.querySelector<HTMLButtonElement>(
        '[data-testid="tutorial-show-on-startup"]'
      )?.checked
    ).toBe(false);

    panel.element
      .querySelector<HTMLButtonElement>('[data-testid="tutorial-step-zoom"]')
      ?.click();
    panel.element
      .querySelector<HTMLButtonElement>(
        '[data-testid="tutorial-step-visitPois"]'
      )
      ?.click();
    expect(selected).toEqual(['zoom']);

    panel.element
      .querySelector<HTMLInputElement>(
        '[data-testid="tutorial-show-on-startup"]'
      )
      ?.click();
    expect(startupValues).toEqual([true]);

    state = { ...state, currentPageId: 'zoom' };
    panel.setState(state);
    expect(panel.element.textContent).toContain(strings.pages.zoom.body);

    panel.dispose();
  });

  it('clears open state when disposed while open', () => {
    const panel = createTutorialPanel({
      container: document.body,
      strings: getTutorialPanelStrings('en'),
      state: createDefaultTutorialState(),
    });

    panel.open();
    panel.dispose();

    expect(panel.isOpen()).toBe(false);
    expect(panel.element.hidden).toBe(true);
    expect(panel.element.dataset.open).toBeUndefined();
  });

  it('dismisses without persistence or progression side effects', () => {
    const panel = createTutorialPanel({
      container: document.body,
      strings: getTutorialPanelStrings('en'),
      state: createDefaultTutorialState(),
    });

    panel.open();
    panel.element
      .querySelector<HTMLButtonElement>('[data-testid="tutorial-dismiss"]')
      ?.click();

    expect(panel.isOpen()).toBe(false);
    expect(panel.element.hidden).toBe(true);

    panel.dispose();
  });
});
