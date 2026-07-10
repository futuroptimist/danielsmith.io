import { describe, expect, it, vi } from 'vitest';

import {
  createDefaultTutorialState,
  unlockTutorialPage,
} from '../systems/tutorial/tutorialState';
import {
  TUTORIAL_PROGRESS_STORAGE_KEY,
  TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY,
  readTutorialShowOnStartup,
  readTutorialState,
  writeTutorialShowOnStartup,
  writeTutorialState,
} from '../systems/tutorial/tutorialStorage';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe('tutorial storage', () => {
  it('reads default progress for missing, corrupt, or malformed versions', () => {
    const storage = new MemoryStorage();
    expect(readTutorialState(storage)).toEqual(createDefaultTutorialState());
    storage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, '{');
    expect(readTutorialState(storage)).toEqual(createDefaultTutorialState());
    storage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 2 })
    );
    expect(readTutorialState(storage)).toEqual(createDefaultTutorialState());
  });

  it('sanitizes unknown page ids and writes parseable JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        currentPageId: 'zoom',
        unlockedPageIds: ['welcomeMovement', 'zoom', 'nope'],
        completedPageIds: ['nope'],
        progress: {},
      })
    );
    expect(readTutorialState(storage).unlockedPageIds).toEqual([
      'welcomeMovement',
      'zoom',
    ]);
    writeTutorialState(
      storage,
      unlockTutorialPage(createDefaultTutorialState(), 'zoom')
    );
    expect(
      JSON.parse(storage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY) ?? '')
    ).toMatchObject({
      version: 1,
      currentPageId: 'welcomeMovement',
    });
  });

  it('reads and writes show-on-startup separately', () => {
    const storage = new MemoryStorage();
    expect(readTutorialShowOnStartup(storage)).toBe(true);
    storage.setItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY, 'wat');
    expect(readTutorialShowOnStartup(storage)).toBe(true);
    writeTutorialShowOnStartup(storage, false);
    expect(readTutorialShowOnStartup(storage)).toBe(false);
    writeTutorialShowOnStartup(storage, true);
    expect(readTutorialShowOnStartup(storage)).toBe(true);
    expect(storage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('does not throw when storage fails', () => {
    const failing = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;
    expect(() => readTutorialState(failing)).not.toThrow();
    expect(() => readTutorialShowOnStartup(failing)).not.toThrow();
    expect(() =>
      writeTutorialState(failing, createDefaultTutorialState())
    ).not.toThrow();
    expect(() => writeTutorialShowOnStartup(failing, false)).not.toThrow();
  });
});
