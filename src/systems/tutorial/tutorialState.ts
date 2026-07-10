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
  zoom: {
    zoomInComplete: boolean;
    zoomOutComplete: boolean;
  };
  pois: {
    visitedPoiIds: readonly string[];
    visitedCountGoal: 3;
  };
  gitshelves: {
    completed: boolean;
  };
}

export interface TutorialState {
  version: 1;
  currentPageId: TutorialPageId;
  unlockedPageIds: readonly TutorialPageId[];
  completedPageIds: readonly TutorialPageId[];
  progress: TutorialProgress;
}

const firstPageId = TUTORIAL_PAGE_ORDER[0];
const pageIdSet = new Set<string>(TUTORIAL_PAGE_ORDER);

export const getTutorialPageOrder = (): readonly TutorialPageId[] => [
  ...TUTORIAL_PAGE_ORDER,
];

export const isTutorialPageId = (value: unknown): value is TutorialPageId =>
  typeof value === 'string' && pageIdSet.has(value);

const toRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const sanitizeNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

const sanitizeBoolean = (value: unknown): boolean => value === true;

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
  zoom: {
    zoomInComplete: false,
    zoomOutComplete: false,
  },
  pois: {
    visitedPoiIds: [],
    visitedCountGoal: 3,
  },
  gitshelves: {
    completed: false,
  },
});

export const createDefaultTutorialState = (): TutorialState => ({
  version: TUTORIAL_STATE_VERSION,
  currentPageId: firstPageId,
  unlockedPageIds: [firstPageId],
  completedPageIds: [],
  progress: createDefaultTutorialProgress(),
});

const sanitizePageList = (value: unknown): TutorialPageId[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isTutorialPageId)
    .filter((id, index, ids) => ids.indexOf(id) === index);
};

const sanitizeProgress = (raw: unknown): TutorialProgress => {
  const progress = toRecord(raw);
  const movement = toRecord(progress.movement);
  const zoom = toRecord(progress.zoom);
  const pois = toRecord(progress.pois);
  const gitshelves = toRecord(progress.gitshelves);
  return {
    movement: {
      forwardSeconds: sanitizeNumber(movement.forwardSeconds),
      leftSeconds: sanitizeNumber(movement.leftSeconds),
      backwardSeconds: sanitizeNumber(movement.backwardSeconds),
      rightSeconds: sanitizeNumber(movement.rightSeconds),
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
      visitedPoiIds: Array.isArray(pois.visitedPoiIds)
        ? [
            ...new Set(
              pois.visitedPoiIds.filter(
                (id): id is string => typeof id === 'string'
              )
            ),
          ]
        : [],
      visitedCountGoal: 3,
    },
    gitshelves: {
      completed: sanitizeBoolean(gitshelves.completed),
    },
  };
};

export const sanitizeTutorialState = (raw: unknown): TutorialState => {
  const payload = toRecord(raw);
  if (payload.version !== TUTORIAL_STATE_VERSION)
    return createDefaultTutorialState();
  const unlocked = [
    firstPageId,
    ...sanitizePageList(payload.unlockedPageIds),
  ].filter((id, index, ids) => ids.indexOf(id) === index);
  const completed = sanitizePageList(payload.completedPageIds);
  const currentPageId =
    isTutorialPageId(payload.currentPageId) &&
    unlocked.includes(payload.currentPageId)
      ? payload.currentPageId
      : unlocked[0];
  return {
    version: TUTORIAL_STATE_VERSION,
    currentPageId,
    unlockedPageIds: unlocked,
    completedPageIds: completed,
    progress: sanitizeProgress(payload.progress),
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
): boolean => getUnlockedTutorialPages(state).includes(pageId);

export const setCurrentTutorialPage = (
  state: TutorialState,
  pageId: TutorialPageId
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  if (!canOpenTutorialPage(sanitized, pageId)) return sanitized;
  return { ...sanitized, currentPageId: pageId };
};

export const unlockTutorialPage = (
  state: TutorialState,
  pageId: TutorialPageId
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  if (sanitized.unlockedPageIds.includes(pageId)) return sanitized;
  return {
    ...sanitized,
    unlockedPageIds: [...sanitized.unlockedPageIds, pageId],
  };
};

export const markTutorialPageCompleted = (
  state: TutorialState,
  pageId: TutorialPageId
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  if (sanitized.completedPageIds.includes(pageId)) return sanitized;
  return {
    ...sanitized,
    completedPageIds: [...sanitized.completedPageIds, pageId],
  };
};

export const deriveTutorialUnlocks = (state: TutorialState): TutorialState =>
  sanitizeTutorialState(state);

export const isTutorialComplete = (state: TutorialState): boolean => {
  const completed = getCompletedTutorialPages(state);
  return TUTORIAL_PAGE_ORDER.every((id) => completed.includes(id));
};
