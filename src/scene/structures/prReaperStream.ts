import {
  PR_REAPER_STREAM_CIRCLE_RADIUS,
  PR_REAPER_STREAM_DESCENT_DURATION_SECONDS,
  PR_REAPER_STREAM_END_Y,
  PR_REAPER_STREAM_HORIZONTAL_MARGIN,
  PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS,
  PR_REAPER_STREAM_MAX_DELTA_SECONDS,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MAX_SECONDS,
  PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS,
  PR_REAPER_STREAM_START_Y,
  PR_REAPER_STREAM_Z,
  PR_REAPER_SCREEN_WIDTH,
} from './prReaperInstallationContract';

export type PrReaperCircleType = 'red' | 'green';
export type PrReaperCircleLifecycle = 'active' | 'reaped';

export interface PrReaperCircleState {
  id: number;
  type: PrReaperCircleType;
  lifecycle: PrReaperCircleLifecycle;
  normalizedX: number;
  progress: number;
  center: { x: number; y: number; z: number };
}

export interface PrReaperStreamDebugState {
  seed: string;
  nextSpawnTime: number;
  totalSpawned: number;
  totalSpawnedRed: number;
  totalSpawnedGreen: number;
  totalExpiredRed: number;
  totalExpiredGreen: number;
  totalReapedRed: number;
  lastReapedCandidateId: number | null;
  lastReapedAt: number | null;
  attemptedGreenReapCount: number;
  activeCandidateCount: number;
  activeCandidates: PrReaperCircleState[];
  cappedSpawnCount: number;
  spawnHistory: ReadonlyArray<{
    id: number;
    type: PrReaperCircleType;
    normalizedX: number;
    spawnedAt: number;
    interval: number;
  }>;
}

interface InternalCandidate {
  id: number;
  type: PrReaperCircleType;
  normalizedX: number;
  spawnedAt: number;
}
type SpawnHistoryEntry = PrReaperStreamDebugState['spawnHistory'][number];

export interface PrReaperStreamOptions {
  seed?: string;
  random?: () => number;
}

export const PR_REAPER_STREAM_DEFAULT_SEED = 'pr-reaper-holographic-reaper:v1';
export const PR_REAPER_STREAM_DEBUG_HISTORY_LIMIT = 128;

