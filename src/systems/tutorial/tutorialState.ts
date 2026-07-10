export const TUTORIAL_STATE_VERSION = 1;

export const TUTORIAL_PAGE_ORDER = [
  'welcomeMovement',
  'zoom',
  'visitPois',
  'findGitshelves',
] as const;

export const TUTORIAL_MOVEMENT_SECONDS_REQUIRED = 0.25;
export const TUTORIAL_MOVEMENT_DEADZONE = 0.2;
export const TUTORIAL_VISITED_POI_GOAL = 3;
export const GITSHELVES_POI_ID = 'gitshelves-living-room-installation';

export type TutorialPageId = (typeof TUTORIAL_PAGE_ORDER)[number];
export type TutorialMovementDirection =
  | 'forward'
  | 'left'
  | 'backward'
  | 'right';

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

export interface TutorialMovementInputSnapshot {
  forward: number;
  left: number;
  backward: number;
  right: number;
  deltaSeconds: number;
  moved: boolean;
}

export interface TutorialZoomSnapshot {
  currentZoom: number;
  currentZoomTarget: number;
  minZoom: number;
  maxZoom: number;
}

const FIRST_PAGE_ID = TUTORIAL_PAGE_ORDER[0];
const PAGE_ID_SET = new Set<string>(TUTORIAL_PAGE_ORDER);
const MOVEMENT_SECONDS_KEYS = {
  forward: 'forwardSeconds',
  left: 'leftSeconds',
  backward: 'backwardSeconds',
  right: 'rightSeconds',
} as const;
const MOVEMENT_COMPLETE_KEYS = {
  forward: 'forwardComplete',
  left: 'leftComplete',
  backward: 'backwardComplete',
  right: 'rightComplete',
} as const;
const MOVEMENT_DIRECTIONS: readonly TutorialMovementDirection[] = [
  'forward',
  'left',
  'backward',
  'right',
];

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
const uniqueStringIds = (value: unknown): string[] =>
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
  pois: { visitedPoiIds: [], visitedCountGoal: TUTORIAL_VISITED_POI_GOAL },
  gitshelves: { completed: false },
});

const sanitizeProgress = (value: unknown): TutorialProgress => {
  const progress = readRecord(value);
  const movement = readRecord(progress.movement);
  const zoom = readRecord(progress.zoom);
  const pois = readRecord(progress.pois);
  const gitshelves = readRecord(progress.gitshelves);
  const sanitizedMovement = {
    forwardSeconds: sanitizeSeconds(movement.forwardSeconds),
    leftSeconds: sanitizeSeconds(movement.leftSeconds),
    backwardSeconds: sanitizeSeconds(movement.backwardSeconds),
    rightSeconds: sanitizeSeconds(movement.rightSeconds),
    forwardComplete: sanitizeBoolean(movement.forwardComplete),
    leftComplete: sanitizeBoolean(movement.leftComplete),
    backwardComplete: sanitizeBoolean(movement.backwardComplete),
    rightComplete: sanitizeBoolean(movement.rightComplete),
  };
  MOVEMENT_DIRECTIONS.forEach((direction) => {
    const secondsKey = MOVEMENT_SECONDS_KEYS[direction];
    const completeKey = MOVEMENT_COMPLETE_KEYS[direction];
    if (sanitizedMovement[secondsKey] >= TUTORIAL_MOVEMENT_SECONDS_REQUIRED) {
      sanitizedMovement[completeKey] = true;
    }
    if (sanitizedMovement[completeKey]) {
      sanitizedMovement[secondsKey] = Math.max(
        sanitizedMovement[secondsKey],
        TUTORIAL_MOVEMENT_SECONDS_REQUIRED
      );
    }
  });
  const visitedPoiIds = uniqueStringIds(pois.visitedPoiIds);
  return {
    movement: sanitizedMovement,
    zoom: {
      zoomInComplete: sanitizeBoolean(zoom.zoomInComplete),
      zoomOutComplete: sanitizeBoolean(zoom.zoomOutComplete),
    },
    pois: { visitedPoiIds, visitedCountGoal: TUTORIAL_VISITED_POI_GOAL },
    gitshelves: {
      completed:
        sanitizeBoolean(gitshelves.completed) ||
        visitedPoiIds.includes(GITSHELVES_POI_ID),
    },
  };
};

export const createDefaultTutorialState = (): TutorialState => ({
  version: TUTORIAL_STATE_VERSION,
  currentPageId: FIRST_PAGE_ID,
  unlockedPageIds: [FIRST_PAGE_ID],
  completedPageIds: [],
  progress: createDefaultTutorialProgress(),
});

const orderedPagesFromSet = (pages: ReadonlySet<TutorialPageId>) =>
  TUTORIAL_PAGE_ORDER.filter((pageId) => pages.has(pageId));

