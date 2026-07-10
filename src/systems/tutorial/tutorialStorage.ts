import {
  createDefaultTutorialState,
  sanitizeTutorialState,
  serializeTutorialProgress,
  type TutorialState,
} from './tutorialState';

export const TUTORIAL_PROGRESS_STORAGE_KEY =
  'danielsmith.io:tutorial:v1:progress';
export const TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY =
  'danielsmith.io:tutorial:v1:showOnStartup';

type TutorialStorage = Pick<Storage, 'getItem' | 'setItem'> | null | undefined;

export const readTutorialState = (storage: TutorialStorage): TutorialState => {
  if (!storage) return createDefaultTutorialState();
  try {
    const raw = storage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    if (!raw) return createDefaultTutorialState();
    return sanitizeTutorialState(JSON.parse(raw));
  } catch {
    return createDefaultTutorialState();
  }
};

export const writeTutorialState = (
  storage: TutorialStorage,
  state: TutorialState
): void => {
  if (!storage) return;
  try {
    storage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify(serializeTutorialProgress(state))
    );
  } catch {
    // Storage may be disabled or full; Tutorial remains usable in memory.
  }
};

export const readTutorialShowOnStartup = (
  storage: TutorialStorage
): boolean => {
  if (!storage) return true;
  try {
    const raw = storage.getItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return true;
  } catch {
    return true;
  }
};

export const writeTutorialShowOnStartup = (
  storage: TutorialStorage,
  value: boolean
): void => {
  if (!storage) return;
  try {
    storage.setItem(
      TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY,
      value ? 'true' : 'false'
    );
  } catch {
    // Storage may be disabled or full; Tutorial remains usable in memory.
  }
};

export const createTutorialStorageAdapter = (storage: TutorialStorage) => ({
  readState: () => readTutorialState(storage),
  writeState: (state: TutorialState) => writeTutorialState(storage, state),
  readShowOnStartup: () => readTutorialShowOnStartup(storage),
  writeShowOnStartup: (value: boolean) =>
    writeTutorialShowOnStartup(storage, value),
});