function xmur3(input: string): () => number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPrReaperSeededRandom(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

function clampRandom(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 0.999999999999;
  return value;
}

function sanitizeDelta(delta: number): number {
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return Math.min(delta, PR_REAPER_STREAM_MAX_DELTA_SECONDS);
}

export class PrReaperStreamState {
  readonly seed: string;
  private readonly random: () => number;
  private elapsed = 0;
  private nextSpawnTime: number;
  private nextId = 1;
  private batch: PrReaperCircleType[] = [];
  private batchIndex = 0;
  private active: InternalCandidate[] = [];
  private history: SpawnHistoryEntry[] = [];
  private totalSpawnedRed = 0;
  private totalSpawnedGreen = 0;
  private totalExpiredRed = 0;
  private totalExpiredGreen = 0;
  private totalReapedRed = 0;
  private lastReapedCandidateId: number | null = null;
  private lastReapedAt: number | null = null;
  private attemptedGreenReapCount = 0;
  private reapedIds = new Set<number>();
  private cappedSpawnCount = 0;

  constructor(options: PrReaperStreamOptions = {}) {
    this.seed = options.seed ?? PR_REAPER_STREAM_DEFAULT_SEED;
    this.random = options.random ?? createPrReaperSeededRandom(this.seed);
    this.nextSpawnTime = this.nextInterval();
  }

  advance(delta: number): void {
    this.elapsed += sanitizeDelta(delta);
    let spawned = 0;
    while (
      this.elapsed >= this.nextSpawnTime &&
      spawned < PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS
    ) {
      this.spawn(this.nextSpawnTime);
      this.nextSpawnTime += this.nextInterval();
      spawned += 1;
    }
    if (this.elapsed >= this.nextSpawnTime) {
      this.cappedSpawnCount += 1;
      this.nextSpawnTime = this.elapsed + this.nextInterval();
    }
    this.expireExited();
  }

  getDebugState(): PrReaperStreamDebugState {
    const activeCandidates: PrReaperCircleState[] = [];
    this.writeActiveCandidates(activeCandidates, true);
    return {
      seed: this.seed,
      nextSpawnTime: this.nextSpawnTime,
      totalSpawned: this.totalSpawnedRed + this.totalSpawnedGreen,
      totalSpawnedRed: this.totalSpawnedRed,
      totalSpawnedGreen: this.totalSpawnedGreen,
      totalExpiredRed: this.totalExpiredRed,
      totalExpiredGreen: this.totalExpiredGreen,
      totalReapedRed: this.totalReapedRed,
      lastReapedCandidateId: this.lastReapedCandidateId,
      lastReapedAt: this.lastReapedAt,
      attemptedGreenReapCount: this.attemptedGreenReapCount,
      activeCandidateCount: activeCandidates.length,
      activeCandidates,
      cappedSpawnCount: this.cappedSpawnCount,
      spawnHistory: this.history.map((entry) => ({ ...entry })),
    };
  }

  getCandidateById(id: number): PrReaperCircleState | null {
    const candidate = this.active.find((item) => item.id === id);
    if (!candidate) return null;
    const state: PrReaperCircleState = {
      id: 0,
      type: 'red',
      lifecycle: 'active',
      normalizedX: 0,
      progress: 0,
      center: { x: 0, y: 0, z: PR_REAPER_STREAM_Z },
    };
    this.writeCircleState(candidate, state);
    return state;
  }

  reapCandidate(id: number, now = this.elapsed): PrReaperCircleState | null {
    if (this.reapedIds.has(id)) return null;
    const index = this.active.findIndex((candidate) => candidate.id === id);
    if (index < 0) return null;
    const candidate = this.active[index];
    if (candidate.type !== 'red') {
      this.attemptedGreenReapCount += 1;
      return null;
    }
    const state = this.getCandidateById(id);
    if (!state) return null;
    state.lifecycle = 'reaped';
    this.active.splice(index, 1);
    this.reapedIds.add(id);
    this.totalReapedRed += 1;
    this.lastReapedCandidateId = id;
    this.lastReapedAt = Number.isFinite(now) ? now : this.elapsed;
    return state;
  }

  writeActiveCandidates(
    target: PrReaperCircleState[],
    truncate = false
  ): number {
    for (let i = 0; i < this.active.length; i += 1) {
      const candidate = this.active[i];
      const state =
        target[i] ??
        (target[i] = {
          id: 0,
          type: 'red',
          lifecycle: 'active',
          normalizedX: 0,
          progress: 0,
          center: { x: 0, y: 0, z: PR_REAPER_STREAM_Z },
        });
      this.writeCircleState(candidate, state);
    }
    if (truncate) target.length = this.active.length;
    return this.active.length;
  }

  private nextInterval(): number {
    return (
      PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS +
      clampRandom(this.random()) *
        (PR_REAPER_STREAM_SPAWN_INTERVAL_MAX_SECONDS -
          PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS)
    );
  }

  private nextType(): PrReaperCircleType {
    if (this.batchIndex >= this.batch.length) {
      this.batch = ['red', 'red', 'red', 'green'];
      for (let i = this.batch.length - 1; i > 0; i -= 1) {
        const j = Math.floor(clampRandom(this.random()) * (i + 1));
        [this.batch[i], this.batch[j]] = [this.batch[j], this.batch[i]];
      }
      this.batchIndex = 0;
    }
    const type = this.batch[this.batchIndex];
    this.batchIndex += 1;
    return type;
  }

  private spawn(spawnedAt: number): void {
    const type = this.nextType();
    const horizontalSafeWidth =
      PR_REAPER_SCREEN_WIDTH -
      (PR_REAPER_STREAM_HORIZONTAL_MARGIN + PR_REAPER_STREAM_CIRCLE_RADIUS) * 2;
    const left =
      -PR_REAPER_SCREEN_WIDTH / 2 +
      PR_REAPER_STREAM_HORIZONTAL_MARGIN +
      PR_REAPER_STREAM_CIRCLE_RADIUS;
    const x = left + clampRandom(this.random()) * horizontalSafeWidth;
    const normalizedX =
      (x + PR_REAPER_SCREEN_WIDTH / 2) / PR_REAPER_SCREEN_WIDTH;
    const entry = {
      id: this.nextId,
      type,
      normalizedX,
      spawnedAt,
      interval:
        spawnedAt - (this.history[this.history.length - 1]?.spawnedAt ?? 0),
    };
    this.nextId += 1;
    this.history.push(entry);
    if (this.history.length > PR_REAPER_STREAM_DEBUG_HISTORY_LIMIT) {
      this.history.shift();
    }
    this.active.push({ ...entry });
    if (type === 'red') this.totalSpawnedRed += 1;
    else this.totalSpawnedGreen += 1;
  }

  private expireExited(): void {
    let write = 0;
    for (let read = 0; read < this.active.length; read += 1) {
      const candidate = this.active[read];
      const progress = this.getProgress(candidate);
      if (progress >= 1) {
        if (candidate.type === 'red') this.totalExpiredRed += 1;
        else this.totalExpiredGreen += 1;
      } else {
        this.active[write] = candidate;
        write += 1;
      }
    }
    this.active.length = write;
  }

  private getProgress(candidate: InternalCandidate): number {
    return Math.min(
      1,
      Math.max(
        0,
        (this.elapsed - candidate.spawnedAt) /
          PR_REAPER_STREAM_DESCENT_DURATION_SECONDS
      )
    );
  }

  private writeCircleState(
    candidate: InternalCandidate,
    state: PrReaperCircleState
  ): void {
    const progress = this.getProgress(candidate);
    const x =
      -PR_REAPER_SCREEN_WIDTH / 2 +
      candidate.normalizedX * PR_REAPER_SCREEN_WIDTH;
    const y =
      PR_REAPER_STREAM_START_Y +
      (PR_REAPER_STREAM_END_Y - PR_REAPER_STREAM_START_Y) * progress;
    state.id = candidate.id;
    state.type = candidate.type;
    state.lifecycle = 'active';
    state.normalizedX = candidate.normalizedX;
    state.progress = progress;
    state.center.x = x;
    state.center.y = y;
    state.center.z = PR_REAPER_STREAM_Z;
  }
}

export function createPrReaperStream(
  options?: PrReaperStreamOptions
): PrReaperStreamState {
  return new PrReaperStreamState(options);
}

export function advancePrReaperStream(
  stream: PrReaperStreamState,
  delta: number
): void {
  stream.advance(delta);
}
