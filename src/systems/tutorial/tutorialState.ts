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

const FIRST_PAGE_ID: TutorialPageId = TUTORIAL_PAGE_ORDER[0];

export const getTutorialPageOrder = (): readonly TutorialPageId[] => [
  ...TUTORIAL_PAGE_ORDER,
];

export const isTutorialPageId = (value: unknown): value is TutorialPageId =>
  typeof value === 'string' &&
  (TUTORIAL_PAGE_ORDER as readonly string[]).includes(value);

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
  currentPageId: FIRST_PAGE_ID,
  unlockedPageIds: [FIRST_PAGE_ID],
  completedPageIds: [],
  progress: createDefaultTutorialProgress(),
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const sanitizeNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
const sanitizeBoolean = (value: unknown) =>
  typeof value === 'boolean' ? value : false;

const sanitizePageList = (value: unknown): TutorialPageId[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<TutorialPageId>();
  value.forEach((item) => {
    if (isTutorialPageId(item)) seen.add(item);
  });
  return TUTORIAL_PAGE_ORDER.filter((id) => seen.has(id));
};

const sanitizeProgress = (raw: unknown): TutorialProgress => {
  const defaults = createDefaultTutorialProgress();
  const progress = asRecord(raw);
  if (!progress) return defaults;
  const movement = asRecord(progress.movement);
  const zoom = asRecord(progress.zoom);
  const pois = asRecord(progress.pois);
  const gitshelves = asRecord(progress.gitshelves);
  return {
    movement: movement
      ? {
          forwardSeconds: sanitizeNumber(movement.forwardSeconds),
          leftSeconds: sanitizeNumber(movement.leftSeconds),
          backwardSeconds: sanitizeNumber(movement.backwardSeconds),
          rightSeconds: sanitizeNumber(movement.rightSeconds),
          forwardComplete: sanitizeBoolean(movement.forwardComplete),
          leftComplete: sanitizeBoolean(movement.leftComplete),
          backwardComplete: sanitizeBoolean(movement.backwardComplete),
          rightComplete: sanitizeBoolean(movement.rightComplete),
        }
      : defaults.movement,
    zoom: zoom
      ? {
          zoomInComplete: sanitizeBoolean(zoom.zoomInComplete),
          zoomOutComplete: sanitizeBoolean(zoom.zoomOutComplete),
        }
      : defaults.zoom,
    pois: pois
      ? {
          visitedPoiIds: Array.isArray(pois.visitedPoiIds)
            ? Array.from(
                new Set(
                  pois.visitedPoiIds.filter(
                    (id): id is string => typeof id === 'string'
                  )
                )
              )
            : defaults.pois.visitedPoiIds,
          visitedCountGoal: 3,
        }
      : defaults.pois,
    gitshelves: gitshelves
      ? { completed: sanitizeBoolean(gitshelves.completed) }
      : defaults.gitshelves,
  };
};

export const sanitizeTutorialState = (raw: unknown): TutorialState => {
  const record = asRecord(raw);
  if (!record || record.version !== TUTORIAL_STATE_VERSION) {
    return createDefaultTutorialState();
  }
  const unlocked = Array.from(
    new Set([FIRST_PAGE_ID, ...sanitizePageList(record.unlockedPageIds)])
  );
  const completed = sanitizePageList(record.completedPageIds);
  const currentPageId = isTutorialPageId(record.currentPageId)
    ? record.currentPageId
    : FIRST_PAGE_ID;
  return {
    version: TUTORIAL_STATE_VERSION,
    currentPageId: unlocked.includes(currentPageId)
      ? currentPageId
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
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  return canOpenTutorialPage(sanitized, pageId)
    ? { ...sanitized, currentPageId: pageId }
    : sanitized;
};

export const unlockTutorialPage = (
  state: TutorialState,
  pageId: TutorialPageId
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  return sanitized.unlockedPageIds.includes(pageId)
    ? sanitized
    : {
        ...sanitized,
        unlockedPageIds: sanitizePageList([
          ...sanitized.unlockedPageIds,
          pageId,
        ]),
      };
};

export const markTutorialPageCompleted = (
  state: TutorialState,
  pageId: TutorialPageId
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  return sanitized.completedPageIds.includes(pageId)
    ? sanitized
    : {
        ...sanitized,
        completedPageIds: sanitizePageList([
          ...sanitized.completedPageIds,
          pageId,
        ]),
      };
};

export const deriveTutorialUnlocks = (state: TutorialState): TutorialState =>
  sanitizeTutorialState(state);

export const isTutorialComplete = (state: TutorialState): boolean =>
  TUTORIAL_PAGE_ORDER.every((id) =>
    sanitizeTutorialState(state).completedPageIds.includes(id)
  );
