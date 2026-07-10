export const TUTORIAL_STATE_VERSION = 1;
export const TUTORIAL_MOVEMENT_SECONDS_GOAL = 0.25;
export const TUTORIAL_MOVEMENT_DEADZONE = 0.2;
export const TUTORIAL_VISITED_POI_COUNT_GOAL = 3;
export const GITSHELVES_POI_ID = 'gitshelves-living-room-installation';

export const TUTORIAL_PAGE_ORDER = [
  'welcomeMovement',
  'zoom',
  'visitPois',
  'findGitshelves',
] as const;
export const TUTORIAL_MOVEMENT_DIRECTIONS = [
  'forward',
  'left',
  'backward',
  'right',
] as const;

export type TutorialPageId = (typeof TUTORIAL_PAGE_ORDER)[number];
export type TutorialMovementDirection =
  (typeof TUTORIAL_MOVEMENT_DIRECTIONS)[number];

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

export interface TutorialZoomSnapshot {
  currentZoom?: number;
  currentZoomTarget?: number;
  minZoom: number;
  maxZoom: number;
}

export interface TutorialMovementSnapshot {
  right: number;
  forward: number;
  deltaSeconds: number;
  moved: boolean;
}

const FIRST_PAGE_ID = TUTORIAL_PAGE_ORDER[0];
const PAGE_ID_SET = new Set<string>(TUTORIAL_PAGE_ORDER);
const DIRECTION_SET = new Set<string>(TUTORIAL_MOVEMENT_DIRECTIONS);

export const getTutorialPageOrder = (): readonly TutorialPageId[] => [
  ...TUTORIAL_PAGE_ORDER,
];
export const isTutorialPageId = (value: unknown): value is TutorialPageId =>
  typeof value === 'string' && PAGE_ID_SET.has(value);
const isDirection = (value: string): value is TutorialMovementDirection =>
  DIRECTION_SET.has(value);
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
const normalizePoiIds = (value: unknown): string[] =>
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
  const result = createDefaultTutorialProgress();
  result.movement.forwardSeconds = sanitizeSeconds(movement.forwardSeconds);
  result.movement.leftSeconds = sanitizeSeconds(movement.leftSeconds);
  result.movement.backwardSeconds = sanitizeSeconds(movement.backwardSeconds);
  result.movement.rightSeconds = sanitizeSeconds(movement.rightSeconds);
  result.movement.forwardComplete =
    sanitizeBoolean(movement.forwardComplete) ||
    result.movement.forwardSeconds >= TUTORIAL_MOVEMENT_SECONDS_GOAL;
  result.movement.leftComplete =
    sanitizeBoolean(movement.leftComplete) ||
    result.movement.leftSeconds >= TUTORIAL_MOVEMENT_SECONDS_GOAL;
  result.movement.backwardComplete =
    sanitizeBoolean(movement.backwardComplete) ||
    result.movement.backwardSeconds >= TUTORIAL_MOVEMENT_SECONDS_GOAL;
  result.movement.rightComplete =
    sanitizeBoolean(movement.rightComplete) ||
    result.movement.rightSeconds >= TUTORIAL_MOVEMENT_SECONDS_GOAL;
  result.zoom.zoomInComplete = sanitizeBoolean(zoom.zoomInComplete);
  result.zoom.zoomOutComplete = sanitizeBoolean(zoom.zoomOutComplete);
  result.pois.visitedPoiIds = normalizePoiIds(pois.visitedPoiIds);
  result.gitshelves.completed =
    sanitizeBoolean(gitshelves.completed) ||
    result.pois.visitedPoiIds.includes(GITSHELVES_POI_ID);
  return result;
};
export const createDefaultTutorialState = (): TutorialState => ({
  version: TUTORIAL_STATE_VERSION,
  currentPageId: FIRST_PAGE_ID,
  unlockedPageIds: [FIRST_PAGE_ID],
  completedPageIds: [],
  progress: createDefaultTutorialProgress(),
});
const withDerivedPages = (state: TutorialState): TutorialState => {
  const completed = new Set(state.completedPageIds);
  const unlocked = new Set(state.unlockedPageIds);
  const p = state.progress;
  const movementDone = TUTORIAL_MOVEMENT_DIRECTIONS.every(
    (d) => p.movement[`${d}Complete`]
  );
  if (movementDone) {
    completed.add('welcomeMovement');
    unlocked.add('zoom');
  }
  if (p.zoom.zoomInComplete && p.zoom.zoomOutComplete) {
    completed.add('zoom');
    unlocked.add('visitPois');
  }
  if (p.pois.visitedPoiIds.length >= p.pois.visitedCountGoal) {
    completed.add('visitPois');
    unlocked.add('findGitshelves');
  }
  if (p.gitshelves.completed) completed.add('findGitshelves');
  const order = getTutorialPageOrder();
  return {
    ...state,
    unlockedPageIds: order.filter((id) => unlocked.has(id)),
    completedPageIds: order.filter((id) => completed.has(id)),
  };
};
export const sanitizeTutorialState = (raw: unknown): TutorialState => {
  const record = readRecord(raw);
  if (record.version !== TUTORIAL_STATE_VERSION)
    return createDefaultTutorialState();
  const unlocked = normalizePageIds(record.unlockedPageIds);
  if (!unlocked.includes(FIRST_PAGE_ID)) unlocked.unshift(FIRST_PAGE_ID);
  const requestedCurrent = isTutorialPageId(record.currentPageId)
    ? record.currentPageId
    : FIRST_PAGE_ID;
  const base = withDerivedPages({
    version: TUTORIAL_STATE_VERSION,
    currentPageId: unlocked.includes(requestedCurrent)
      ? requestedCurrent
      : unlocked[0],
    unlockedPageIds: unlocked,
    completedPageIds: normalizePageIds(record.completedPageIds),
    progress: sanitizeProgress(record.progress),
  });
  return base.unlockedPageIds.includes(base.currentPageId)
    ? base
    : { ...base, currentPageId: FIRST_PAGE_ID };
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
    : sanitizeTutorialState({
        ...sanitized,
        unlockedPageIds: [...sanitized.unlockedPageIds, pageId],
      });
};
export const markTutorialPageCompleted = (
  state: TutorialState,
  pageId: TutorialPageId
) => {
  const sanitized = sanitizeTutorialState(state);
  return sanitized.completedPageIds.includes(pageId)
    ? sanitized
    : sanitizeTutorialState({
        ...sanitized,
        completedPageIds: [...sanitized.completedPageIds, pageId],
      });
};
export const deriveTutorialUnlocks = (state: TutorialState): TutorialState =>
  sanitizeTutorialState(state);
