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
  pois: { visitedPoiIds: readonly string[]; visitedCountGoal: 3 };
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
const PAGE_ID_SET = new Set<string>(TUTORIAL_PAGE_ORDER);

export const getTutorialPageOrder = (): readonly TutorialPageId[] => [
  ...TUTORIAL_PAGE_ORDER,
];
export const isTutorialPageId = (value: unknown): value is TutorialPageId =>
  typeof value === 'string' && PAGE_ID_SET.has(value);
const sanitizeSeconds = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
const sanitizeBoolean = (value: unknown): boolean => value === true;
const readRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const normalizePageIds = (value: unknown): TutorialPageId[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<TutorialPageId>();
  const normalized: TutorialPageId[] = [];
  value.forEach((item) => {
    if (!isTutorialPageId(item) || seen.has(item)) return;
    seen.add(item);
    normalized.push(item);
  });
  return normalized;
};
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
const sanitizeProgress = (value: unknown): TutorialProgress => {
  const progress = readRecord(value);
  const movement = readRecord(progress.movement);
  const zoom = readRecord(progress.zoom);
  const pois = readRecord(progress.pois);
  const gitshelves = readRecord(progress.gitshelves);
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
      visitedPoiIds: Array.isArray(pois.visitedPoiIds)
        ? [
            ...new Set(
              pois.visitedPoiIds.filter((id) => typeof id === 'string')
            ),
          ]
        : [],
      visitedCountGoal: 3,
    },
    gitshelves: { completed: sanitizeBoolean(gitshelves.completed) },
  };
};
export const createDefaultTutorialState = (): TutorialState => ({
  version: TUTORIAL_STATE_VERSION,
  currentPageId: FIRST_PAGE_ID,
  unlockedPageIds: [FIRST_PAGE_ID],
  completedPageIds: [],
  progress: createDefaultTutorialProgress(),
});
export const sanitizeTutorialState = (raw: unknown): TutorialState => {
  const record = readRecord(raw);
  if (record.version !== TUTORIAL_STATE_VERSION)
    return createDefaultTutorialState();
  const unlocked = normalizePageIds(record.unlockedPageIds);
  if (!unlocked.includes(FIRST_PAGE_ID)) unlocked.unshift(FIRST_PAGE_ID);
  const completed = normalizePageIds(record.completedPageIds);
  const requestedCurrent = isTutorialPageId(record.currentPageId)
    ? record.currentPageId
    : FIRST_PAGE_ID;
  return {
    version: TUTORIAL_STATE_VERSION,
    currentPageId: unlocked.includes(requestedCurrent)
      ? requestedCurrent
      : unlocked[0],
    unlockedPageIds: unlocked,
    completedPageIds: completed,
    progress: sanitizeProgress(record.progress),
  };
};
export const serializeTutorialProgress = (
  state: TutorialState
): TutorialState => sanitizeTutorialState(state);
export const getUnlockedTutorialPages = (state: TutorialState) =>
  sanitizeTutorialState(state).unlockedPageIds;
export const getCompletedTutorialPages = (state: TutorialState) =>
  sanitizeTutorialState(state).completedPageIds;
export const canOpenTutorialPage = (
  state: TutorialState,
  pageId: TutorialPageId
) => getUnlockedTutorialPages(state).includes(pageId);
export const setCurrentTutorialPage = (
  state: TutorialState,
  pageId: TutorialPageId
) => {
  const sanitized = sanitizeTutorialState(state);
  return canOpenTutorialPage(sanitized, pageId)
    ? { ...sanitized, currentPageId: pageId }
    : sanitized;
};
export const unlockTutorialPage = (
  state: TutorialState,
  pageId: TutorialPageId
) => {
  const sanitized = sanitizeTutorialState(state);
  return sanitized.unlockedPageIds.includes(pageId)
    ? sanitized
    : { ...sanitized, unlockedPageIds: [...sanitized.unlockedPageIds, pageId] };
};
export const markTutorialPageCompleted = (
  state: TutorialState,
  pageId: TutorialPageId
) => {
  const sanitized = sanitizeTutorialState(state);
  return sanitized.completedPageIds.includes(pageId)
    ? sanitized
    : {
        ...sanitized,
        completedPageIds: [...sanitized.completedPageIds, pageId],
      };
};
export const deriveTutorialUnlocks = (state: TutorialState): TutorialState =>
  sanitizeTutorialState(state);
export const isTutorialComplete = (state: TutorialState): boolean => {
  const completed = new Set(getCompletedTutorialPages(state));
  return TUTORIAL_PAGE_ORDER.every((pageId) => completed.has(pageId));
};
