export type FlywheelEnergyDirection = 'incoming' | 'outgoing';

export interface FlywheelEnergyTarget {
  poiId: string;
  label: string;
  worldPosition: { x: number; y: number; z: number };
}

export interface FlywheelEnergyTransfer {
  direction: FlywheelEnergyDirection;
  targetPoiId: string;
  phase: number;
  duration: number;
  window: number;
  strength: number;
}

export interface FlywheelEnergyNetworkDebugState
  extends FlywheelEnergyTransfer {
  targetCount: number;
  cycleCount: number;
  incomingCompletedCount: number;
  outgoingCompletedCount: number;
  visibleWindow: { start: number; end: number };
  targetSequence: string[];
}

export const FLYWHEEL_ENERGY_POI_ID = 'flywheel-studio-flywheel';
export const FLYWHEEL_INCOMING_PER_CYCLE = 5;
export const FLYWHEEL_INCOMING_WINDOW = 0.1;
export const FLYWHEEL_OUTGOING_WINDOW = 0.16;
export const FLYWHEEL_INCOMING_DURATION = 2.8;
export const FLYWHEEL_OUTGOING_DURATION = 2.35;
export const FLYWHEEL_INCOMING_STRENGTH = 1;
export const FLYWHEEL_OUTGOING_STRENGTH = 1.65;
export const FLYWHEEL_ENERGY_NETWORK_SEED = 'flywheel-energy-network:v1';

export function createFlywheelSeededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeFlywheelEnergyTargets(
  targets: readonly FlywheelEnergyTarget[]
): FlywheelEnergyTarget[] {
  return targets
    .filter((target) => target.poiId !== FLYWHEEL_ENERGY_POI_ID)
    .map((target) => ({
      poiId: target.poiId,
      label: target.label,
      worldPosition: { ...target.worldPosition },
    }));
}

export class FlywheelEnergyNetworkState {
  private readonly random: () => number;
  private targets: FlywheelEnergyTarget[] = [];
  private transfer: FlywheelEnergyTransfer = this.createTransfer(
    'incoming',
    ''
  );
  private lastTargetPoiId = '';
  private incomingCompletedCount = 0;
  private outgoingCompletedCount = 0;
  private cycleCount = 0;
  private targetSequence: string[] = [];

  constructor(
    options: { seed?: string; targets?: readonly FlywheelEnergyTarget[] } = {}
  ) {
    this.random = createFlywheelSeededRandom(
      options.seed ?? FLYWHEEL_ENERGY_NETWORK_SEED
    );
    this.setTargets(options.targets ?? []);
  }

  setTargets(targets: readonly FlywheelEnergyTarget[]): void {
    this.targets = normalizeFlywheelEnergyTargets(targets);
    if (this.targets.length === 0) {
      this.transfer = this.createTransfer('incoming', '');
      return;
    }
    if (
      !this.targets.some((target) => target.poiId === this.transfer.targetPoiId)
    ) {
      this.transfer = this.createTransfer(
        this.nextDirection(),
        this.pickTarget()
      );
    }
  }

  update(delta: number): FlywheelEnergyTransfer {
    if (this.targets.length === 0) return { ...this.transfer };
    this.transfer.phase += Math.max(0, delta) / this.transfer.duration;
    while (this.transfer.phase >= 1) {
      this.completeTransfer();
    }
    return { ...this.transfer };
  }

  getActiveTransfer(): FlywheelEnergyTransfer {
    return { ...this.transfer };
  }

  getTargetByPoiId(poiId: string): FlywheelEnergyTarget | null {
    const target = this.targets.find((candidate) => candidate.poiId === poiId);
    return target
      ? { ...target, worldPosition: { ...target.worldPosition } }
      : null;
  }

  getDebugState(): FlywheelEnergyNetworkDebugState {
    return {
      ...this.transfer,
      targetCount: this.targets.length,
      cycleCount: this.cycleCount,
      incomingCompletedCount: this.incomingCompletedCount,
      outgoingCompletedCount: this.outgoingCompletedCount,
      visibleWindow: getFlywheelEnergyVisibleWindow(this.transfer),
      targetSequence: [...this.targetSequence],
    };
  }

  private completeTransfer(): void {
    this.lastTargetPoiId = this.transfer.targetPoiId;
    this.targetSequence.push(this.transfer.targetPoiId);
    const overflow = this.transfer.phase - 1;
    if (this.transfer.direction === 'incoming') {
      this.incomingCompletedCount += 1;
    } else {
      this.outgoingCompletedCount += 1;
      this.incomingCompletedCount = 0;
      this.cycleCount += 1;
    }
    this.transfer = this.createTransfer(
      this.nextDirection(),
      this.pickTarget()
    );
    this.transfer.phase = overflow;
  }

  private nextDirection(): FlywheelEnergyDirection {
    return this.incomingCompletedCount >= FLYWHEEL_INCOMING_PER_CYCLE
      ? 'outgoing'
      : 'incoming';
  }

  private createTransfer(
    direction: FlywheelEnergyDirection,
    targetPoiId: string
  ): FlywheelEnergyTransfer {
    return {
      direction,
      targetPoiId,
      phase: 0,
      duration:
        direction === 'outgoing'
          ? FLYWHEEL_OUTGOING_DURATION
          : FLYWHEEL_INCOMING_DURATION,
      window:
        direction === 'outgoing'
          ? FLYWHEEL_OUTGOING_WINDOW
          : FLYWHEEL_INCOMING_WINDOW,
      strength:
        direction === 'outgoing'
          ? FLYWHEEL_OUTGOING_STRENGTH
          : FLYWHEEL_INCOMING_STRENGTH,
    };
  }

  private pickTarget(): string {
    if (this.targets.length === 0) return '';
    const candidates =
      this.targets.length > 1
        ? this.targets.filter((target) => target.poiId !== this.lastTargetPoiId)
        : this.targets;
    const index =
      Math.floor(this.random() * candidates.length) % candidates.length;
    return candidates[index].poiId;
  }
}

export function createFlywheelEnergyNetwork(
  options?: ConstructorParameters<typeof FlywheelEnergyNetworkState>[0]
): FlywheelEnergyNetworkState {
  return new FlywheelEnergyNetworkState(options);
}

export function getFlywheelEnergyVisibleWindow(
  transfer: FlywheelEnergyTransfer
): {
  start: number;
  end: number;
} {
  const half = transfer.window / 2;
  return {
    start: Math.max(0, transfer.phase - half),
    end: Math.min(1, transfer.phase + half),
  };
}

export function sampleFlywheelEnergyArc(
  source: { x: number; y: number; z: number },
  destination: { x: number; y: number; z: number },
  t: number
): { x: number; y: number; z: number } {
  const clampedT = Math.min(1, Math.max(0, t));
  const inv = 1 - clampedT;
  const dx = destination.x - source.x;
  const dz = destination.z - source.z;
  const distance = Math.hypot(dx, dz);
  const control = {
    x: (source.x + destination.x) / 2,
    y: Math.min(
      Math.max(source.y, destination.y) + Math.max(1.2, distance * 0.18),
      3.25
    ),
    z: (source.z + destination.z) / 2,
  };
  return {
    x:
      inv * inv * source.x +
      2 * inv * clampedT * control.x +
      clampedT * clampedT * destination.x,
    y:
      inv * inv * source.y +
      2 * inv * clampedT * control.y +
      clampedT * clampedT * destination.y,
    z:
      inv * inv * source.z +
      2 * inv * clampedT * control.z +
      clampedT * clampedT * destination.z,
  };
}
