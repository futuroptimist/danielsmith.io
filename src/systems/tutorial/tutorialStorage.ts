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
  try {
    const raw = storage?.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    return raw
      ? sanitizeTutorialState(JSON.parse(raw))
      : createDefaultTutorialState();
  } catch {
    return createDefaultTutorialState();
  }
};

export const writeTutorialState = (
  storage: TutorialStorage,
  state: TutorialState
): void => {
  try {
    storage?.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify(serializeTutorialProgress(state))
    );
  } catch {
    // Persistence is best-effort; gameplay should continue without storage.
  }
};

export const readTutorialShowOnStartup = (
  storage: TutorialStorage
): boolean => {
  try {
    const raw = storage?.getItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY);
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
  try {
    storage?.setItem(
      TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY,
      value ? 'true' : 'false'
    );
  } catch {
    // Persistence is best-effort; gameplay should continue without storage.
  }
};

export const createTutorialStorageAdapter = (storage: TutorialStorage) => ({
  readState: () => readTutorialState(storage),
  writeState: (state: TutorialState) => writeTutorialState(storage, state),
  readShowOnStartup: () => readTutorialShowOnStartup(storage),
  writeShowOnStartup: (value: boolean) =>
    writeTutorialShowOnStartup(storage, value),
});
