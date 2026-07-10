import {
  getTutorialPageOrder,
  setCurrentTutorialPage,
  type TutorialPageId,
  type TutorialState,
} from './tutorialState';
import {
  createTutorialStorageAdapter,
  type TutorialStorageAdapter,
} from './tutorialStorage';

export interface TutorialControllerPanel {
  setState(state: TutorialState): void;
  setShowOnStartup(value: boolean): void;
  close(): void;
}

export interface TutorialController {
  getState(): TutorialState;
  getShowOnStartup(): boolean;
  shouldOpenOnStartup(): boolean;
  selectPage(pageId: TutorialPageId): void;
  previous(): void;
  next(): void;
  toggleShowOnStartup(value: boolean): void;
  dismiss(): void;
  recordMovementProgress(): void;
  recordZoomProgress(): void;
  syncVisitedPois(): void;
  markGitshelvesVisited(): void;
}

const statesEqual = (a: TutorialState, b: TutorialState): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

export function createTutorialController({
  panel,
  storage = createTutorialStorageAdapter(),
  onDismiss,
}: {
  panel: TutorialControllerPanel;
  storage?: TutorialStorageAdapter;
  onDismiss?: () => void;
}): TutorialController {
  let state = storage.readState();
  let showOnStartup = storage.readShowOnStartup();

  const syncPanel = () => {
    panel.setState(state);
    panel.setShowOnStartup(showOnStartup);
  };

  const setState = (next: TutorialState) => {
    if (statesEqual(state, next)) return;
    state = next;
    storage.writeState(state);
    panel.setState(state);
  };

  syncPanel();

  return {
    getState: () => state,
    getShowOnStartup: () => showOnStartup,
    shouldOpenOnStartup: () => showOnStartup,
    selectPage(pageId) {
      setState(setCurrentTutorialPage(state, pageId));
    },
    previous() {
      const order = getTutorialPageOrder();
      const index = order.indexOf(state.currentPageId);
      const previous = order
        .slice(0, index)
        .reverse()
        .find((id) => state.unlockedPageIds.includes(id));
      if (previous) this.selectPage(previous);
    },
    next() {
      const order = getTutorialPageOrder();
      const next = order[order.indexOf(state.currentPageId) + 1];
      if (next) this.selectPage(next);
    },
    toggleShowOnStartup(value) {
      if (showOnStartup === value) return;
      showOnStartup = value;
      storage.writeShowOnStartup(showOnStartup);
      panel.setShowOnStartup(showOnStartup);
    },
    dismiss() {
      panel.close();
      onDismiss?.();
    },
    recordMovementProgress() {},
    recordZoomProgress() {},
    syncVisitedPois() {},
    markGitshelvesVisited() {},
  };
}
