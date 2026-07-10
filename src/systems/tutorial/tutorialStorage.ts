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

export interface TutorialStorageAdapter {
  readState(): TutorialState;
  writeState(state: TutorialState): void;
  readShowOnStartup(): boolean;
  writeShowOnStartup(value: boolean): void;
}

export const readTutorialState = (storage?: Storage | null): TutorialState => {
  if (!storage) return createDefaultTutorialState();
  try {
    const value = storage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    if (!value) return createDefaultTutorialState();
    return sanitizeTutorialState(JSON.parse(value));
  } catch {
    return createDefaultTutorialState();
  }
};

export const writeTutorialState = (
  storage: Storage | null | undefined,
  state: TutorialState
): void => {
  if (!storage) return;
  try {
    storage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify(serializeTutorialProgress(state))
    );
  } catch {
    /* ignore storage write failures */
  }
};

export const readTutorialShowOnStartup = (
  storage?: Storage | null
): boolean => {
  if (!storage) return true;
  try {
    const value = storage.getItem(TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return true;
  } catch {
    return true;
  }
};

export const writeTutorialShowOnStartup = (
  storage: Storage | null | undefined,
  value: boolean
): void => {
  if (!storage) return;
  try {
    storage.setItem(
      TUTORIAL_SHOW_ON_STARTUP_STORAGE_KEY,
      value ? 'true' : 'false'
    );
  } catch {
    /* ignore storage write failures */
  }
};

export const createTutorialStorageAdapter = (
  storage?: Storage | null
): TutorialStorageAdapter => ({
  readState: () => readTutorialState(storage),
  writeState: (state) => writeTutorialState(storage, state),
  readShowOnStartup: () => readTutorialShowOnStartup(storage),
  writeShowOnStartup: (value) => writeTutorialShowOnStartup(storage, value),
});
