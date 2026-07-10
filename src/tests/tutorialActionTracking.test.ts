import { describe, expect, it } from 'vitest';

import {
  GITSHELVES_POI_ID,
  createDefaultTutorialState,
  recordGitshelvesVisited,
  recordMovementInputProgress,
  recordVisitedPois,
  recordZoomProgress,
  sanitizeTutorialState,
} from '../systems/tutorial/tutorialState';

describe('tutorial action tracking', () => {
  it.each([
    ['forward', { right: 0, forward: 1 }, 'forwardComplete'],
    ['left', { right: -1, forward: 0 }, 'leftComplete'],
    ['backward', { right: 0, forward: -1 }, 'backwardComplete'],
    ['right', { right: 1, forward: 0 }, 'rightComplete'],
  ] as const)('completes %s after 0.25 seconds', (_label, input, key) => {
    const state = recordMovementInputProgress(createDefaultTutorialState(), {
      ...input,
      moved: true,
      deltaSeconds: 0.25,
    });
    expect(state.progress.movement[key]).toBe(true);
  });

  it('does not complete movement at 0.24 seconds, below deadzone, or while blocked', () => {
    let state = recordMovementInputProgress(createDefaultTutorialState(), {
      right: 0,
      forward: 1,
      moved: true,
      deltaSeconds: 0.24,
    });
    expect(state.progress.movement.forwardComplete).toBe(false);
    state = recordMovementInputProgress(state, {
      right: 0.1,
      forward: 0,
      moved: true,
      deltaSeconds: 1,
    });
    expect(state.progress.movement.rightComplete).toBe(false);
    state = recordMovementInputProgress(state, {
      right: 1,
      forward: 0,
      moved: false,
      deltaSeconds: 1,
    });
    expect(state.progress.movement.rightComplete).toBe(false);
  });

  it('counts diagonal movement and unlocks zoom after all movement directions complete', () => {
    let state = recordMovementInputProgress(createDefaultTutorialState(), {
      right: 1,
      forward: 1,
      moved: true,
      deltaSeconds: 0.25,
    });
    expect(state.progress.movement.forwardComplete).toBe(true);
    expect(state.progress.movement.rightComplete).toBe(true);
    state = recordMovementInputProgress(state, {
      right: -1,
      forward: -1,
      moved: true,
      deltaSeconds: 0.25,
    });
    expect(state.progress.movement.leftComplete).toBe(true);
    expect(state.progress.movement.backwardComplete).toBe(true);
    expect(state.completedPageIds).toContain('welcomeMovement');
    expect(state.unlockedPageIds).toContain('zoom');
  });

  it('tracks zoom thresholds in either order and unlocks POI visits', () => {
    let state = recordZoomProgress(createDefaultTutorialState(), {
      targetZoom: 11.89,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomInComplete).toBe(true);
    state = recordZoomProgress(state, {
      currentZoom: 0.7,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomOutComplete).toBe(true);
    expect(state.completedPageIds).toContain('zoom');
    expect(state.unlockedPageIds).toContain('visitPois');
  });

  it('does not complete zoom just outside the one-percent threshold', () => {
    const state = recordZoomProgress(createDefaultTutorialState(), {
      currentZoom: 11.8,
      minZoom: 0.65,
      maxZoom: 12,
    });
    expect(state.progress.zoom.zoomInComplete).toBe(false);
  });

  it('tracks unique visited POIs and Gitshelves by stable id', () => {
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
    expect(state.progress.gitshelves.completed).toBe(false);
    state = recordVisitedPois(state, ['a', 'b', 'c', GITSHELVES_POI_ID]);
    expect(state.progress.gitshelves.completed).toBe(true);
    expect(state.completedPageIds).toContain('findGitshelves');
  });

  it('persists and sanitizes action progress', () => {
    const state = sanitizeTutorialState({
      version: 1,
      progress: {
        movement: { forwardSeconds: 0.3, forwardComplete: true },
        zoom: { zoomInComplete: true, zoomOutComplete: true },
        pois: { visitedPoiIds: ['x', 'x', GITSHELVES_POI_ID] },
        gitshelves: { completed: true },
      },
    });
    expect(state.progress.movement.forwardSeconds).toBe(0.3);
    expect(state.progress.pois.visitedPoiIds).toEqual(['x', GITSHELVES_POI_ID]);
    expect(
      recordGitshelvesVisited(createDefaultTutorialState()).progress.gitshelves
        .completed
    ).toBe(true);
  });
});
