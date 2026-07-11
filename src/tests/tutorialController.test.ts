import { describe, expect, it, vi } from 'vitest';

import { createTutorialController } from '../systems/tutorial/tutorialController';
import {
  setCurrentTutorialPage,
  unlockTutorialPage,
} from '../systems/tutorial/tutorialState';
import { TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY } from '../systems/tutorial/tutorialStorage';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  values = new Map<string, string>();
  setCalls: string[] = [];
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.setCalls.push(key);
    this.values.set(key, value);
  }
}

describe('tutorial controller', () => {
  it('defaults auto-startup on and dismisses without changing the preference', () => {
    const storage = new MemoryStorage();
    const onDismiss = vi.fn();
    const controller = createTutorialController({ storage, onDismiss });

    expect(controller.getShowOnStartup()).toBe(true);
    controller.dismiss();

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(storage.getItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY)).toBeNull();
  });

  it('persists show-on-startup changes and refuses locked next pages', () => {
    const storage = new MemoryStorage();
    const controller = createTutorialController({ storage });

    controller.setShowOnStartup(false);
    expect(controller.getShowOnStartup()).toBe(false);
    expect(storage.getItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY)).toBe('false');
    controller.nextPage();
    expect(controller.getState().currentPageId).toBe('welcomeMovement');
  });

  it('previous navigation skips locked gaps to the nearest unlocked page', () => {
    const storage = new MemoryStorage();
    let state = createTutorialController({ storage }).getState();
    state = unlockTutorialPage(state, 'visitPois');
    state = setCurrentTutorialPage(state, 'visitPois');
    storage.setItem(
      'danielsmith.io:tutorial:v1:progress',
      JSON.stringify(state)
    );
    const controller = createTutorialController({ storage });

    expect(controller.getState().currentPageId).toBe('visitPois');
    expect(controller.getState().unlockedPageIds).toContain('welcomeMovement');
    expect(controller.getState().unlockedPageIds).not.toContain('zoom');

    controller.previousPage();

    expect(controller.getState().currentPageId).toBe('welcomeMovement');
  });

  it('skips panel rerenders when progress snapshots do not change state', () => {
    const storage = new MemoryStorage();
    const controller = createTutorialController({ storage });
    const panel = {
      element: document.createElement('aside'),
      open: vi.fn(),
      close: vi.fn(),
      toggle: vi.fn(),
      isOpen: vi.fn(() => false),
      setStrings: vi.fn(),
      setState: vi.fn(),
      setShowOnStartup: vi.fn(),
      dispose: vi.fn(),
    };
    controller.setPanel(panel);
    panel.setState.mockClear();

    controller.recordMovementProgress({
      right: 0,
      forward: 0.1,
      deltaSeconds: 1,
      moved: true,
    });
    controller.recordZoomProgress({
      currentZoom: 6,
      minZoom: 0.65,
      maxZoom: 12,
    });
    controller.syncVisitedPois([]);

    expect(panel.setState).not.toHaveBeenCalled();

    controller.recordMovementProgress({
      right: 0,
      forward: 1,
      deltaSeconds: 0.25,
      moved: true,
    });

    expect(panel.setState).toHaveBeenCalledTimes(1);
  });

  it('keeps sub-bucket movement in memory without writing every frame', () => {
    const storage = new MemoryStorage();
    const controller = createTutorialController({ storage });

    controller.recordMovementProgress({
      right: 0,
      forward: 1,
      deltaSeconds: 0.01,
      moved: true,
    });
    controller.recordMovementProgress({
      right: 0,
      forward: 1,
      deltaSeconds: 0.01,
      moved: true,
    });

    expect(controller.getState().progress.movement.forwardSeconds).toBe(0.02);
    expect(storage.setCalls).not.toContain(
      'danielsmith.io:tutorial:v1:progress'
    );

    controller.recordMovementProgress({
      right: 0,
      forward: 1,
      deltaSeconds: 0.03,
      moved: true,
    });

    expect(storage.setCalls).toContain('danielsmith.io:tutorial:v1:progress');
  });

  it('persists movement completion immediately and records progress while closed', () => {
    const storage = new MemoryStorage();
    const controller = createTutorialController({ storage });

    controller.recordMovementProgress({
      right: 0,
      forward: 1,
      deltaSeconds: 0.25,
      moved: true,
    });

    expect(controller.getState().progress.movement.forwardComplete).toBe(true);
    expect(storage.getItem('danielsmith.io:tutorial:v1:progress')).toContain(
      'forwardComplete'
    );
  });

  it('manual selection works when a stored page is unlocked', () => {
    const storage = new MemoryStorage();
    const state = unlockTutorialPage(
      createTutorialController({ storage }).getState(),
      'zoom'
    );
    storage.setItem(
      'danielsmith.io:tutorial:v1:progress',
      JSON.stringify(state)
    );
    const controller = createTutorialController({ storage });

    controller.selectPage('zoom');

    expect(controller.getState().currentPageId).toBe('zoom');
  });
});
