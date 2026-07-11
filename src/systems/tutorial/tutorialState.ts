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
const DEFAULT_VISITED_POI_COUNT_GOAL = 3;
const PAGE_ID_SET = new Set<string>(TUTORIAL_PAGE_ORDER);
export const TUTORIAL_MOVEMENT_SECONDS_GOAL = 0.25;
export const TUTORIAL_MOVEMENT_PERSISTENCE_SECONDS_BUCKET = 0.05;
export const TUTORIAL_MOVEMENT_DEADZONE = 0.2;
export const TUTORIAL_VISITED_POI_GOAL = DEFAULT_VISITED_POI_COUNT_GOAL;
export const GITSHELVES_POI_ID = 'gitshelves-living-room-installation';
export type TutorialMovementDirection =
  | 'forward'
  | 'left'
  | 'backward'
  | 'right';

const MOVEMENT_SECOND_KEYS: Record<
  TutorialMovementDirection,
  keyof TutorialProgress['movement']
> = {
  forward: 'forwardSeconds',
  left: 'leftSeconds',
  backward: 'backwardSeconds',
  right: 'rightSeconds',
};
const MOVEMENT_COMPLETE_KEYS: Record<
  TutorialMovementDirection,
  keyof TutorialProgress['movement']
> = {
  forward: 'forwardComplete',
  left: 'leftComplete',
  backward: 'backwardComplete',
  right: 'rightComplete',
};

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
  pois: { visitedPoiIds: [], visitedCountGoal: DEFAULT_VISITED_POI_COUNT_GOAL },
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
      visitedCountGoal: DEFAULT_VISITED_POI_COUNT_GOAL,
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

const uniqueStrings = (values: readonly string[]) => [...new Set(values)];
const movementComplete = (progress: TutorialProgress) =>
  progress.movement.forwardComplete &&
  progress.movement.leftComplete &&
  progress.movement.backwardComplete &&
  progress.movement.rightComplete;
const zoomComplete = (progress: TutorialProgress) =>
  progress.zoom.zoomInComplete && progress.zoom.zoomOutComplete;
const poiGoalComplete = (progress: TutorialProgress) =>
  progress.pois.visitedPoiIds.length >= progress.pois.visitedCountGoal;

export const deriveTutorialUnlocks = (state: TutorialState): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  const unlocked = new Set<TutorialPageId>(sanitized.unlockedPageIds);
  const completed = new Set<TutorialPageId>(sanitized.completedPageIds);
  if (movementComplete(sanitized.progress) && unlocked.has('welcomeMovement')) {
    completed.add('welcomeMovement');
    unlocked.add('zoom');
  }
  if (zoomComplete(sanitized.progress) && unlocked.has('zoom')) {
    completed.add('zoom');
    unlocked.add('visitPois');
  }
  if (poiGoalComplete(sanitized.progress) && unlocked.has('visitPois')) {
    completed.add('visitPois');
    unlocked.add('findGitshelves');
  }
  if (
    sanitized.progress.gitshelves.completed &&
    unlocked.has('findGitshelves')
  ) {
    completed.add('findGitshelves');
  }
  return {
    ...sanitized,
    unlockedPageIds: TUTORIAL_PAGE_ORDER.filter((id) => unlocked.has(id)),
    completedPageIds: TUTORIAL_PAGE_ORDER.filter((id) => completed.has(id)),
  };
};

export const recordMovementDirectionProgress = (
  state: TutorialState,
  direction: TutorialMovementDirection,
  deltaSeconds: number
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return sanitized;
  const secondsKey = MOVEMENT_SECOND_KEYS[direction];
  const completeKey = MOVEMENT_COMPLETE_KEYS[direction];
  if (sanitized.progress.movement[completeKey]) return sanitized;
  const currentSeconds = sanitized.progress.movement[secondsKey] as number;
  const nextSeconds = currentSeconds + deltaSeconds;
  const nextMovement = {
    ...sanitized.progress.movement,
    [secondsKey]: nextSeconds,
    [completeKey]: nextSeconds >= TUTORIAL_MOVEMENT_SECONDS_GOAL,
  };
  return deriveTutorialUnlocks({
    ...sanitized,
    progress: { ...sanitized.progress, movement: nextMovement },
  });
};

export interface TutorialMovementInputSnapshot {
  right: number;
  forward: number;
  deltaSeconds: number;
  moved: boolean;
  deadzone?: number;
}

export const recordMovementInputProgress = (
  state: TutorialState,
  snapshot: TutorialMovementInputSnapshot
): TutorialState => {
  if (!snapshot.moved) return sanitizeTutorialState(state);
  const deadzone = snapshot.deadzone ?? TUTORIAL_MOVEMENT_DEADZONE;
  let next = sanitizeTutorialState(state);
  if (snapshot.forward > deadzone) {
    next = recordMovementDirectionProgress(
      next,
      'forward',
      snapshot.deltaSeconds
    );
  }
  if (snapshot.forward < -deadzone) {
    next = recordMovementDirectionProgress(
      next,
      'backward',
      snapshot.deltaSeconds
    );
  }
  if (snapshot.right > deadzone) {
    next = recordMovementDirectionProgress(
      next,
      'right',
      snapshot.deltaSeconds
    );
  }
  if (snapshot.right < -deadzone) {
    next = recordMovementDirectionProgress(next, 'left', snapshot.deltaSeconds);
  }
  return next;
};

export interface TutorialZoomSnapshot {
  currentZoom?: number;
  targetZoom?: number;
  minZoom: number;
  maxZoom: number;
}

export const recordZoomProgress = (
  state: TutorialState,
  snapshot: TutorialZoomSnapshot
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  const { minZoom, maxZoom } = snapshot;
  if (
    !Number.isFinite(minZoom) ||
    !Number.isFinite(maxZoom) ||
    maxZoom <= minZoom
  ) {
    return sanitized;
  }
  const range = maxZoom - minZoom;
  const epsilon = range * 0.01;
  const values = [snapshot.currentZoom, snapshot.targetZoom].filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value)
  );
  const zoomInComplete =
    sanitized.progress.zoom.zoomInComplete ||
    values.some((value) => value >= maxZoom - epsilon);
  const zoomOutComplete =
    sanitized.progress.zoom.zoomOutComplete ||
    values.some((value) => value <= minZoom + epsilon);
  if (
    zoomInComplete === sanitized.progress.zoom.zoomInComplete &&
    zoomOutComplete === sanitized.progress.zoom.zoomOutComplete
  ) {
    return sanitized;
  }
  return deriveTutorialUnlocks({
    ...sanitized,
    progress: {
      ...sanitized.progress,
      zoom: { zoomInComplete, zoomOutComplete },
    },
  });
};

export const recordVisitedPois = (
  state: TutorialState,
  visitedPoiIds: Iterable<string>
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  const nextVisited = uniqueStrings([
    ...sanitized.progress.pois.visitedPoiIds,
    ...[...visitedPoiIds].filter((id) => typeof id === 'string'),
  ]);
  const gitshelvesCompleted =
    sanitized.progress.gitshelves.completed ||
    nextVisited.includes(GITSHELVES_POI_ID);
  if (
    nextVisited.length === sanitized.progress.pois.visitedPoiIds.length &&
    nextVisited.every(
      (id, index) => id === sanitized.progress.pois.visitedPoiIds[index]
    ) &&
    gitshelvesCompleted === sanitized.progress.gitshelves.completed
  ) {
    return sanitized;
  }
  return deriveTutorialUnlocks({
    ...sanitized,
    progress: {
      ...sanitized.progress,
      pois: { ...sanitized.progress.pois, visitedPoiIds: nextVisited },
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
