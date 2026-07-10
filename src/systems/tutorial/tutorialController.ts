import type { TutorialPanelHandle } from '../../ui/hud/tutorialPanel';

import {
  getTutorialPageOrder,
  recordGitshelvesVisited,
  recordMovementProgress as recordMovementProgressInState,
  recordVisitedPois,
  recordZoomProgress as recordZoomProgressInState,
  setCurrentTutorialPage,
  type TutorialPageId,
  type TutorialMovementInputSnapshot,
  type TutorialState,
  type TutorialZoomSnapshot,
} from './tutorialState';
import {
  createTutorialStorageAdapter,
  type TutorialStorage,
} from './tutorialStorage';

export interface TutorialControllerHandle {
  getState(): TutorialState;
  getShowOnStartup(): boolean;
  setPanel(panel: TutorialPanelHandle): void;
  selectPage(pageId: TutorialPageId): void;
  previousPage(): void;
  nextPage(): void;
  setShowOnStartup(value: boolean): void;
  dismiss(): void;
  recordMovementProgress(snapshot: TutorialMovementInputSnapshot): void;
  recordZoomProgress(snapshot: TutorialZoomSnapshot): void;
  syncVisitedPois(visitedPoiIds: Iterable<string>): void;
  markGitshelvesVisited(): void;
}

export const createTutorialController = ({
  storage,
  onDismiss,
}: {
  storage: TutorialStorage;
  onDismiss?: () => void;
}): TutorialControllerHandle => {
  const adapter = createTutorialStorageAdapter(storage);
  let state = adapter.readState();
  let showOnStartup = adapter.readShowOnStartup();
  let panel: TutorialPanelHandle | null = null;
  let lastSerializedState = JSON.stringify(state);

  const render = () => {
    panel?.setState(state);
    panel?.setShowOnStartup(showOnStartup);
  };
  const persistStateIfChanged = () => {
    const serialized = JSON.stringify(state);
    if (serialized === lastSerializedState) return;
    lastSerializedState = serialized;
    adapter.writeState(state);
  };
  const updateState = (nextState: TutorialState) => {
    if (JSON.stringify(nextState) === JSON.stringify(state)) return;
    state = nextState;
    persistStateIfChanged();
    render();
  };
  const selectPage = (pageId: TutorialPageId) => {
    updateState(setCurrentTutorialPage(state, pageId));
  };
  const nextAdjacentPage = () => {
    const order = getTutorialPageOrder();
    const currentIndex = order.indexOf(state.currentPageId);
    const candidate = order[currentIndex + 1];
    if (candidate) selectPage(candidate);
  };
  const previousUnlockedPage = () => {
    const order = getTutorialPageOrder();
    const currentIndex = order.indexOf(state.currentPageId);
    const unlockedPageIds = new Set(state.unlockedPageIds);
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const candidate = order[index];
      if (candidate && unlockedPageIds.has(candidate)) {
        selectPage(candidate);
        return;
      }
    }
  };

  return {
    getState: () => state,
    getShowOnStartup: () => showOnStartup,
    setPanel(nextPanel) {
      panel = nextPanel;
      render();
    },
    selectPage,
    previousPage: previousUnlockedPage,
    nextPage: nextAdjacentPage,
    setShowOnStartup(value) {
      if (showOnStartup === value) return;
      showOnStartup = value;
      adapter.writeShowOnStartup(value);
      render();
    },
    dismiss() {
      onDismiss?.();
    },
    recordMovementProgress(snapshot) {
      updateState(recordMovementProgressInState(state, snapshot));
    },
    recordZoomProgress(snapshot) {
      updateState(recordZoomProgressInState(state, snapshot));
    },
    syncVisitedPois(visitedPoiIds) {
      updateState(recordVisitedPois(state, visitedPoiIds));
    },
    markGitshelvesVisited() {
      updateState(recordGitshelvesVisited(state));
    },
  };
};