export const deriveTutorialUnlocks = (state: TutorialState): TutorialState => {
  const sanitized = sanitizeTutorialStateWithoutDeriving(state);
  const progress = sanitized.progress;
  const unlocked = new Set<TutorialPageId>(sanitized.unlockedPageIds);
  const completed = new Set<TutorialPageId>(sanitized.completedPageIds);
  const movementComplete = MOVEMENT_DIRECTIONS.every(
    (direction) => progress.movement[MOVEMENT_COMPLETE_KEYS[direction]]
  );
  if (movementComplete) {
    completed.add('welcomeMovement');
    unlocked.add('zoom');
  }
  if (progress.zoom.zoomInComplete && progress.zoom.zoomOutComplete) {
    completed.add('zoom');
    unlocked.add('visitPois');
  }
  if (progress.pois.visitedPoiIds.length >= TUTORIAL_VISITED_POI_GOAL) {
    completed.add('visitPois');
    unlocked.add('findGitshelves');
  }
  if (progress.gitshelves.completed) completed.add('findGitshelves');
  return {
    ...sanitized,
    unlockedPageIds: orderedPagesFromSet(unlocked),
    completedPageIds: orderedPagesFromSet(completed),
  };
};

const sanitizeTutorialStateWithoutDeriving = (raw: unknown): TutorialState => {
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
    unlockedPageIds: orderedPagesFromSet(new Set(unlocked)),
    completedPageIds: orderedPagesFromSet(new Set(completed)),
    progress: sanitizeProgress(record.progress),
  };
};

export const sanitizeTutorialState = (raw: unknown): TutorialState =>
  deriveTutorialUnlocks(sanitizeTutorialStateWithoutDeriving(raw));
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
    : deriveTutorialUnlocks({
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
    : deriveTutorialUnlocks({
        ...sanitized,
        completedPageIds: [...sanitized.completedPageIds, pageId],
      });
};

export const recordMovementDirectionProgress = (
  state: TutorialState,
  direction: TutorialMovementDirection,
  deltaSeconds: number
): TutorialState => {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0)
    return sanitizeTutorialState(state);
  const sanitized = sanitizeTutorialState(state);
  const secondsKey = MOVEMENT_SECONDS_KEYS[direction];
  const completeKey = MOVEMENT_COMPLETE_KEYS[direction];
  if (sanitized.progress.movement[completeKey]) return sanitized;
  const nextSeconds = Math.min(
    TUTORIAL_MOVEMENT_SECONDS_REQUIRED,
    sanitized.progress.movement[secondsKey] + deltaSeconds
  );
  return deriveTutorialUnlocks({
    ...sanitized,
    progress: {
      ...sanitized.progress,
      movement: {
        ...sanitized.progress.movement,
        [secondsKey]: nextSeconds,
        [completeKey]: nextSeconds >= TUTORIAL_MOVEMENT_SECONDS_REQUIRED,
      },
    },
  });
};

export const recordMovementProgress = (
  state: TutorialState,
  snapshot: TutorialMovementInputSnapshot
): TutorialState => {
  if (
    !snapshot.moved ||
    !Number.isFinite(snapshot.deltaSeconds) ||
    snapshot.deltaSeconds <= 0
  ) {
    return sanitizeTutorialState(state);
  }
  return MOVEMENT_DIRECTIONS.reduce((nextState, direction) => {
    return snapshot[direction] > TUTORIAL_MOVEMENT_DEADZONE
      ? recordMovementDirectionProgress(
          nextState,
          direction,
          snapshot.deltaSeconds
        )
      : nextState;
  }, sanitizeTutorialState(state));
};

export const recordZoomProgress = (
  state: TutorialState,
  snapshot: TutorialZoomSnapshot
): TutorialState => {
  const sanitized = sanitizeTutorialState(state);
  const { minZoom, maxZoom } = snapshot;
  if (
    ![snapshot.currentZoom, snapshot.currentZoomTarget, minZoom, maxZoom].every(
      Number.isFinite
    ) ||
    maxZoom <= minZoom
  ) {
    return sanitized;
  }
  const range = maxZoom - minZoom;
  const inThreshold = maxZoom - range * 0.01;
  const outThreshold = minZoom + range * 0.01;
  const zoomInComplete =
    sanitized.progress.zoom.zoomInComplete ||
    snapshot.currentZoom >= inThreshold ||
    snapshot.currentZoomTarget >= inThreshold;
  const zoomOutComplete =
    sanitized.progress.zoom.zoomOutComplete ||
    snapshot.currentZoom <= outThreshold ||
    snapshot.currentZoomTarget <= outThreshold;
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
  const ids = [
    ...new Set(
      Array.from(visitedPoiIds).filter((id) => typeof id === 'string')
    ),
  ];
  const merged = [
    ...new Set([...sanitized.progress.pois.visitedPoiIds, ...ids]),
  ];
  const gitshelvesCompleted =
    sanitized.progress.gitshelves.completed ||
    merged.includes(GITSHELVES_POI_ID);
  if (
    merged.length === sanitized.progress.pois.visitedPoiIds.length &&
    gitshelvesCompleted === sanitized.progress.gitshelves.completed
  ) {
    return sanitized;
  }
  return deriveTutorialUnlocks({
    ...sanitized,
    progress: {
      ...sanitized.progress,
      pois: { ...sanitized.progress.pois, visitedPoiIds: merged },
      gitshelves: { completed: gitshelvesCompleted },
    },
  });
};

export const recordGitshelvesVisited = (state: TutorialState): TutorialState =>
  recordVisitedPois(state, [GITSHELVES_POI_ID]);

export const isTutorialComplete = (state: TutorialState): boolean => {
  const completed = new Set(getCompletedTutorialPages(state));
  return TUTORIAL_PAGE_ORDER.every((pageId) => completed.has(pageId));
};
