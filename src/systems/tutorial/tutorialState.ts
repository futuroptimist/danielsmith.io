export const TUTORIAL_STATE_VERSION = 1;
export const TUTORIAL_PAGE_ORDER = [
  'welcomeMovement',
  'zoom',
  'visitPois',
  'findGitshelves',
] as const;

export type TutorialPageId = (typeof TUTORIAL_PAGE_ORDER)[number];

export interface TutorialProgress {
  movement: {
    forwardSeconds: number;
    leftSeconds: number;
    backwardSeconds: number;
    rightSeconds: number;
    forwardComplete: boolean;
    leftComplete: boolean;
    backwardComplete: boolean;
    rightComplete: boolean;
  };
  zoom: { zoomInComplete: boolean; zoomOutComplete: boolean };
  pois: { visitedPoiIds: readonly string[]; visitedCountGoal: number };
  gitshelves: { completed: boolean };
}

export interface TutorialState {
  version: 1;
  currentPageId: TutorialPageId;
  unlockedPageIds: readonly TutorialPageId[];
  completedPageIds: readonly TutorialPageId[];
  progress: TutorialProgress;
}

const FIRST_PAGE_ID = TUTORIAL_PAGE_ORDER[0];
const pageIdSet = new Set<string>(TUTORIAL_PAGE_ORDER);

export const getTutorialPageOrder = (): readonly TutorialPageId[] => [
  ...TUTORIAL_PAGE_ORDER,
];

export const isTutorialPageId = (value: unknown): value is TutorialPageId =>
  typeof value === 'string' && pageIdSet.has(value);

const sanitizeSeconds = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

const sanitizeBoolean = (value: unknown): boolean => value === true;

const uniquePageIds = (value: unknown): TutorialPageId[] => {
  const ids = Array.isArray(value) ? value : [];
  return TUTORIAL_PAGE_ORDER.filter((id) => ids.includes(id));
};

const uniqueStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string'))]
    : [];

export const createDefaultTutorialProgress = (): TutorialProgress => ({
  movement: {
    forwardSeconds: 0,
    leftSeconds: 0,
    backwardSeconds: 0,
    rightSeconds: 0,
    forwardComplete: false,
    leftComplete: false,
    backwardComplete: false,
    rightComplete: false,
  },
  zoom: { zoomInComplete: false, zoomOutComplete: false },
  pois: { visitedPoiIds: [], visitedCountGoal: 3 },
  gitshelves: { completed: false },
});

export const createDefaultTutorialState = (): TutorialState => ({
  version: TUTORIAL_STATE_VERSION,
  currentPageId: FIRST_PAGE_ID,
  unlockedPageIds: [FIRST_PAGE_ID],
  completedPageIds: [],
  progress: createDefaultTutorialProgress(),
});

const sanitizeProgress = (raw: unknown): TutorialProgress => {
  if (!raw || typeof raw !== 'object') return createDefaultTutorialProgress();
  const value = raw as Record<string, unknown>;
  const movement =
    value.movement && typeof value.movement === 'object'
      ? (value.movement as Record<string, unknown>)
      : {};
  const zoom =
    value.zoom && typeof value.zoom === 'object'
      ? (value.zoom as Record<string, unknown>)
      : {};
  const pois =
    value.pois && typeof value.pois === 'object'
      ? (value.pois as Record<string, unknown>)
      : {};
  const gitshelves =
    value.gitshelves && typeof value.gitshelves === 'object'
      ? (value.gitshelves as Record<string, unknown>)
      : {};
  return {
    movement: {
      forwardSeconds: sanitizeSeconds(movement.forwardSeconds),
      leftSeconds: sanitizeSeconds(movement.leftSeconds),
      backwardSeconds: sanitizeSeconds(movement.backwardSeconds),
      rightSeconds: sanitizeSeconds(movement.rightSeconds),
      forwardComplete: sanitizeBoolean(movement.forwardComplete),
      leftComplete: sanitizeBoolean(movement.leftComplete),
      backwardComplete: sanitizeBoolean(movement.backwardComplete),
      rightComplete: sanitizeBoolean(movement.rightComplete),
    },
    zoom: {
      zoomInComplete: sanitizeBoolean(zoom.zoomInComplete),
      zoomOutComplete: sanitizeBoolean(zoom.zoomOutComplete),
    },
    pois: {
      visitedPoiIds: uniqueStrings(pois.visitedPoiIds),
      visitedCountGoal: 3,
    },
    gitshelves: { completed: sanitizeBoolean(gitshelves.completed) },
  };
};

export const sanitizeTutorialState = (raw: unknown): TutorialState => {
  if (!raw || typeof raw !== 'object') return createDefaultTutorialState();
  const value = raw as Record<string, unknown>;
  if (value.version !== TUTORIAL_STATE_VERSION)
    return createDefaultTutorialState();
  const unlocked = uniquePageIds(value.unlockedPageIds);
  const unlockedPageIds = unlocked.includes(FIRST_PAGE_ID)
    ? unlocked
    : [FIRST_PAGE_ID, ...unlocked];
  const completedPageIds = uniquePageIds(value.completedPageIds);
  const currentPageId =
    isTutorialPageId(value.currentPageId) &&
    unlockedPageIds.includes(value.currentPageId)
      ? value.currentPageId
      : unlockedPageIds[0];
  return {
    version: TUTORIAL_STATE_VERSION,
    currentPageId,
    unlockedPageIds,
    completedPageIds,
    progress: sanitizeProgress(value.progress),
  };
};

export const serializeTutorialProgress = (
  state: TutorialState
): TutorialState => sanitizeTutorialState(state);

export const getUnlockedTutorialPages = (
  state: TutorialState
): readonly TutorialPageId[] => sanitizeTutorialState(state).unlockedPageIds;

export const getCompletedTutorialPages = (
  state: TutorialState
): readonly TutorialPageId[] => sanitizeTutorialState(state).completedPageIds;

export const canOpenTutorialPage = (
  state: TutorialState,
  pageId: TutorialPageId
): boolean => sanitizeTutorialState(state).unlockedPageIds.includes(pageId);

export const setCurrentTutorialPage = (
  state: TutorialState,
  pageId: TutorialPageId
): TutorialState =>
  canOpenTutorialPage(state, pageId)
    ? { ...state, currentPageId: pageId }
    : sanitizeTutorialState(state);

export const unlockTutorialPage = (
  state: TutorialState,
  pageId: TutorialPageId
): TutorialState => {
  const next = sanitizeTutorialState(state);
  if (next.unlockedPageIds.includes(pageId)) return next;
  return sanitizeTutorialState({
    ...next,
    unlockedPageIds: [...next.unlockedPageIds, pageId],
  });
};

export const markTutorialPageCompleted = (
  state: TutorialState,
  pageId: TutorialPageId
): TutorialState => {
  const next = sanitizeTutorialState(state);
  if (next.completedPageIds.includes(pageId)) return next;
  return sanitizeTutorialState({
    ...next,
    completedPageIds: [...next.completedPageIds, pageId],
  });
};

export const deriveTutorialUnlocks = (state: TutorialState): TutorialState =>
  sanitizeTutorialState(state);

export const isTutorialComplete = (state: TutorialState): boolean => {
  const completed = getCompletedTutorialPages(state);
  return TUTORIAL_PAGE_ORDER.every((id) => completed.includes(id));
};
