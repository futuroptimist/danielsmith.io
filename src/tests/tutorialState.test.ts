import { describe, expect, it } from 'vitest';

import {
  GITSHELVES_POI_ID,
  createDefaultTutorialState,
  deriveTutorialUnlocks,
  isTutorialComplete,
  markTutorialPageCompleted,
  recordGitshelvesVisited,
  recordMovementDirectionProgress,
  recordMovementSample,
  recordVisitedPois,
  recordZoomProgress,
  sanitizeTutorialState,
  setCurrentTutorialPage,
  unlockTutorialPage,
} from '../systems/tutorial/tutorialState';

describe('tutorial state', () => {
  it('creates the default locked first-page state', () => {
    const state = createDefaultTutorialState();
    expect(state.version).toBe(1);
    expect(state.currentPageId).toBe('welcomeMovement');
    expect(state.unlockedPageIds).toEqual(['welcomeMovement']);
    expect(isTutorialComplete(state)).toBe(false);
  });

  it('sanitizes page ids, duplicates, current page, and progress placeholders', () => {
    const state = sanitizeTutorialState({
      version: 1,
      currentPageId: 'findGitshelves',
      unlockedPageIds: ['zoom', 'zoom', 'unknown'],
      completedPageIds: ['welcomeMovement', 'welcomeMovement', 'bad'],
      progress: {
        movement: { forwardSeconds: 1, leftSeconds: -1, forwardComplete: true },
        zoom: { zoomInComplete: true, zoomOutComplete: 'yes' },
        pois: { visitedPoiIds: ['a', 'a', 3], visitedCountGoal: 99 },
        gitshelves: { completed: true },
      },
    });
    expect(state.unlockedPageIds).toEqual(['welcomeMovement', 'zoom']);
    expect(state.completedPageIds).toEqual(['welcomeMovement']);
    expect(state.currentPageId).toBe('welcomeMovement');
    expect(state.progress.movement.forwardSeconds).toBe(1);
    expect(state.progress.movement.leftSeconds).toBe(0);
    expect(state.progress.zoom.zoomInComplete).toBe(true);
    expect(state.progress.zoom.zoomOutComplete).toBe(false);
    expect(state.progress.pois.visitedPoiIds).toEqual(['a']);
    expect(state.progress.pois.visitedCountGoal).toBe(3);
    expect(state.progress.gitshelves.completed).toBe(true);
  });

  it('falls back to defaults for malformed versions and malformed progress', () => {
    expect(sanitizeTutorialState({ version: 2 })).toEqual(
      createDefaultTutorialState()
    );
    expect(
      sanitizeTutorialState({ version: 1, progress: null }).progress
    ).toEqual(createDefaultTutorialState().progress);
  });

  it('refuses locked current pages and accepts unlocked pages', () => {
    const state = createDefaultTutorialState();
    expect(setCurrentTutorialPage(state, 'zoom').currentPageId).toBe(
      'welcomeMovement'
    );
    const unlocked = unlockTutorialPage(state, 'zoom');
    expect(setCurrentTutorialPage(unlocked, 'zoom').currentPageId).toBe('zoom');
  });

  it('keeps unlock and completion monotonic', () => {
    const unlocked = unlockTutorialPage(createDefaultTutorialState(), 'zoom');
    expect(unlockTutorialPage(unlocked, 'zoom').unlockedPageIds).toEqual([
      'welcomeMovement',
      'zoom',
    ]);
    const completed = markTutorialPageCompleted(unlocked, 'welcomeMovement');
    expect(
      markTutorialPageCompleted(completed, 'welcomeMovement').completedPageIds
    ).toEqual(['welcomeMovement']);
    expect(deriveTutorialUnlocks(completed).unlockedPageIds).toEqual([
      'welcomeMovement',
      'zoom',
    ]);
  });

  it.each(['forward', 'left', 'backward', 'right'] as const)(
    '%s movement completes after 0.25 seconds',
    (direction) => {
      const state = recordMovementDirectionProgress(
        createDefaultTutorialState(),
        direction,
        0.25
      );
      expect(state.progress.movement[`${direction}Complete`]).toBe(true);
    }
  );

  it('does not complete movement before the threshold', () => {
    const state = recordMovementDirectionProgress(
      createDefaultTutorialState(),
      'forward',
      0.24
    );
    expect(state.progress.movement.forwardComplete).toBe(false);
  });

  it('counts diagonal movement but ignores drift and blocked movement', () => {
    const diagonal = recordMovementSample(createDefaultTutorialState(), {
      right: 0.8,
      forward: 0.8,
      deltaSeconds: 0.25,
      moved: true,
    });
    expect(diagonal.progress.movement.forwardComplete).toBe(true);
    expect(diagonal.progress.movement.rightComplete).toBe(true);

    const drift = recordMovementSample(createDefaultTutorialState(), {
      right: 0.05,
      forward: 0.05,
      deltaSeconds: 0.25,
      moved: true,
    });
    expect(drift.progress.movement.forwardComplete).toBe(false);
    expect(drift.progress.movement.rightComplete).toBe(false);

    const blocked = recordMovementSample(createDefaultTutorialState(), {
      right: 1,
      forward: 1,
      deltaSeconds: 0.25,
      moved: false,
    });
    expect(blocked.progress.movement.forwardComplete).toBe(false);
    expect(blocked.progress.movement.rightComplete).toBe(false);
  });

  it('completes movement page and unlocks zoom after all four directions', () => {
    let state = createDefaultTutorialState();
    for (const direction of ['forward', 'left', 'backward', 'right'] as const) {
      state = recordMovementDirectionProgress(state, direction, 0.25);
    }
    expect(state.completedPageIds).toContain('welcomeMovement');
    expect(state.unlockedPageIds).toContain('zoom');
  });

  it('completes zoom thresholds in either order and unlocks POIs', () => {
    let state = recordZoomProgress(createDefaultTutorialState(), {
      zoom: 1,
      zoomTarget: 1.01,
      minZoom: 1,
      maxZoom: 2,
    });
    expect(state.progress.zoom.zoomOutComplete).toBe(true);
    expect(state.progress.zoom.zoomInComplete).toBe(false);
    state = recordZoomProgress(state, {
      zoom: 1,
      zoomTarget: 1.98,
      minZoom: 1,
      maxZoom: 2,
    });
    expect(state.progress.zoom.zoomInComplete).toBe(false);
    state = recordZoomProgress(state, {
      zoom: 1,
      zoomTarget: 1.99,
      minZoom: 1,
      maxZoom: 2,
    });
    expect(state.completedPageIds).toContain('zoom');
    expect(state.unlockedPageIds).toContain('visitPois');
  });

  it('tracks unique POIs, unlocks Gitshelves, and uses the stable id', () => {
    let state = recordVisitedPois(createDefaultTutorialState(), [
      'a',
      'a',
      'b',
    ]);
    expect(state.progress.pois.visitedPoiIds).toEqual(['a', 'b']);
    expect(state.completedPageIds).not.toContain('visitPois');
    state = recordVisitedPois(state, ['a', 'b', 'c']);
    expect(state.completedPageIds).toContain('visitPois');
    expect(state.unlockedPageIds).toContain('findGitshelves');
    state = recordVisitedPois(state, ['a', 'b', 'c', 'localized-title']);
    expect(state.progress.gitshelves.completed).toBe(false);
    state = recordVisitedPois(state, ['a', 'b', 'c', GITSHELVES_POI_ID]);
    expect(state.progress.gitshelves.completed).toBe(true);
    expect(state.completedPageIds).toContain('findGitshelves');
  });

  it('marks Gitshelves visited through its helper', () => {
    const state = recordGitshelvesVisited(createDefaultTutorialState());
    expect(state.progress.pois.visitedPoiIds).toContain(GITSHELVES_POI_ID);
    expect(state.progress.gitshelves.completed).toBe(true);
  });

  it('serializes without localized strings', () => {
    expect(JSON.stringify(createDefaultTutorialState())).not.toMatch(
      /Welcome|Tutorial/
    );
  });
});
