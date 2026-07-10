import {
  getTutorialPageOrder,
  setCurrentTutorialPage,
  type TutorialPageId,
  type TutorialState,
} from './tutorialState';
import { createTutorialStorageAdapter } from './tutorialStorage';

export interface TutorialPanelStateSnapshot {
  state: TutorialState;
  showOnStartup: boolean;
}

export interface TutorialControllerOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  onChange?: (snapshot: TutorialPanelStateSnapshot) => void;
  onDismiss?: () => void;
}

export interface TutorialControllerHandle {
  getSnapshot(): TutorialPanelStateSnapshot;
  selectPage(pageId: TutorialPageId): void;
  previousPage(): void;
  nextPage(): void;
  setShowOnStartup(value: boolean): void;
  dismiss(): void;
  recordMovementProgress(): void;
  recordZoomProgress(): void;
  syncVisitedPois(): void;
  markGitshelvesVisited(): void;
}

const snapshotEquals = (a: TutorialState, b: TutorialState) =>
  JSON.stringify(a) === JSON.stringify(b);

export function createTutorialController({
  storage,
  onChange,
  onDismiss,
}: TutorialControllerOptions = {}): TutorialControllerHandle {
  const adapter = createTutorialStorageAdapter(storage);
  let state = adapter.readState();
  let showOnStartup = adapter.readShowOnStartup();

  const emit = () => onChange?.({ state, showOnStartup });
  const persistStateIfChanged = (next: TutorialState) => {
    if (snapshotEquals(state, next)) return;
    state = next;
    adapter.writeState(state);
    emit();
  };

  return {
    getSnapshot() {
      return { state, showOnStartup };
    },
    selectPage(pageId) {
      persistStateIfChanged(setCurrentTutorialPage(state, pageId));
    },
    previousPage() {
      const order = getTutorialPageOrder();
      const unlocked = state.unlockedPageIds;
      const index = order.indexOf(state.currentPageId);
      const previous = [...order]
        .slice(0, index)
        .reverse()
        .find((id) => unlocked.includes(id));
      if (previous) this.selectPage(previous);
    },
    nextPage() {
      const order = getTutorialPageOrder();
      const currentIndex = order.indexOf(state.currentPageId);
      const next = order[currentIndex + 1];
      if (next && state.unlockedPageIds.includes(next)) this.selectPage(next);
    },
    setShowOnStartup(value) {
      if (showOnStartup === value) return;
      showOnStartup = value;
      adapter.writeShowOnStartup(showOnStartup);
      emit();
    },
    dismiss() {
      onDismiss?.();
    },
    recordMovementProgress() {},
    recordZoomProgress() {},
    syncVisitedPois() {},
    markGitshelvesVisited() {},
  };
}