export const recordMovementDirectionProgress = (
  state: TutorialState,
  direction: TutorialMovementDirection,
  deltaSeconds: number
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return sanitized;
  const secondsKey = `${direction}Seconds` as const;
  const completeKey = `${direction}Complete` as const;
  if (sanitized.progress.movement[completeKey]) return sanitized;
  const nextSeconds = sanitized.progress.movement[secondsKey] + deltaSeconds;
  return sanitizeTutorialState({
    ...sanitized,
    progress: {
      ...sanitized.progress,
      movement: {
        ...sanitized.progress.movement,
        [secondsKey]: nextSeconds,
        [completeKey]: nextSeconds >= TUTORIAL_MOVEMENT_SECONDS_GOAL,
      },
    },
  });
};
export const recordMovementProgress = (
  state: TutorialState,
  snapshot: TutorialMovementSnapshot
): TutorialState => {
  if (!snapshot.moved) return sanitizeTutorialState(state);
  let next = sanitizeTutorialState(state);
  const pairs: [TutorialMovementDirection, number][] = [
    ['right', snapshot.right],
    ['left', -snapshot.right],
    ['forward', snapshot.forward],
    ['backward', -snapshot.forward],
  ];
  pairs.forEach(([direction, value]) => {
    if (value > TUTORIAL_MOVEMENT_DEADZONE && isDirection(direction)) {
      next = recordMovementDirectionProgress(
        next,
        direction,
        snapshot.deltaSeconds
      );
    }
  });
  return next;
};
export const recordZoomProgress = (
  state: TutorialState,
  snapshot: TutorialZoomSnapshot
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  const range = snapshot.maxZoom - snapshot.minZoom;
  if (!Number.isFinite(range) || range <= 0) return sanitized;
  const zoomInThreshold = snapshot.minZoom + range * 0.99;
  const zoomOutThreshold = snapshot.maxZoom - range * 0.99;
  const values = [snapshot.currentZoom, snapshot.currentZoomTarget].filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value)
  );
  const zoomInComplete =
    sanitized.progress.zoom.zoomInComplete ||
    values.some((value) => value >= zoomInThreshold);
  const zoomOutComplete =
    sanitized.progress.zoom.zoomOutComplete ||
    values.some((value) => value <= zoomOutThreshold);
  if (
    zoomInComplete === sanitized.progress.zoom.zoomInComplete &&
    zoomOutComplete === sanitized.progress.zoom.zoomOutComplete
  ) {
    return sanitized;
  }
  return sanitizeTutorialState({
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
  const ids = [
    ...new Set([...visitedPoiIds].filter((id) => typeof id === 'string')),
  ];
  const gitshelvesCompleted =
    sanitized.progress.gitshelves.completed || ids.includes(GITSHELVES_POI_ID);
  return sanitizeTutorialState({
    ...sanitized,
    progress: {
      ...sanitized.progress,
      pois: {
        visitedPoiIds: ids,
        visitedCountGoal: TUTORIAL_VISITED_POI_COUNT_GOAL,
      },
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
