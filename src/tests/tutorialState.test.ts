import { describe, expect, it } from 'vitest';

import {
  GITSHELVES_POI_ID,
  createDefaultTutorialState,
  deriveTutorialUnlocks,
  isTutorialComplete,
  markTutorialPageCompleted,
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
  it('tracks movement directions, deadzone, blocked movement, and unlocks zoom', () => {
    let state = createDefaultTutorialState();
    state = recordMovementProgress(state, {
      right: 0,
      forward: 1,
      deltaSeconds: 0.24,
      moved: true,
    });
    expect(state.progress.movement.forwardComplete).toBe(false);
    state = recordMovementProgress(state, {
      right: 0,
      forward: 1,
      deltaSeconds: 0.01,
      moved: true,
    });
    expect(state.progress.movement.forwardComplete).toBe(true);
    state = recordMovementProgress(state, {
      right: -1,
      forward: 0,
      deltaSeconds: 0.25,
      moved: true,
    });
    state = recordMovementProgress(state, {
      right: 1,
      forward: -1,
      deltaSeconds: 0.25,
      moved: true,
    });
    expect(state.progress.movement.leftComplete).toBe(true);
    expect(state.progress.movement.rightComplete).toBe(true);
    expect(state.progress.movement.backwardComplete).toBe(true);
    expect(state.completedPageIds).toContain('welcomeMovement');
    expect(state.unlockedPageIds).toContain('zoom');

    const afterComplete = recordMovementProgress(state, {
      right: 0.1,
      forward: 0.1,
      deltaSeconds: 1,
      moved: true,
    });
    expect(afterComplete.progress.movement.forwardSeconds).toBe(
      state.progress.movement.forwardSeconds
    );
    const blocked = recordMovementProgress(createDefaultTutorialState(), {
      right: 1,
      forward: 0,
      deltaSeconds: 1,
      moved: false,
    });
    expect(blocked.progress.movement.rightComplete).toBe(false);
  });

  it('tracks zoom thresholds and unlocks POI visits in either order', () => {
    let state = createDefaultTutorialState();
    state = recordZoomProgress(state, {
      currentZoomTarget: 11.87,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomInComplete).toBe(false);
    state = recordZoomProgress(state, {
      currentZoomTarget: 11.9,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomInComplete).toBe(true);
    state = recordZoomProgress(state, {
      currentZoom: 0.77,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomOutComplete).toBe(false);
    state = recordZoomProgress(state, {
      currentZoom: 0.76,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomOutComplete).toBe(true);
    expect(state.completedPageIds).toContain('zoom');
    expect(state.unlockedPageIds).toContain('visitPois');
  });

  it('tracks unique POIs and Gitshelves by stable id', () => {
    let state = recordVisitedPois(createDefaultTutorialState(), ['a', 'a']);
    expect(state.progress.pois.visitedPoiIds).toEqual(['a']);
    expect(state.completedPageIds).not.toContain('visitPois');
    state = recordVisitedPois(state, ['a', 'b', 'c']);
    expect(state.completedPageIds).toContain('visitPois');
    expect(state.unlockedPageIds).toContain('findGitshelves');
    expect(state.progress.gitshelves.completed).toBe(false);
    state = recordVisitedPois(state, ['a', 'b', 'c', GITSHELVES_POI_ID]);
    expect(state.progress.gitshelves.completed).toBe(true);
    expect(state.completedPageIds).toContain('findGitshelves');
  });
});
