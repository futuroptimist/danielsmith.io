import {
  PR_REAPER_PR_CIRCLE_HORIZONTAL_MARGIN,
  PR_REAPER_PR_CIRCLE_RADIUS,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_STREAM_DESCENT_DURATION,
  PR_REAPER_STREAM_END_Y,
  PR_REAPER_STREAM_MAX_SPAWNS_PER_ADVANCE,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MAX,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MIN,
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
  spawnLog: Array<{
    id: number;
    type: PrReaperCircleType;
    normalizedX: number;
    spawnedAt: number;
    interval: number;
  }>;
}

export interface PrReaperStreamState {
  advance(delta: number): void;
  getDebugState(): PrReaperStreamDebugState;
}

export interface PrReaperStreamOptions {
  seed?: string;
  random?: () => number;
}

export const DEFAULT_PR_REAPER_STREAM_SEED = 'pr-reaper-holographic-reaper:v1';

const SCREEN_SAFE_HALF_WIDTH =
  PR_REAPER_SCREEN_WIDTH / 2 -
  PR_REAPER_PR_CIRCLE_RADIUS -
  PR_REAPER_PR_CIRCLE_HORIZONTAL_MARGIN;

function xmur3(input: string): () => number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function createPrReaperSeededRandom(seed: string): () => number {
  const seedHash = xmur3(seed);
  let a = seedHash();
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampDelta(delta: number): number {
  return Number.isFinite(delta) && delta > 0 ? delta : 0;
}

function cloneCandidate(candidate: PrReaperCircleState): PrReaperCircleState {
  return {
    ...candidate,
    center: { ...candidate.center },
  };
}

export function createPrReaperStream(
  options: PrReaperStreamOptions = {}
): PrReaperStreamState {
  const seed = options.seed ?? DEFAULT_PR_REAPER_STREAM_SEED;
  const random = options.random ?? createPrReaperSeededRandom(seed);
  const active: PrReaperCircleState[] = [];
  const spawnLog: PrReaperStreamDebugState['spawnLog'] = [];
  let batch: PrReaperCircleType[] = [];
  let nextId = 1;
  let time = 0;
  let nextSpawnTime = randomInterval();
  let totalSpawnedRed = 0;
  let totalSpawnedGreen = 0;
  let totalExpiredRed = 0;
  let totalExpiredGreen = 0;
  let droppedCappedSpawnCount = 0;

  function randomUnit(): number {
    const value = random();
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  }

  function randomInterval(): number {
    return (
      PR_REAPER_STREAM_SPAWN_INTERVAL_MIN +
      randomUnit() *
        (PR_REAPER_STREAM_SPAWN_INTERVAL_MAX -
          PR_REAPER_STREAM_SPAWN_INTERVAL_MIN)
    );
  }

  function refillBatch(): void {
    batch = ['red', 'red', 'red', 'green'];
    for (let i = batch.length - 1; i > 0; i -= 1) {
      const j = Math.floor(randomUnit() * (i + 1));
      [batch[i], batch[j]] = [batch[j], batch[i]];
    }
  }

  function nextType(): PrReaperCircleType {
    if (batch.length === 0) refillBatch();
    return batch.shift() ?? 'red';
  }

  function updateCandidate(candidate: PrReaperCircleState, now: number): void {
    const progress = Math.min(
      1,
      Math.max(
        0,
        (now - candidate.spawnedAt) / PR_REAPER_STREAM_DESCENT_DURATION
      )
    );
    candidate.progress = progress;
    candidate.center.y =
      PR_REAPER_STREAM_START_Y +
      (PR_REAPER_STREAM_END_Y - PR_REAPER_STREAM_START_Y) * progress;
    candidate.lifecycle = progress >= 1 ? 'expired' : 'active';
  }

  function spawn(now: number, interval: number): void {
    const type = nextType();
    const normalizedX = randomUnit();
    const x = (normalizedX * 2 - 1) * SCREEN_SAFE_HALF_WIDTH;
    const candidate: PrReaperCircleState = {
      id: nextId,
      type,
      lifecycle: 'active',
      normalizedX,
      progress: 0,
      center: { x, y: PR_REAPER_STREAM_START_Y, z: 0 },
      spawnedAt: now,
      expiresAt: now + PR_REAPER_STREAM_DESCENT_DURATION,
    };
    nextId += 1;
    active.push(candidate);
    spawnLog.push({
      id: candidate.id,
      type,
      normalizedX,
      spawnedAt: now,
      interval,
    });
    if (type === 'red') totalSpawnedRed += 1;
    else totalSpawnedGreen += 1;
  }

  return {
    advance(delta: number) {
      time += clampDelta(delta);
      let spawnCount = 0;
      while (time >= nextSpawnTime) {
        if (spawnCount >= PR_REAPER_STREAM_MAX_SPAWNS_PER_ADVANCE) {
          droppedCappedSpawnCount += 1;
          nextSpawnTime = time + randomInterval();
          break;
        }
        const interval = randomInterval();
        spawn(
          nextSpawnTime,
          nextSpawnTime === 0
            ? interval
            : nextSpawnTime - (spawnLog.at(-1)?.spawnedAt ?? 0)
        );
        nextSpawnTime += interval;
        spawnCount += 1;
      }

      for (let i = active.length - 1; i >= 0; i -= 1) {
        const candidate = active[i];
        updateCandidate(candidate, time);
        if (candidate.lifecycle === 'expired') {
          if (candidate.type === 'red') totalExpiredRed += 1;
          else totalExpiredGreen += 1;
          active.splice(i, 1);
        }
      }
    },
    getDebugState() {
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
        spawnLog: spawnLog.map((entry) => ({ ...entry })),
      };
    },
  };
}
