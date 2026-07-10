import { describe, expect, it, vi } from 'vitest';

import { unlockTutorialPage } from '../systems/tutorial/tutorialState';
import {
  TUTORIAL_PROGRESS_STORAGE_KEY,
  TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY,
  readTutorialShowOnStartup,
  readTutorialState,
  writeTutorialShowOnStartup,
  writeTutorialState,
} from '../systems/tutorial/tutorialStorage';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('tutorial storage', () => {
  it('reads default progress for missing, corrupt, or malformed versions', () => {
    const storage = new MemoryStorage();
    expect(readTutorialState(storage).currentPageId).toBe('welcomeMovement');
    storage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, '{');
    expect(readTutorialState(storage).currentPageId).toBe('welcomeMovement');
    storage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 2 })
    );
    expect(readTutorialState(storage).currentPageId).toBe('welcomeMovement');
  });

  it('sanitizes unknown page ids and writes parseable progress JSON separately', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, unlockedPageIds: ['bad', 'zoom'] })
    );
    expect(readTutorialState(storage).unlockedPageIds).toEqual([
      'welcomeMovement',
      'zoom',
    ]);
    writeTutorialState(
      storage,
      unlockTutorialPage(readTutorialState(storage), 'visitPois')
    );
    expect(
      JSON.parse(storage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY) ?? '{}').version
    ).toBe(1);
    expect(storage.getItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY)).toBeNull();
  });

  it('defaults showOnStartup to true and persists booleans', () => {
    const storage = new MemoryStorage();
    expect(readTutorialShowOnStartup(storage)).toBe(true);
    storage.setItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY, 'invalid');
    expect(readTutorialShowOnStartup(storage)).toBe(true);
    writeTutorialShowOnStartup(storage, false);
    expect(readTutorialShowOnStartup(storage)).toBe(false);
    writeTutorialShowOnStartup(storage, true);
    expect(readTutorialShowOnStartup(storage)).toBe(true);
  });

  it('swallows storage exceptions', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    };
    expect(() => readTutorialState(storage)).not.toThrow();
    expect(() => readTutorialShowOnStartup(storage)).not.toThrow();
    expect(() =>
      writeTutorialState(storage, readTutorialState(null))
    ).not.toThrow();
    expect(() => writeTutorialShowOnStartup(storage, false)).not.toThrow();
  });
});
