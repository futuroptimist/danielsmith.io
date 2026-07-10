import { describe, expect, it } from 'vitest';

import {
  GITSHELVES_POI_ID,
  createDefaultTutorialState,
  deriveTutorialUnlocks,
  isTutorialComplete,
  markTutorialPageCompleted,
  recordGitshelvesVisited,
  recordMovementDirectionProgress,
  recordMovementProgress,
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
    expect(state.completedPageIds).toEqual([
      'welcomeMovement',
      'findGitshelves',
    ]);
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

  it('keeps unlock and completion monotonic without derived unlocks yet', () => {
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

  it('serializes without localized strings', () => {
    expect(JSON.stringify(createDefaultTutorialState())).not.toMatch(
      /Welcome|Tutorial/
    );
  });
});

describe('tutorial action tracking', () => {
  it('completes each movement direction after 0.25 seconds but not before', () => {
    let state = createDefaultTutorialState();
    state = recordMovementDirectionProgress(state, 'forward', 0.24);
    expect(state.progress.movement.forwardComplete).toBe(false);
    state = recordMovementDirectionProgress(state, 'forward', 0.01);
    state = recordMovementDirectionProgress(state, 'left', 0.25);
    state = recordMovementDirectionProgress(state, 'backward', 0.25);
    state = recordMovementDirectionProgress(state, 'right', 0.25);
    expect(state.progress.movement.forwardComplete).toBe(true);
    expect(state.progress.movement.leftComplete).toBe(true);
    expect(state.progress.movement.backwardComplete).toBe(true);
    expect(state.progress.movement.rightComplete).toBe(true);
    expect(state.completedPageIds).toContain('welcomeMovement');
    expect(state.unlockedPageIds).toContain('zoom');
  });

  it('counts diagonal movement above deadzone and ignores drift or blocked movement', () => {
    let state = createDefaultTutorialState();
    state = recordMovementProgress(state, {
      forward: 0.19,
      left: 0,
      backward: 0,
      right: 0,
      deltaSeconds: 0.25,
      moved: true,
    });
    expect(state.progress.movement.forwardComplete).toBe(false);
    state = recordMovementProgress(state, {
      forward: 1,
      left: 1,
      backward: 0,
      right: 0,
      deltaSeconds: 0.25,
      moved: false,
    });
    expect(state.progress.movement.leftComplete).toBe(false);
    state = recordMovementProgress(state, {
      forward: 1,
      left: 1,
      backward: 0,
      right: 0,
      deltaSeconds: 0.25,
      moved: true,
    });
    expect(state.progress.movement.forwardComplete).toBe(true);
    expect(state.progress.movement.leftComplete).toBe(true);
  });

  it('tracks zoom thresholds in either order', () => {
    let state = createDefaultTutorialState();
    state = recordZoomProgress(state, {
      currentZoom: 11.87,
      currentZoomTarget: 11.87,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomInComplete).toBe(false);
    state = recordZoomProgress(state, {
      currentZoom: 0.7,
      currentZoomTarget: 0.7,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomOutComplete).toBe(true);
    state = recordZoomProgress(state, {
      currentZoom: 11.9,
      currentZoomTarget: 11.9,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomInComplete).toBe(true);
    expect(state.completedPageIds).toContain('zoom');
    expect(state.unlockedPageIds).toContain('visitPois');
  });

  it('counts unique POIs, unlocks Gitshelves, and uses the stable id', () => {
    let state = createDefaultTutorialState();
    state = recordVisitedPois(state, ['a', 'a', 'b']);
    expect(state.progress.pois.visitedPoiIds).toEqual(['a', 'b']);
    expect(state.completedPageIds).not.toContain('visitPois');
    state = recordVisitedPois(state, ['c']);
    expect(state.completedPageIds).toContain('visitPois');
    expect(state.unlockedPageIds).toContain('findGitshelves');
    state = recordVisitedPois(state, ['localized Gitshelves title']);
    expect(state.progress.gitshelves.completed).toBe(false);
    state = recordGitshelvesVisited(state);
    expect(state.progress.pois.visitedPoiIds).toContain(GITSHELVES_POI_ID);
    expect(state.completedPageIds).toContain('findGitshelves');
  });
});
