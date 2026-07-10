import {
  TUTORIAL_PAGE_ORDER,
  setCurrentTutorialPage,
  type TutorialPageId,
  type TutorialState,
} from './tutorialState';
import { createTutorialStorageAdapter } from './tutorialStorage';

export interface TutorialControllerStorage {
  readState(): TutorialState;
  writeState(state: TutorialState): void;
  readShowOnStartup(): boolean;
  writeShowOnStartup(value: boolean): void;
}

export interface TutorialControllerHandle {
  getState(): TutorialState;
  getShowOnStartup(): boolean;
  setOpenHandler(handler: (open: boolean) => void): void;
  subscribe(listener: () => void): () => void;
  selectPage(pageId: TutorialPageId): void;
  previous(): void;
  next(): void;
  setShowOnStartup(value: boolean): void;
  dismiss(): void;
  recordMovementProgress(): void;
  recordZoomProgress(): void;
  syncVisitedPois(): void;
  markGitshelvesVisited(): void;
}

export function createTutorialController({
  storage,
}: {
  storage?: TutorialControllerStorage;
} = {}): TutorialControllerHandle {
  const adapter = storage ?? createTutorialStorageAdapter(null);
  let state = adapter.readState();
  let showOnStartup = adapter.readShowOnStartup();
  let openHandler: ((open: boolean) => void) | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const persistState = (next: TutorialState) => {
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    state = next;
    adapter.writeState(state);
    emit();
  };

  return {
    getState: () => state,
    getShowOnStartup: () => showOnStartup,
    setOpenHandler(handler) {
      openHandler = handler;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    selectPage(pageId) {
      persistState(setCurrentTutorialPage(state, pageId));
    },
    previous() {
      const currentIndex = TUTORIAL_PAGE_ORDER.indexOf(state.currentPageId);
      const previous = [...TUTORIAL_PAGE_ORDER]
        .slice(0, currentIndex)
        .reverse()
        .find((pageId) => state.unlockedPageIds.includes(pageId));
      if (previous) this.selectPage(previous);
    },
    next() {
      const currentIndex = TUTORIAL_PAGE_ORDER.indexOf(state.currentPageId);
      const next = TUTORIAL_PAGE_ORDER[currentIndex + 1];
      if (next) this.selectPage(next);
    },
    setShowOnStartup(value) {
      if (showOnStartup === value) return;
      showOnStartup = value;
      adapter.writeShowOnStartup(value);
      emit();
    },
    dismiss() {
      openHandler?.(false);
    },
    recordMovementProgress() {},
    recordZoomProgress() {},
    syncVisitedPois() {},
    markGitshelvesVisited() {},
  } satisfies TutorialControllerHandle;
}
