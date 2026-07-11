import type { TutorialPanelHandle } from '../../ui/hud/tutorialPanel';

import {
  getTutorialPageOrder,
  recordGitshelvesVisited,
  recordMovementInputProgress,
  recordVisitedPois,
  recordZoomProgress as recordTutorialZoomProgress,
  setCurrentTutorialPage,
  TUTORIAL_MOVEMENT_PERSISTENCE_SECONDS_BUCKET,
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
  let lastRenderedStateKey = '';
  let lastPersistedMovementBucketKey = getMovementBucketKey(state);

  const renderAll = () => {
    panel?.setState(state);
    panel?.setShowOnStartup(showOnStartup);
  };
  const renderStateIfVisibleChanged = () => {
    const nextKey = getVisibleStateKey(state);
    if (nextKey === lastRenderedStateKey) return;
    lastRenderedStateKey = nextKey;
    panel?.setState(state);
  };
  const persistStateIfChanged = () => {
    const serialized = JSON.stringify(state);
    if (serialized === lastSerializedState) return false;
    lastSerializedState = serialized;
    adapter.writeState(state);
    return true;
  };
  const selectPage = (pageId: TutorialPageId) => {
    state = setCurrentTutorialPage(state, pageId);
    persistStateIfChanged();
    renderStateIfVisibleChanged();
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
      lastRenderedStateKey = getVisibleStateKey(state);
      renderAll();
    },
    selectPage,
    previousPage: previousUnlockedPage,
    nextPage: nextAdjacentPage,
    setShowOnStartup(value) {
      if (showOnStartup === value) return;
      showOnStartup = value;
      adapter.writeShowOnStartup(value);
      renderAll();
    },
    dismiss() {
      onDismiss?.();
    },
    recordMovementProgress(input) {
      const before = state;
      state = recordMovementInputProgress(state, input);
      if (state === before) return;
      const nextBucketKey = getMovementBucketKey(state);
      const shouldPersist =
        didVisibleStateChange(before, state) ||
        nextBucketKey !== lastPersistedMovementBucketKey;
      if (!shouldPersist) return;
      if (persistStateIfChanged()) {
        lastPersistedMovementBucketKey = nextBucketKey;
        renderStateIfVisibleChanged();
      }
    },
    recordZoomProgress(snapshot) {
      const before = state;
      state = recordTutorialZoomProgress(state, snapshot);
      if (state !== before && persistStateIfChanged())
        renderStateIfVisibleChanged();
    },
    syncVisitedPois(visitedPoiIds) {
      const before = state;
      state = recordVisitedPois(state, visitedPoiIds);
      if (state !== before && persistStateIfChanged())
        renderStateIfVisibleChanged();
    },
    markGitshelvesVisited() {
      const before = state;
      state = recordGitshelvesVisited(state);
      if (state !== before && persistStateIfChanged())
        renderStateIfVisibleChanged();
    },
  };
};

const getVisibleStateKey = (state: TutorialState) =>
  JSON.stringify({
    currentPageId: state.currentPageId,
    unlockedPageIds: state.unlockedPageIds,
    completedPageIds: state.completedPageIds,
    movementComplete: {
      forwardComplete: state.progress.movement.forwardComplete,
      leftComplete: state.progress.movement.leftComplete,
      backwardComplete: state.progress.movement.backwardComplete,
      rightComplete: state.progress.movement.rightComplete,
    },
    zoom: state.progress.zoom,
    poiCount: Math.min(
      state.progress.pois.visitedPoiIds.length,
      state.progress.pois.visitedCountGoal
    ),
    gitshelves: state.progress.gitshelves.completed,
  });

const didVisibleStateChange = (before: TutorialState, after: TutorialState) =>
  getVisibleStateKey(before) !== getVisibleStateKey(after);

const getMovementBucketKey = (state: TutorialState) => {
  const movement = state.progress.movement;
  return [
    movement.forwardSeconds,
    movement.leftSeconds,
    movement.backwardSeconds,
    movement.rightSeconds,
  ]
    .map((seconds) =>
      Math.floor(seconds / TUTORIAL_MOVEMENT_PERSISTENCE_SECONDS_BUCKET)
    )
    .join(':');
};
