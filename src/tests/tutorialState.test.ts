import { describe, expect, it } from 'vitest';

import {
  createDefaultTutorialState,
  deriveTutorialUnlocks,
  isTutorialComplete,
  markTutorialPageCompleted,
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
