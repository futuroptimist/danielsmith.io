import { describe, expect, it } from 'vitest';

import { getTutorialPanelStrings } from '../assets/i18n';
import {
  GITSHELVES_POI_ID,
  createDefaultTutorialState,
  recordMovementProgress,
  recordVisitedPois,
  recordZoomProgress,
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

  it('renders state-driven navigation and callbacks', () => {
    const strings = getTutorialPanelStrings('en');
    let state = unlockTutorialPage(createDefaultTutorialState(), 'zoom');
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state,
      showOnStartup: false,
      onSelectPage: (pageId) => {
        state = { ...state, currentPageId: pageId };
        panel.setState(state);
      },
    });

    panel.open();
    expect(
      panel.element
        .querySelector('[data-testid="tutorial-step-welcomeMovement"]')
        ?.getAttribute('aria-current')
    ).toBe('step');
    expect(
      panel.element.querySelector<HTMLInputElement>(
        '[data-testid="tutorial-show-on-startup"]'
      )?.checked
    ).toBe(false);
    panel.element
      .querySelector<HTMLButtonElement>('[data-testid="tutorial-step-zoom"]')
      ?.click();
    expect(panel.element.textContent).toContain(strings.pages.zoom.title);

    panel.dispose();
  });

  it('enables previous navigation when an earlier unlocked page is reachable across a gap', () => {
    let previousClicks = 0;
    const panel = createTutorialPanel({
      container: document.body,
      strings: getTutorialPanelStrings('en'),
      state: {
        ...createDefaultTutorialState(),
        currentPageId: 'visitPois',
        unlockedPageIds: ['welcomeMovement', 'visitPois'],
      },
      onPrevious: () => {
        previousClicks += 1;
      },
    });

    panel.open();

    const [previous] = panel.element.querySelectorAll<HTMLButtonElement>(
      '[data-testid="tutorial-navigation"] button'
    );
    expect(previous.disabled).toBe(false);

    previous.click();
    expect(previousClicks).toBe(1);

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

describe('createTutorialPanel action content', () => {
  it('renders final movement copy, chips, and text-mode callback', () => {
    let textModeClicks = 0;
    const panel = createTutorialPanel({
      container: document.body,
      strings: getTutorialPanelStrings('en'),
      state: createDefaultTutorialState(),
      onTextMode: () => {
        textModeClicks += 1;
      },
    });
    expect(panel.element.textContent).toContain(
      'Welcome to the immersive portfolio'
    );
    expect(
      panel.element.querySelectorAll('[data-testid^="tutorial-movement-"]')
    ).toHaveLength(4);
    panel.element
      .querySelector<HTMLButtonElement>('[data-testid="tutorial-text-mode"]')
      ?.click();
    expect(textModeClicks).toBe(1);
    panel.dispose();
  });

  it('renders completed chips, POI counter, and Gitshelves status', () => {
    let state = recordMovementProgress(createDefaultTutorialState(), {
      right: 1,
      forward: 1,
      deltaSeconds: 0.25,
      moved: true,
    });
    state = recordMovementProgress(state, {
      right: -1,
      forward: -1,
      deltaSeconds: 0.25,
      moved: true,
    });
    const panel = createTutorialPanel({
      container: document.body,
      strings: getTutorialPanelStrings('en'),
      state,
    });
    expect(panel.element.textContent).toContain('✓');
    panel.setState({
      ...recordZoomProgress(state, {
        currentZoom: 12,
        minZoom: 0.65,
        maxZoom: 12,
      }),
      currentPageId: 'zoom',
    });
    expect(
      panel.element.querySelectorAll('[data-testid^="tutorial-zoom-"]')
    ).toHaveLength(2);
    const poiState = {
      ...recordVisitedPois(state, ['a', 'b']),
      currentPageId: 'visitPois',
    };
    panel.setState(poiState);
    expect(panel.element.textContent).toContain('2/3 POIs visited');
    panel.setState({
      ...recordVisitedPois(poiState, ['a', 'b', 'c', GITSHELVES_POI_ID]),
      currentPageId: 'findGitshelves',
    });
    expect(panel.element.textContent).toContain('Gitshelves visited');
    panel.dispose();
  });
});
