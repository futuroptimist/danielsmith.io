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
  it('creates the default locked state', () => {
    const state = createDefaultTutorialState();
    expect(state.version).toBe(1);
    expect(state.currentPageId).toBe('welcomeMovement');
    expect(state.unlockedPageIds).toEqual(['welcomeMovement']);
    expect(isTutorialComplete(state)).toBe(false);
  });

  it('sanitizes page ids, duplicates, and locked current pages', () => {
    const state = sanitizeTutorialState({
      version: 1,
      currentPageId: 'zoom',
      unlockedPageIds: ['visitPois', 'bogus', 'visitPois'],
      completedPageIds: ['zoom', 'bogus', 'zoom'],
      progress: {},
    });
    expect(state.unlockedPageIds).toEqual(['welcomeMovement', 'visitPois']);
    expect(state.completedPageIds).toEqual(['zoom']);
    expect(state.currentPageId).toBe('welcomeMovement');
  });

  it('falls back to welcomeMovement for invalid current pages', () => {
    expect(
      sanitizeTutorialState({
        version: 1,
        currentPageId: 'missing',
        unlockedPageIds: [],
        completedPageIds: [],
        progress: {},
      }).currentPageId
    ).toBe('welcomeMovement');
  });

  it('refuses locked pages and accepts unlocked pages', () => {
    const locked = createDefaultTutorialState();
    expect(setCurrentTutorialPage(locked, 'zoom').currentPageId).toBe(
      'welcomeMovement'
    );
    const unlocked = unlockTutorialPage(locked, 'zoom');
    expect(setCurrentTutorialPage(unlocked, 'zoom').currentPageId).toBe('zoom');
  });

  it('keeps unlocks and completion monotonic', () => {
    const state = unlockTutorialPage(createDefaultTutorialState(), 'zoom');
    expect(unlockTutorialPage(state, 'zoom').unlockedPageIds).toEqual([
      'welcomeMovement',
      'zoom',
    ]);
    const completed = markTutorialPageCompleted(state, 'welcomeMovement');
    expect(
      markTutorialPageCompleted(completed, 'welcomeMovement').completedPageIds
    ).toEqual(['welcomeMovement']);
  });

  it('does not derive future unlocks before gameplay tracking exists', () => {
    const completed = markTutorialPageCompleted(
      createDefaultTutorialState(),
      'welcomeMovement'
    );
    expect(deriveTutorialUnlocks(completed).unlockedPageIds).toEqual([
      'welcomeMovement',
    ]);
  });

  it('sanitizes progress placeholders safely', () => {
    const state = sanitizeTutorialState({
      version: 1,
      currentPageId: 'welcomeMovement',
      unlockedPageIds: ['welcomeMovement'],
      completedPageIds: [],
      progress: {
        movement: {
          forwardSeconds: 2,
          leftSeconds: -1,
          backwardSeconds: Number.NaN,
          rightSeconds: 'bad',
          forwardComplete: true,
          leftComplete: 'yes',
          backwardComplete: false,
          rightComplete: null,
        },
        zoom: { zoomInComplete: true, zoomOutComplete: 'no' },
        pois: { visitedPoiIds: ['a', 'a', 2], visitedCountGoal: 99 },
        gitshelves: { completed: true },
      },
    });
    expect(state.progress.movement.forwardSeconds).toBe(2);
    expect(state.progress.movement.leftSeconds).toBe(0);
    expect(state.progress.zoom.zoomOutComplete).toBe(false);
    expect(state.progress.pois).toEqual({
      visitedPoiIds: ['a'],
      visitedCountGoal: 3,
    });
    expect(state.progress.gitshelves.completed).toBe(true);
  });

  it('sanitizes malformed progress and serializes without localized strings', () => {
    const state = sanitizeTutorialState({ version: 1, progress: 'bad' });
    const serialized = JSON.stringify(serializeTutorialProgress(state));
    expect(state.progress).toEqual(createDefaultTutorialState().progress);
    expect(serialized).not.toMatch(/Tutorial|Welcome|Locked|Unlocked/);
  });
});
