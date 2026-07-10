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
  it('creates default version, current page, and first unlock', () => {
    const state = createDefaultTutorialState();
    expect(state.version).toBe(1);
    expect(state.currentPageId).toBe('welcomeMovement');
    expect(state.unlockedPageIds).toEqual(['welcomeMovement']);
  });

  it('sanitizes page ids, duplicates, and invalid current pages', () => {
    const state = sanitizeTutorialState({
      version: 1,
      currentPageId: 'missing',
      unlockedPageIds: ['zoom', 'zoom', 'bad'],
      completedPageIds: ['zoom', 'bad', 'zoom'],
      progress: {},
    });
    expect(state.currentPageId).toBe('welcomeMovement');
    expect(state.unlockedPageIds).toEqual(['welcomeMovement', 'zoom']);
    expect(state.completedPageIds).toEqual(['zoom']);
  });

  it('falls back when current page is locked', () => {
    const state = sanitizeTutorialState({
      version: 1,
      currentPageId: 'zoom',
      unlockedPageIds: [],
      completedPageIds: [],
      progress: {},
    });
    expect(state.currentPageId).toBe('welcomeMovement');
    expect(state.unlockedPageIds).toEqual(['welcomeMovement']);
  });

  it('refuses locked pages and accepts unlocked pages', () => {
    const state = createDefaultTutorialState();
    expect(setCurrentTutorialPage(state, 'zoom').currentPageId).toBe(
      'welcomeMovement'
    );
    const unlocked = unlockTutorialPage(state, 'zoom');
    expect(setCurrentTutorialPage(unlocked, 'zoom').currentPageId).toBe('zoom');
  });

  it('unlocks and completion are monotonic', () => {
    const unlocked = unlockTutorialPage(createDefaultTutorialState(), 'zoom');
    expect(unlockTutorialPage(unlocked, 'zoom').unlockedPageIds).toEqual([
      'welcomeMovement',
      'zoom',
    ]);
    const completed = markTutorialPageCompleted(unlocked, 'welcomeMovement');
    expect(
      markTutorialPageCompleted(completed, 'welcomeMovement').completedPageIds
    ).toEqual(['welcomeMovement']);
  });

  it('does not derive future unlocks or complete by default', () => {
    const state = createDefaultTutorialState();
    expect(deriveTutorialUnlocks(state).unlockedPageIds).toEqual([
      'welcomeMovement',
    ]);
    expect(isTutorialComplete(state)).toBe(false);
  });

  it('sanitizes placeholder progress and serializes without localized strings', () => {
    const state = sanitizeTutorialState({
      version: 1,
      currentPageId: 'welcomeMovement',
      unlockedPageIds: ['welcomeMovement'],
      completedPageIds: [],
      progress: {
        movement: {
          forwardSeconds: 1.5,
          leftSeconds: -1,
          forwardComplete: true,
        },
        zoom: { zoomInComplete: true, zoomOutComplete: 'yes' },
        pois: { visitedPoiIds: ['a', 'a', 1], visitedCountGoal: 99 },
        gitshelves: { completed: true },
      },
    });
    expect(state.progress.movement.forwardSeconds).toBe(1.5);
    expect(state.progress.movement.leftSeconds).toBe(0);
    expect(state.progress.zoom.zoomOutComplete).toBe(false);
    expect(state.progress.pois.visitedPoiIds).toEqual(['a']);
    expect(state.progress.pois.visitedCountGoal).toBe(3);
    expect(JSON.stringify(serializeTutorialProgress(state))).not.toContain(
      'Welcome'
    );
  });

  it('defaults malformed progress objects', () => {
    expect(
      sanitizeTutorialState({ version: 1, progress: null }).progress
    ).toEqual(createDefaultTutorialState().progress);
  });
});
