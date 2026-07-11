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
    expect(panel.element.getAttribute('role')).toBe('dialog');
    expect(panel.element.getAttribute('aria-modal')).toBe('false');
    expect(panel.element.getAttribute('aria-labelledby')).toBe(
      'tutorial-panel-heading'
    );
    expect(panel.element.getAttribute('aria-describedby')).toBe(
      'tutorial-panel-description'
    );
    // Live region is present but empty on first render (no new completions).
    const liveRegion = panel.element.querySelector(
      '[data-testid="tutorial-status-live"]'
    );
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion?.textContent).toBe('');

    panel.dispose();
  });

  it('renders progress chips with localized completion text and static labels', () => {
    const strings = getTutorialPanelStrings('en');
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state: {
        ...createDefaultTutorialState(),
        progress: {
          ...createDefaultTutorialState().progress,
          movement: {
            ...createDefaultTutorialState().progress.movement,
            forwardComplete: true,
          },
        },
      },
    });

    panel.open();

    const completedChip = panel.element.querySelector(
      '[data-testid="tutorial-movement-forward"]'
    );
    const incompleteChip = panel.element.querySelector(
      '[data-testid="tutorial-movement-backward"]'
    );
    expect(completedChip?.getAttribute('aria-label')?.toLowerCase()).toContain(
      'complete'
    );
    expect(completedChip?.textContent).toContain('✓');
    expect(completedChip?.textContent).toContain(
      strings.actions.checkmarkLabel
    );
    expect(incompleteChip?.textContent).not.toContain('✓');
    expect(completedChip?.getAttribute('data-status')).toBe('complete');
    expect(incompleteChip?.getAttribute('data-status')).toBe('incomplete');
    expect(completedChip?.getAttribute('role')).toBeNull();
    expect(incompleteChip?.getAttribute('role')).toBeNull();

    panel.setState({
      ...createDefaultTutorialState(),
      currentPageId: 'zoom',
      unlockedPageIds: ['welcomeMovement', 'zoom'],
      completedPageIds: ['welcomeMovement'],
      progress: {
        ...createDefaultTutorialState().progress,
        zoom: {
          zoomInComplete: true,
          zoomOutComplete: false,
        },
      },
    });

    const completedZoomChip = panel.element.querySelector(
      '[data-testid="tutorial-zoom-in"]'
    );
    const incompleteZoomChip = panel.element.querySelector(
      '[data-testid="tutorial-zoom-out"]'
    );
    expect(completedZoomChip?.textContent).toContain('✓');
    expect(completedZoomChip?.textContent).toContain(
      strings.actions.checkmarkLabel
    );
    expect(incompleteZoomChip?.textContent).not.toContain('✓');

    panel.dispose();
  });

  it('renders final page content without duplicating the Gitshelves hint', () => {
    const strings = getTutorialPanelStrings('en');
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state: {
        ...createDefaultTutorialState(),
        currentPageId: 'findGitshelves',
        unlockedPageIds: [
          'welcomeMovement',
          'zoom',
          'visitPois',
          'findGitshelves',
        ],
        completedPageIds: [
          'welcomeMovement',
          'zoom',
          'visitPois',
          'findGitshelves',
        ],
        progress: {
          ...createDefaultTutorialState().progress,
          gitshelves: { completed: true },
        },
      },
    });

    const bodyText =
      panel.element.querySelector('[data-testid="tutorial-body"]')
        ?.textContent ?? '';
    expect(bodyText).toContain(strings.pages.findGitshelves.body);
    expect(
      panel.element.querySelector('[data-testid="tutorial-gitshelves-status"]')
        ?.textContent
    ).toContain(strings.actions.checkmarkLabel);
    expect(
      panel.element.querySelector('[data-testid="tutorial-gitshelves-status"]')
        ?.textContent
    ).toContain('✓');
    expect(bodyText.split(strings.actions.gitshelvesHint).length - 1).toBe(1);

    panel.dispose();
  });

  it('keeps a completed POI page visually complete after a shared reset', () => {
    const strings = getTutorialPanelStrings('en');
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state: {
        ...createDefaultTutorialState(),
        currentPageId: 'visitPois',
        unlockedPageIds: [
          'welcomeMovement',
          'zoom',
          'visitPois',
          'findGitshelves',
        ],
        completedPageIds: ['welcomeMovement', 'zoom', 'visitPois'],
        progress: {
          ...createDefaultTutorialState().progress,
          pois: {
            ...createDefaultTutorialState().progress.pois,
            visitedPoiIds: ['remaining-shared-poi'],
          },
        },
      },
    });

    const counter = panel.element.querySelector(
      '[data-testid="tutorial-poi-counter"]'
    );

    expect(counter?.textContent).toContain('3/3');
    expect(counter?.textContent).toContain('✓');
    expect(counter?.textContent).toContain(strings.actions.checkmarkLabel);
    expect(counter?.getAttribute('aria-label')?.toLowerCase()).toContain(
      'complete'
    );

    panel.dispose();
  });

  it('invokes the text-mode callback once', () => {
    let textModeClicks = 0;
    const panel = createTutorialPanel({
      container: document.body,
      strings: getTutorialPanelStrings('en'),
      state: createDefaultTutorialState(),
      onTextMode: () => {
        textModeClicks += 1;
      },
    });

    panel.element
      .querySelector<HTMLButtonElement>('[data-testid="tutorial-text-mode"]')
      ?.click();

    expect(textModeClicks).toBe(1);

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
    expect(
      panel.element
        .querySelector('[data-testid="tutorial-step-zoom"]')
        ?.getAttribute('aria-disabled')
    ).toBe('false');
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

  it('live region node is the same object across rerenders', () => {
    const panel = createTutorialPanel({
      container: document.body,
      strings: getTutorialPanelStrings('en'),
      state: createDefaultTutorialState(),
    });

    const first = panel.element.querySelector(
      '[data-testid="tutorial-status-live"]'
    );
    expect(first).not.toBeNull();

    // Trigger sidebar collapse → rerender.
    panel.element
      .querySelector<HTMLButtonElement>(
        '[data-testid="tutorial-sidebar-collapse"]'
      )
      ?.click();
    const afterCollapse = panel.element.querySelector(
      '[data-testid="tutorial-status-live"]'
    );
    expect(afterCollapse).toBe(first);

    // Trigger setStrings → rerender.
    panel.setStrings(getTutorialPanelStrings('en'));
    const afterStrings = panel.element.querySelector(
      '[data-testid="tutorial-status-live"]'
    );
    expect(afterStrings).toBe(first);

    panel.dispose();
  });

  it('announces newly completed pages by title after setState, not on initial render', () => {
    const strings = getTutorialPanelStrings('en');
    const initial = createDefaultTutorialState();
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state: initial,
    });

    const liveRegion = panel.element.querySelector<HTMLElement>(
      '[data-testid="tutorial-status-live"]'
    );
    expect(liveRegion).not.toBeNull();

    // Initial render: no announcement even with an empty completedPageIds.
    expect(liveRegion?.textContent).toBe('');

    // Complete the first page.
    panel.setState({
      ...initial,
      currentPageId: 'zoom',
      unlockedPageIds: ['welcomeMovement', 'zoom'],
      completedPageIds: ['welcomeMovement'],
    });
    expect(liveRegion?.textContent).toContain(
      strings.pages.welcomeMovement.title
    );
    expect(liveRegion?.textContent).toContain(strings.completedStepLabel);

    panel.dispose();
  });

  it('announces all newly completed pages in a single batched setState', () => {
    const strings = getTutorialPanelStrings('en');
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state: createDefaultTutorialState(),
    });

    const liveRegion = panel.element.querySelector<HTMLElement>(
      '[data-testid="tutorial-status-live"]'
    );

    // Batch: two pages become complete in one setState call.
    panel.setState({
      ...createDefaultTutorialState(),
      currentPageId: 'visitPois',
      unlockedPageIds: ['welcomeMovement', 'zoom', 'visitPois'],
      completedPageIds: ['welcomeMovement', 'zoom'],
    });

    const text = liveRegion?.textContent ?? '';
    expect(text).toContain(strings.pages.welcomeMovement.title);
    expect(text).toContain(strings.pages.zoom.title);
    expect(text).toContain(strings.completedStepLabel);

    panel.dispose();
  });

  it('clears stale announcement text on unrelated rerenders', () => {
    const strings = getTutorialPanelStrings('en');
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state: createDefaultTutorialState(),
    });

    const liveRegion = panel.element.querySelector<HTMLElement>(
      '[data-testid="tutorial-status-live"]'
    );

    // Complete a page → announcement fires.
    panel.setState({
      ...createDefaultTutorialState(),
      currentPageId: 'zoom',
      unlockedPageIds: ['welcomeMovement', 'zoom'],
      completedPageIds: ['welcomeMovement'],
    });
    expect(liveRegion?.textContent?.length).toBeGreaterThan(0);

    // Unrelated rerender: sidebar collapse. No new completions → text cleared.
    panel.element
      .querySelector<HTMLButtonElement>(
        '[data-testid="tutorial-sidebar-collapse"]'
      )
      ?.click();
    expect(liveRegion?.textContent).toBe('');

    // setStrings rerender must not replay the old announcement.
    panel.setStrings(getTutorialPanelStrings('en'));
    expect(liveRegion?.textContent).toBe('');

    panel.dispose();
  });

  it('does not announce pages already complete in the initial state', () => {
    const strings = getTutorialPanelStrings('en');
    const panel = createTutorialPanel({
      container: document.body,
      strings,
      state: {
        ...createDefaultTutorialState(),
        currentPageId: 'zoom',
        unlockedPageIds: ['welcomeMovement', 'zoom'],
        completedPageIds: ['welcomeMovement'],
      },
    });

    const liveRegion = panel.element.querySelector<HTMLElement>(
      '[data-testid="tutorial-status-live"]'
    );

    // The initial render must not announce 'welcomeMovement' even though it is complete.
    expect(liveRegion?.textContent).toBe('');

    // An unrelated rerender also must not announce it.
    panel.setStrings(getTutorialPanelStrings('en'));
    expect(liveRegion?.textContent).toBe('');

    panel.dispose();
  });
});
