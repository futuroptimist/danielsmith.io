import { describe, expect, it } from 'vitest';

import { getTutorialPanelStrings } from '../assets/i18n';
import { unlockTutorialPage } from '../systems/tutorial/tutorialState';
import { createTutorialPanel } from '../ui/hud/tutorialPanel';

describe('createTutorialPanel', () => {
  it('renders the shell zones and localized placeholder controls', () => {
    const strings = getTutorialPanelStrings('en');
    const panel = createTutorialPanel({
      container: document.body,
      strings,
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

  it('clears open state when disposed while open', () => {
    const panel = createTutorialPanel({
      container: document.body,
      strings: getTutorialPanelStrings('en'),
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
    });

    panel.open();
    panel.element
      .querySelector<HTMLButtonElement>('[data-testid="tutorial-dismiss"]')
      ?.click();

    expect(panel.isOpen()).toBe(false);
    expect(panel.element.hidden).toBe(true);

    panel.dispose();
  });

  it('renders state-driven navigation and persists callbacks', () => {
    const strings = getTutorialPanelStrings('en');
    const selected: string[] = [];
    const toggles: boolean[] = [];
    const state = unlockTutorialPage(
      {
        version: 1,
        currentPageId: 'welcomeMovement',
        unlockedPageIds: ['welcomeMovement'],
        completedPageIds: [],
        progress: {
          movement: {
            forwardSeconds: 0,
            leftSeconds: 0,
            backwardSeconds: 0,
            rightSeconds: 0,
            forwardComplete: false,
            leftComplete: false,
            backwardComplete: false,
            rightComplete: false,
          },
          zoom: { zoomInComplete: false, zoomOutComplete: false },
          pois: { visitedPoiIds: [], visitedCountGoal: 3 },
          gitshelves: { completed: false },
        },
      },
      'zoom'
    );
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state,
      showOnStartup: false,
      onSelectPage: (pageId) => selected.push(pageId),
      onToggleShowOnStartup: (value) => toggles.push(value),
    });

    panel.open();
    const first = panel.element.querySelector<HTMLButtonElement>(
      '[data-testid="tutorial-step-welcomeMovement"]'
    );
    const zoom = panel.element.querySelector<HTMLButtonElement>(
      '[data-testid="tutorial-step-zoom"]'
    );
    const visit = panel.element.querySelector<HTMLButtonElement>(
      '[data-testid="tutorial-step-visitPois"]'
    );
    expect(first?.getAttribute('aria-current')).toBe('step');
    expect(zoom?.disabled).toBe(false);
    expect(visit?.getAttribute('aria-disabled')).toBe('true');
    expect(
      panel.element.querySelectorAll<HTMLButtonElement>(
        '.tutorial-panel__nav button'
      )[0].disabled
    ).toBe(true);
    expect(
      panel.element.querySelectorAll<HTMLButtonElement>(
        '.tutorial-panel__nav button'
      )[1].disabled
    ).toBe(false);

    zoom?.click();
    expect(selected).toEqual(['zoom']);
    expect(
      panel.element.querySelector<HTMLInputElement>(
        '[data-testid="tutorial-show-on-startup"]'
      )?.checked
    ).toBe(false);
    panel.element
      .querySelector<HTMLInputElement>(
        '[data-testid="tutorial-show-on-startup"]'
      )
      ?.click();
    expect(toggles).toEqual([true]);

    panel.dispose();
  });
});
