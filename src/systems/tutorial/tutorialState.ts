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
export const TUTORIAL_MOVEMENT_SECONDS_GOAL = 0.25;
export const TUTORIAL_MOVEMENT_DEADZONE = 0.2;
export const TUTORIAL_VISITED_POI_COUNT_GOAL = 3;
export const GITSHELVES_POI_ID = 'gitshelves-living-room-installation';
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
  pois: {
    visitedPoiIds: [],
    visitedCountGoal: TUTORIAL_VISITED_POI_COUNT_GOAL,
  },
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
      visitedCountGoal: TUTORIAL_VISITED_POI_COUNT_GOAL,
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

export type TutorialMovementDirection =
  | 'forward'
  | 'left'
  | 'backward'
  | 'right';

const movementSecondsKey = (direction: TutorialMovementDirection) =>
  `${direction}Seconds` as const;
const movementCompleteKey = (direction: TutorialMovementDirection) =>
  `${direction}Complete` as const;
const areAllMovementDirectionsComplete = (progress: TutorialProgress) =>
  progress.movement.forwardComplete &&
  progress.movement.leftComplete &&
  progress.movement.backwardComplete &&
  progress.movement.rightComplete;
const isZoomComplete = (progress: TutorialProgress) =>
  progress.zoom.zoomInComplete && progress.zoom.zoomOutComplete;
const uniqueVisitedIds = (ids: readonly string[]) => [...new Set(ids)];
const isPoiGoalComplete = (progress: TutorialProgress) =>
  uniqueVisitedIds(progress.pois.visitedPoiIds).length >=
  progress.pois.visitedCountGoal;

export const deriveTutorialUnlocks = (state: TutorialState): TutorialState => {
  let next = sanitizeTutorialState(state);
  const completed = new Set(next.completedPageIds);
  const unlocked = new Set(next.unlockedPageIds);
  if (areAllMovementDirectionsComplete(next.progress)) {
    completed.add('welcomeMovement');
    unlocked.add('zoom');
  }
  if (isZoomComplete(next.progress)) {
    completed.add('zoom');
    unlocked.add('visitPois');
  }
  if (isPoiGoalComplete(next.progress)) {
    completed.add('visitPois');
    unlocked.add('findGitshelves');
  }
  if (next.progress.gitshelves.completed) {
    completed.add('findGitshelves');
  }
  next = {
    ...next,
    unlockedPageIds: TUTORIAL_PAGE_ORDER.filter((pageId) =>
      unlocked.has(pageId)
    ),
    completedPageIds: TUTORIAL_PAGE_ORDER.filter((pageId) =>
      completed.has(pageId)
    ),
  };
  return sanitizeTutorialState(next);
};

export const recordMovementDirectionProgress = (
  state: TutorialState,
  direction: TutorialMovementDirection,
  deltaSeconds: number
): TutorialState => {
  const next = sanitizeTutorialState(state);
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return next;
  const secondsKey = movementSecondsKey(direction);
  const completeKey = movementCompleteKey(direction);
  if (next.progress.movement[completeKey]) return next;
  const seconds = Math.min(
    TUTORIAL_MOVEMENT_SECONDS_GOAL,
    next.progress.movement[secondsKey] + deltaSeconds
  );
  return deriveTutorialUnlocks({
    ...next,
    progress: {
      ...next.progress,
      movement: {
        ...next.progress.movement,
        [secondsKey]: seconds,
        [completeKey]: seconds >= TUTORIAL_MOVEMENT_SECONDS_GOAL,
      },
    },
  });
};

export interface TutorialMovementSample {
  right: number;
  forward: number;
  deltaSeconds: number;
  moved: boolean;
  deadzone?: number;
}
export const recordMovementSample = (
  state: TutorialState,
  sample: TutorialMovementSample
): TutorialState => {
  if (!sample.moved) return sanitizeTutorialState(state);
  const deadzone = sample.deadzone ?? TUTORIAL_MOVEMENT_DEADZONE;
  let next = sanitizeTutorialState(state);
  if (sample.forward > deadzone)
    next = recordMovementDirectionProgress(
      next,
      'forward',
      sample.deltaSeconds
    );
  if (sample.forward < -deadzone)
    next = recordMovementDirectionProgress(
      next,
      'backward',
      sample.deltaSeconds
    );
  if (sample.right > deadzone)
    next = recordMovementDirectionProgress(next, 'right', sample.deltaSeconds);
  if (sample.right < -deadzone)
    next = recordMovementDirectionProgress(next, 'left', sample.deltaSeconds);
  return next;
};

export interface TutorialZoomSnapshot {
  zoom: number;
  zoomTarget: number;
  minZoom: number;
  maxZoom: number;
}
export const recordZoomProgress = (
  state: TutorialState,
  snapshot: TutorialZoomSnapshot
): TutorialState => {
  const next = sanitizeTutorialState(state);
  const { minZoom, maxZoom } = snapshot;
  if (
    ![snapshot.zoom, snapshot.zoomTarget, minZoom, maxZoom].every(
      Number.isFinite
    ) ||
    maxZoom <= minZoom
  )
    return next;
  const range = maxZoom - minZoom;
  const tolerance = Math.max(range * 0.01, 1e-4);
  const zoomInComplete =
    next.progress.zoom.zoomInComplete ||
    snapshot.zoomTarget >= maxZoom - tolerance ||
    snapshot.zoom >= maxZoom - tolerance;
  const zoomOutComplete =
    next.progress.zoom.zoomOutComplete ||
    snapshot.zoomTarget <= minZoom + tolerance ||
    snapshot.zoom <= minZoom + tolerance;
  return deriveTutorialUnlocks({
    ...next,
    progress: { ...next.progress, zoom: { zoomInComplete, zoomOutComplete } },
  });
};

export const recordVisitedPois = (
  state: TutorialState,
  visitedPoiIds: Iterable<string>
): TutorialState => {
  const next = sanitizeTutorialState(state);
  const ids = uniqueVisitedIds(
    Array.from(visitedPoiIds).filter((id) => typeof id === 'string')
  );
  const gitshelvesCompleted =
    next.progress.gitshelves.completed || ids.includes(GITSHELVES_POI_ID);
  return deriveTutorialUnlocks({
    ...next,
    progress: {
      ...next.progress,
      pois: { ...next.progress.pois, visitedPoiIds: ids },
      gitshelves: { completed: gitshelvesCompleted },
    },
  });
};

export const recordGitshelvesVisited = (state: TutorialState): TutorialState =>
  recordVisitedPois(state, [
    ...sanitizeTutorialState(state).progress.pois.visitedPoiIds,
    GITSHELVES_POI_ID,
  ]);
export const isTutorialComplete = (state: TutorialState): boolean => {
  const completed = new Set(getCompletedTutorialPages(state));
  return TUTORIAL_PAGE_ORDER.every((pageId) => completed.has(pageId));
};
