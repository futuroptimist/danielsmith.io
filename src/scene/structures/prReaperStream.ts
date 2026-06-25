import {
  PR_REAPER_CIRCLE_RADIUS,
  PR_REAPER_MAX_ACTIVE_CIRCLES,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_STREAM_CATCH_UP_SPAWN_CAP,
  PR_REAPER_STREAM_DESCENT_DURATION_SECONDS,
  PR_REAPER_STREAM_END_Y,
  PR_REAPER_STREAM_HORIZONTAL_MARGIN,
  PR_REAPER_STREAM_INTERVAL_MAX_SECONDS,
  PR_REAPER_STREAM_INTERVAL_MIN_SECONDS,
  PR_REAPER_PR_CIRCLE_Z,
  PR_REAPER_STREAM_START_Y,
} from './prReaperInstallationContract';

export type PrReaperCircleType = 'red' | 'green';
export type PrReaperCircleLifecycle = 'active' | 'expired';

export interface PrReaperCircleState {
  id: number;
  type: PrReaperCircleType;
  lifecycle: PrReaperCircleLifecycle;
  normalizedX: number;
  progress: number;
  center: { x: number; y: number; z: number };
  spawnedAt: number;
  expiresAt: number;
}

export interface PrReaperStreamDebugState {
  seed: string;
  nextSpawnTime: number;
  totalSpawned: number;
  totalSpawnedRed: number;
  totalSpawnedGreen: number;
  totalExpiredRed: number;
  totalExpiredGreen: number;
  activeCandidateCount: number;
  activeCandidates: PrReaperCircleState[];
  droppedCappedSpawnCount: number;
  spawnHistory: readonly PrReaperCircleType[];
  spawnIntervals: readonly number[];
}

export interface PrReaperStreamState {
  advance(delta: number): void;
  getDebugState(): PrReaperStreamDebugState;
}

export const PR_REAPER_DEFAULT_STREAM_SEED = 'pr-reaper-holographic-reaper:v1';
export type PrReaperRandomSource = () => number;

export interface PrReaperStreamOptions {
  seed?: string;
  random?: PrReaperRandomSource;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createPrReaperSeededRandom(seed: string): PrReaperRandomSource {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function cloneCandidate(candidate: InternalCandidate): PrReaperCircleState {
  return {
    id: candidate.id,
    type: candidate.type,
    lifecycle: candidate.lifecycle,
    normalizedX: candidate.normalizedX,
    progress: candidate.progress,
    center: { ...candidate.center },
    spawnedAt: candidate.spawnedAt,
    expiresAt: candidate.expiresAt,
  };
}

interface InternalCandidate extends PrReaperCircleState {}

export function createPrReaperStream(
  options: PrReaperStreamOptions = {}
): PrReaperStreamState {
  const seed = options.seed ?? PR_REAPER_DEFAULT_STREAM_SEED;
  const random = options.random ?? createPrReaperSeededRandom(seed);
  const active: InternalCandidate[] = [];
  const batch: PrReaperCircleType[] = [];
  const spawnHistory: PrReaperCircleType[] = [];
  const spawnIntervals: number[] = [];
  let time = 0;
  let nextId = 1;
  const initialInterval = nextInterval();
  let nextSpawnTime = initialInterval;
  let totalSpawnedRed = 0;
  let totalSpawnedGreen = 0;
  let totalExpiredRed = 0;
  let totalExpiredGreen = 0;
  let droppedCappedSpawnCount = 0;

  function nextInterval(): number {
    const span =
      PR_REAPER_STREAM_INTERVAL_MAX_SECONDS -
      PR_REAPER_STREAM_INTERVAL_MIN_SECONDS;
    return PR_REAPER_STREAM_INTERVAL_MIN_SECONDS + random() * span;
  }

  function nextType(): PrReaperCircleType {
    if (batch.length === 0) {
      batch.push('red', 'red', 'red', 'green');
      for (let i = batch.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [batch[i], batch[j]] = [batch[j], batch[i]];
      }
    }
    return batch.pop() ?? 'red';
  }

  function spawn(at: number): void {
    const type = nextType();
    const minX = PR_REAPER_STREAM_HORIZONTAL_MARGIN + PR_REAPER_CIRCLE_RADIUS;
    const maxX = PR_REAPER_SCREEN_WIDTH - minX;
    const normalizedX =
      minX / PR_REAPER_SCREEN_WIDTH +
      random() * ((maxX - minX) / PR_REAPER_SCREEN_WIDTH);
    const centerX =
      normalizedX * PR_REAPER_SCREEN_WIDTH - PR_REAPER_SCREEN_WIDTH / 2;
    const candidate: InternalCandidate = {
      id: nextId,
      type,
      lifecycle: 'active',
      normalizedX,
      progress: 0,
      center: {
        x: centerX,
        y: PR_REAPER_STREAM_START_Y,
        z: PR_REAPER_PR_CIRCLE_Z,
      },
      spawnedAt: at,
      expiresAt: at + PR_REAPER_STREAM_DESCENT_DURATION_SECONDS,
    };
    nextId += 1;
    active.push(candidate);
    spawnHistory.push(type);
    if (type === 'red') totalSpawnedRed += 1;
    else totalSpawnedGreen += 1;
  }

  function updateActive(): void {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      const candidate = active[i];
      const progress = clamp01(
        (time - candidate.spawnedAt) / PR_REAPER_STREAM_DESCENT_DURATION_SECONDS
      );
      candidate.progress = progress;
      candidate.center.y =
        PR_REAPER_STREAM_START_Y +
        (PR_REAPER_STREAM_END_Y - PR_REAPER_STREAM_START_Y) * progress;
      if (
        time >= candidate.expiresAt &&
        candidate.center.y <= PR_REAPER_STREAM_END_Y
      ) {
        candidate.lifecycle = 'expired';
        if (candidate.type === 'red') totalExpiredRed += 1;
        else totalExpiredGreen += 1;
        active.splice(i, 1);
      }
    }
  }

  return {
    advance(delta: number): void {
      const safeDelta = Number.isFinite(delta) && delta > 0 ? delta : 0;
      time += safeDelta;
      let spawnedThisAdvance = 0;
      while (time >= nextSpawnTime) {
        if (
          spawnedThisAdvance >= PR_REAPER_STREAM_CATCH_UP_SPAWN_CAP ||
          active.length >= PR_REAPER_MAX_ACTIVE_CIRCLES
        ) {
          droppedCappedSpawnCount += 1;
          nextSpawnTime = time + nextInterval();
          spawnIntervals.push(nextSpawnTime - time);
          break;
        }
        spawn(nextSpawnTime);
        spawnedThisAdvance += 1;
        const interval = nextInterval();
        spawnIntervals.push(interval);
        nextSpawnTime += interval;
      }
      updateActive();
    },
    getDebugState(): PrReaperStreamDebugState {
      return {
        seed,
        nextSpawnTime,
        totalSpawned: totalSpawnedRed + totalSpawnedGreen,
        totalSpawnedRed,
        totalSpawnedGreen,
        totalExpiredRed,
        totalExpiredGreen,
        activeCandidateCount: active.length,
        activeCandidates: active.map(cloneCandidate),
        droppedCappedSpawnCount,
        spawnHistory: [...spawnHistory],
        spawnIntervals: [initialInterval, ...spawnIntervals],
      };
    },
  };
}

export function advancePrReaperStream(
  stream: PrReaperStreamState,
  delta: number
): void {
  stream.advance(delta);
}
