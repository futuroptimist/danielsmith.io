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

describe('tutorial storage', () => {
  it('reads default progress for missing, corrupt, or future values', () => {
    expect(readTutorialState(localStorage).currentPageId).toBe(
      'welcomeMovement'
    );
    localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, '{');
    expect(readTutorialState(localStorage).currentPageId).toBe(
      'welcomeMovement'
    );
    localStorage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 2 })
    );
    expect(readTutorialState(localStorage).currentPageId).toBe(
      'welcomeMovement'
    );
  });

  it('sanitizes unknown page ids and writes parseable JSON', () => {
    localStorage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, unlockedPageIds: ['bad', 'zoom'] })
    );
    expect(readTutorialState(localStorage).unlockedPageIds).toEqual([
      'welcomeMovement',
      'zoom',
    ]);
    writeTutorialState(
      localStorage,
      unlockTutorialPage(readTutorialState(localStorage), 'zoom')
    );
    expect(
      JSON.parse(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY) ?? '{}')
    ).toMatchObject({
      version: 1,
    });
  });

  it('persists showOnStartup separately and defaults invalid values to true', () => {
    expect(readTutorialShowOnStartup(localStorage)).toBe(true);
    localStorage.setItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY, 'no');
    expect(readTutorialShowOnStartup(localStorage)).toBe(true);
    writeTutorialShowOnStartup(localStorage, false);
    expect(readTutorialShowOnStartup(localStorage)).toBe(false);
    writeTutorialShowOnStartup(localStorage, true);
    expect(readTutorialShowOnStartup(localStorage)).toBe(true);
    expect(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)).not.toBe(
      'true'
    );
  });

  it('does not throw when storage fails', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    } as unknown as Storage;
    expect(() => readTutorialState(storage)).not.toThrow();
    expect(() =>
      writeTutorialState(storage, readTutorialState(null))
    ).not.toThrow();
    expect(() => readTutorialShowOnStartup(storage)).not.toThrow();
    expect(() => writeTutorialShowOnStartup(storage, false)).not.toThrow();
  });
});
