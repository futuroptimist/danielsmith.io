import { describe, expect, it } from 'vitest';

import {
  createDefaultTutorialState,
  deriveTutorialUnlocks,
  isTutorialComplete,
  markTutorialPageCompleted,
  sanitizeTutorialState,
  serializeTutorialProgress,
  setCurrentTutorialPage,
  unlockTutorialPage,
} from '../systems/tutorial/tutorialState';

describe('tutorial state', () => {
  it('creates the default locked tutorial state', () => {
    const state = createDefaultTutorialState();
    expect(state.version).toBe(1);
    expect(state.currentPageId).toBe('welcomeMovement');
    expect(state.unlockedPageIds).toEqual(['welcomeMovement']);
  });

  it('sanitizes page ids, duplicates, missing first page, and invalid current pages', () => {
    expect(
      sanitizeTutorialState({
        version: 1,
        currentPageId: 'missing',
        unlockedPageIds: ['zoom', 'zoom', 'bad'],
        completedPageIds: ['zoom', 'bad', 'zoom'],
      })
    ).toMatchObject({
      currentPageId: 'welcomeMovement',
      unlockedPageIds: ['welcomeMovement', 'zoom'],
      completedPageIds: ['zoom'],
    });
  });

  it('falls back when current page is locked', () => {
    expect(
      sanitizeTutorialState({
        version: 1,
        currentPageId: 'zoom',
        unlockedPageIds: ['welcomeMovement'],
      }).currentPageId
    ).toBe('welcomeMovement');
  });

  it('only selects unlocked pages', () => {
    const state = createDefaultTutorialState();
    expect(setCurrentTutorialPage(state, 'zoom').currentPageId).toBe(
      'welcomeMovement'
    );
    const unlocked = unlockTutorialPage(state, 'zoom');
    expect(setCurrentTutorialPage(unlocked, 'zoom').currentPageId).toBe('zoom');
  });

  it('keeps unlocks and completions monotonic', () => {
    const state = createDefaultTutorialState();
    expect(
      unlockTutorialPage(unlockTutorialPage(state, 'zoom'), 'zoom')
        .unlockedPageIds
    ).toEqual(['welcomeMovement', 'zoom']);
    expect(
      markTutorialPageCompleted(
        markTutorialPageCompleted(state, 'zoom'),
        'zoom'
      ).completedPageIds
    ).toEqual(['zoom']);
  });

  it('does not derive future unlocks yet and is incomplete by default', () => {
    const state = markTutorialPageCompleted(
      createDefaultTutorialState(),
      'welcomeMovement'
    );
    expect(deriveTutorialUnlocks(state).unlockedPageIds).toEqual([
      'welcomeMovement',
    ]);
    expect(isTutorialComplete(createDefaultTutorialState())).toBe(false);
  });

  it('sanitizes placeholder progress and serializes without localized strings', () => {
    const state = sanitizeTutorialState({
      version: 1,
      currentPageId: 'welcomeMovement',
      unlockedPageIds: ['welcomeMovement'],
      progress: {
        movement: { forwardSeconds: 3, leftSeconds: -2, forwardComplete: true },
        zoom: { zoomInComplete: 'yes', zoomOutComplete: true },
        pois: { visitedPoiIds: ['a', 'a', 1], visitedCountGoal: 99 },
        gitshelves: { completed: true },
      },
    });
    expect(state.progress.movement.forwardSeconds).toBe(3);
    expect(state.progress.movement.leftSeconds).toBe(0);
    expect(state.progress.movement.forwardComplete).toBe(true);
    expect(state.progress.zoom.zoomInComplete).toBe(false);
    expect(state.progress.zoom.zoomOutComplete).toBe(true);
    expect(state.progress.pois).toEqual({
      visitedPoiIds: ['a'],
      visitedCountGoal: 3,
    });
    expect(state.progress.gitshelves.completed).toBe(true);
    expect(JSON.stringify(serializeTutorialProgress(state))).not.toContain(
      'Welcome'
    );
  });

  it('defaults malformed nested progress', () => {
    const state = sanitizeTutorialState({
      version: 1,
      currentPageId: 'welcomeMovement',
      unlockedPageIds: ['welcomeMovement'],
      progress: { movement: null, zoom: [], pois: 'bad', gitshelves: 1 },
    });
    expect(state.progress).toEqual(createDefaultTutorialState().progress);
  });
});
