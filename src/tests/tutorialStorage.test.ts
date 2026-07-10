import { describe, expect, it } from 'vitest';

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
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('tutorial storage', () => {
  it('reads default progress for missing, corrupt, and malformed payloads', () => {
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
        currentPageId: 'bad',
        unlockedPageIds: ['welcomeMovement', 'bad'],
      })
    );
    expect(readTutorialState(storage).unlockedPageIds).toEqual([
      'welcomeMovement',
    ]);
    writeTutorialState(
      storage,
      unlockTutorialPage(createDefaultTutorialState(), 'zoom')
    );
    expect(
      JSON.parse(storage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY) ?? '')
    ).toMatchObject({ version: 1 });
  });

  it('persists show on startup separately and safely', () => {
    const storage = new MemoryStorage();
    expect(readTutorialShowOnStartup(storage)).toBe(true);
    storage.setItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY, 'nope');
    expect(readTutorialShowOnStartup(storage)).toBe(true);
    writeTutorialShowOnStartup(storage, false);
    expect(readTutorialShowOnStartup(storage)).toBe(false);
    writeTutorialShowOnStartup(storage, true);
    expect(readTutorialShowOnStartup(storage)).toBe(true);
    expect(storage.values.has(TUTORIAL_PROGRESS_STORAGE_KEY)).toBe(false);
  });

  it('does not throw when storage throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('no');
      },
      setItem: () => {
        throw new Error('no');
      },
    };
    expect(() => readTutorialState(throwing)).not.toThrow();
    expect(() =>
      writeTutorialState(throwing, createDefaultTutorialState())
    ).not.toThrow();
    expect(() => readTutorialShowOnStartup(throwing)).not.toThrow();
    expect(() => writeTutorialShowOnStartup(throwing, false)).not.toThrow();
  });
});
