import { describe, expect, it } from 'vitest';

import { getTutorialPanelStrings } from '../assets/i18n';
import {
  createDefaultTutorialState,
  unlockTutorialPage,
} from '../systems/tutorial/tutorialState';
import { createTutorialPanel } from '../ui/hud/tutorialPanel';

describe('createTutorialPanel', () => {
  it('renders the shell zones and localized tutorial controls', () => {
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
    expect(panel.element.textContent).toContain('interactive portfolio');
    expect(panel.element.textContent).toContain('W');
    expect(panel.element.textContent).toContain('A');
    expect(panel.element.textContent).toContain('S');
    expect(panel.element.textContent).toContain('D');
    expect(
      panel.element.querySelector('[data-testid="tutorial-text-mode"]')
    ).not.toBeNull();
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

it('renders live progress chips for zoom, POIs, and Gitshelves', () => {
  const strings = getTutorialPanelStrings('en');
  const base = createDefaultTutorialState();
  const panel = createTutorialPanel({
    container: document.body,
    strings,
    state: {
      ...base,
      currentPageId: 'visitPois',
      unlockedPageIds: ['welcomeMovement', 'zoom', 'visitPois'],
      progress: {
        ...base.progress,
        pois: { ...base.progress.pois, visitedPoiIds: ['a', 'b'] },
      },
    },
  });
  panel.open();
  expect(panel.element.textContent).toContain('2/3 POIs');

  panel.setState({
    ...base,
    currentPageId: 'zoom',
    unlockedPageIds: ['welcomeMovement', 'zoom'],
    progress: {
      ...base.progress,
      zoom: { zoomInComplete: true, zoomOutComplete: false },
    },
  });
  expect(panel.element.textContent).toContain('In ✓');
  expect(panel.element.textContent).toContain('Out');

  panel.setState({
    ...base,
    currentPageId: 'findGitshelves',
    unlockedPageIds: ['welcomeMovement', 'zoom', 'visitPois', 'findGitshelves'],
    progress: { ...base.progress, gitshelves: { completed: true } },
  });
  expect(panel.element.textContent).toContain('Gitshelves ✓');

  panel.dispose();
});

it('invokes the shared text-mode callback from the tutorial page', () => {
  let requested = 0;
  const panel = createTutorialPanel({
    container: document.body,
    strings: getTutorialPanelStrings('en'),
    state: createDefaultTutorialState(),
    onRequestTextMode: () => {
      requested += 1;
    },
  });
  panel.open();
  panel.element
    .querySelector<HTMLButtonElement>('[data-testid="tutorial-text-mode"]')
    ?.click();
  expect(requested).toBe(1);
  panel.dispose();
});
