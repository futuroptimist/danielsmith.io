import { describe, expect, it, vi } from 'vitest';

import { createTutorialController } from '../systems/tutorial/tutorialController';
import {
  setCurrentTutorialPage,
  unlockTutorialPage,
} from '../systems/tutorial/tutorialState';
import { TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY } from '../systems/tutorial/tutorialStorage';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
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
