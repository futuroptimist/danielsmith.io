import {
  PR_REAPER_CIRCLE_HORIZONTAL_MARGIN,
  PR_REAPER_CIRCLE_RADIUS,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_STREAM_DESCENT_DURATION_SECONDS,
  PR_REAPER_STREAM_END_Y,
  PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MAX_SECONDS,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS,
  PR_REAPER_STREAM_START_Y,
} from './prReaperInstallationContract';

export type PrReaperCircleType = 'red' | 'green';
export type PrReaperCircleLifecycle = 'active' | 'expired';
export type PrReaperRandomSource = () => number;

export interface PrReaperCircleState {
  id: number;
  type: PrReaperCircleType;
  lifecycle: PrReaperCircleLifecycle;
  normalizedX: number;
  progress: number;
  center: { x: number; y: number; z: number };
  spawnedAt: number;
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
  spawnIntervals: number[];
  spawnedTypes: PrReaperCircleType[];
}

interface ActiveCandidate {
  id: number;
  type: PrReaperCircleType;
  normalizedX: number;
  spawnedAt: number;
  progress: number;
  centerX: number;
  centerY: number;
}

export const PR_REAPER_DEFAULT_STREAM_SEED = 'pr-reaper-holographic-reaper:v1';

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createPrReaperSeededRandom(seed: string): PrReaperRandomSource {
  let state = hashSeed(seed) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clampDelta(delta: number): number {
  return Number.isFinite(delta) && delta > 0 ? delta : 0;
}

function cloneCandidate(candidate: ActiveCandidate): PrReaperCircleState {
  return {
    id: candidate.id,
    type: candidate.type,
    lifecycle: 'active',
    normalizedX: candidate.normalizedX,
    progress: candidate.progress,
    center: { x: candidate.centerX, y: candidate.centerY, z: 0.018 },
    spawnedAt: candidate.spawnedAt,
  };
}

export class PrReaperStreamState {
  readonly seed: string;

  private readonly random: PrReaperRandomSource;
  private readonly active: ActiveCandidate[] = [];
  private readonly batch: PrReaperCircleType[] = [];
  private readonly spawnIntervals: number[] = [];
  private readonly spawnedTypes: PrReaperCircleType[] = [];
  private currentTime = 0;
  private nextId = 1;
  private nextSpawnTime: number;
  private totalSpawnedRed = 0;
  private totalSpawnedGreen = 0;
  private totalExpiredRed = 0;
  private totalExpiredGreen = 0;
  private droppedCappedSpawnCount = 0;

  constructor(
    seed = PR_REAPER_DEFAULT_STREAM_SEED,
    random?: PrReaperRandomSource
  ) {
    this.seed = seed;
    this.random = random ?? createPrReaperSeededRandom(seed);
    this.nextSpawnTime = this.randomInterval();
  }

  advance(delta: number): void {
    this.currentTime += clampDelta(delta);
    this.expireAndAdvanceActive();
    let spawnedThisStep = 0;
    while (this.currentTime >= this.nextSpawnTime) {
      if (spawnedThisStep >= PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS) {
        this.droppedCappedSpawnCount += 1;
        this.nextSpawnTime = this.currentTime + this.randomInterval();
        break;
      }
      this.spawn(this.nextSpawnTime);
      spawnedThisStep += 1;
      this.nextSpawnTime += this.randomInterval();
    }
    this.expireAndAdvanceActive();
  }

  getDebugState(): PrReaperStreamDebugState {
    return {
      seed: this.seed,
      nextSpawnTime: this.nextSpawnTime,
      totalSpawned: this.totalSpawnedRed + this.totalSpawnedGreen,
      totalSpawnedRed: this.totalSpawnedRed,
      totalSpawnedGreen: this.totalSpawnedGreen,
      totalExpiredRed: this.totalExpiredRed,
      totalExpiredGreen: this.totalExpiredGreen,
      activeCandidateCount: this.active.length,
      activeCandidates: this.active.map(cloneCandidate),
      droppedCappedSpawnCount: this.droppedCappedSpawnCount,
      spawnIntervals: [...this.spawnIntervals],
      spawnedTypes: [...this.spawnedTypes],
    };
  }

  private randomInterval(): number {
    const interval =
      PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS +
      this.random() *
        (PR_REAPER_STREAM_SPAWN_INTERVAL_MAX_SECONDS -
          PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS);
    this.spawnIntervals.push(interval);
    return interval;
  }

  private nextType(): PrReaperCircleType {
    if (this.batch.length === 0) {
      this.batch.push('red', 'red', 'red', 'green');
      for (let index = this.batch.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(this.random() * (index + 1));
        [this.batch[index], this.batch[swapIndex]] = [
          this.batch[swapIndex],
          this.batch[index],
        ];
      }
    }
    return this.batch.pop() ?? 'red';
  }

  private spawn(spawnedAt: number): void {
    const type = this.nextType();
    const normalizedX = this.random();
    const xRange =
      PR_REAPER_SCREEN_WIDTH -
      PR_REAPER_CIRCLE_HORIZONTAL_MARGIN * 2 -
      PR_REAPER_CIRCLE_RADIUS * 2;
    const minX =
      -PR_REAPER_SCREEN_WIDTH / 2 +
      PR_REAPER_CIRCLE_HORIZONTAL_MARGIN +
      PR_REAPER_CIRCLE_RADIUS;
    const centerX = minX + normalizedX * xRange;
    this.active.push({
      id: this.nextId,
      type,
      normalizedX,
      spawnedAt,
      progress: 0,
      centerX,
      centerY: PR_REAPER_STREAM_START_Y,
    });
    this.nextId += 1;
    this.spawnedTypes.push(type);
    if (type === 'red') this.totalSpawnedRed += 1;
    else this.totalSpawnedGreen += 1;
  }

  private expireAndAdvanceActive(): void {
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const candidate = this.active[index];
      candidate.progress = Math.min(
        1,
        Math.max(
          0,
          (this.currentTime - candidate.spawnedAt) /
            PR_REAPER_STREAM_DESCENT_DURATION_SECONDS
        )
      );
      candidate.centerY =
        PR_REAPER_STREAM_START_Y +
        (PR_REAPER_STREAM_END_Y - PR_REAPER_STREAM_START_Y) *
          candidate.progress;
      if (candidate.centerY <= PR_REAPER_STREAM_END_Y) {
        if (candidate.type === 'red') this.totalExpiredRed += 1;
        else this.totalExpiredGreen += 1;
        this.active.splice(index, 1);
      }
    }
  }
}

export function createPrReaperStream(options?: {
  seed?: string;
  random?: PrReaperRandomSource;
}): PrReaperStreamState {
  return new PrReaperStreamState(options?.seed, options?.random);
}

export function advancePrReaperStream(
  stream: PrReaperStreamState,
  delta: number
): void {
  stream.advance(delta);
}

export const PR_REAPER_SCREEN_LOCAL_STREAM_BOUNDS = {
  top: PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT,
  bottom: PR_REAPER_SCREEN_BOTTOM_Y,
};
