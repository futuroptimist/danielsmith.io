import type { TutorialPanelHandle } from '../../ui/hud/tutorialPanel';

import {
  getTutorialPageOrder,
  recordGitshelvesVisited,
  recordMovementInputProgress,
  recordVisitedPois,
  recordZoomProgress as recordTutorialZoomProgress,
  setCurrentTutorialPage,
  type TutorialPageId,
  type TutorialState,
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
  recordMovementProgress(input: {
    right: number;
    forward: number;
    deltaSeconds: number;
    moved: boolean;
  }): void;
  recordZoomProgress(snapshot: {
    currentZoom?: number;
    targetZoom?: number;
    minZoom: number;
    maxZoom: number;
  }): void;
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
  const selectPage = (pageId: TutorialPageId) => {
    state = setCurrentTutorialPage(state, pageId);
    persistStateIfChanged();
    render();
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
    recordMovementProgress(input) {
      state = recordMovementInputProgress(state, input);
      persistStateIfChanged();
      render();
    },
    recordZoomProgress(snapshot) {
      state = recordTutorialZoomProgress(state, snapshot);
      persistStateIfChanged();
      render();
    },
    syncVisitedPois(visitedPoiIds) {
      state = recordVisitedPois(state, visitedPoiIds);
      persistStateIfChanged();
      render();
    },
    markGitshelvesVisited() {
      state = recordGitshelvesVisited(state);
      persistStateIfChanged();
      render();
    },
  };
};
