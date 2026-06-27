export type FlywheelEnergyDirection = 'incoming' | 'outgoing';

export interface FlywheelEnergyPoint {
  x: number;
  y: number;
  z: number;
}

export interface FlywheelEnergyTarget {
  poiId: string;
  label: string;
  worldPosition: FlywheelEnergyPoint;
  floorId?: 'ground' | 'upper';
}

export interface FlywheelEnergyTransfer {
  direction: FlywheelEnergyDirection;
  targetPoiId: string;
  phase: number;
  duration: number;
  window: number;
  strength: number;
}

export interface FlywheelEnergyNetworkSnapshot {
  seed: number;
  targetCount: number;
  cycleCount: number;
  direction: FlywheelEnergyDirection | null;
  selectedTargetId: string | null;
  phase: number;
  visibleWindowStart: number;
  visibleWindowEnd: number;
  incomingCompletedCount: number;
  outgoingCompletedCount: number;
  activeTransfer: FlywheelEnergyTransfer | null;
  targets: FlywheelEnergyTarget[];
}

export const FLYWHEEL_POI_ID = 'flywheel-studio-flywheel';
export const FLYWHEEL_INCOMING_PER_CYCLE = 5;
export const FLYWHEEL_INCOMING_WINDOW = 0.1;
export const FLYWHEEL_OUTGOING_WINDOW = 0.16;
export const FLYWHEEL_INCOMING_DURATION = 2.4;
export const FLYWHEEL_OUTGOING_DURATION = 2.0;
export const FLYWHEEL_INCOMING_STRENGTH = 1;
export const FLYWHEEL_OUTGOING_STRENGTH = 1.65;

const copyPoint = (point: FlywheelEnergyPoint): FlywheelEnergyPoint => ({
  x: point.x,
  y: point.y,
  z: point.z,
});

const copyTarget = (target: FlywheelEnergyTarget): FlywheelEnergyTarget => ({
  poiId: target.poiId,
  label: target.label,
  worldPosition: copyPoint(target.worldPosition),
  floorId: target.floorId,
});

function normalizeSeed(seed: number | string): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(state: number): [number, number] {
  let next = state + 0x6d2b79f5;
  next = Math.imul(next ^ (next >>> 15), next | 1);
  next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
  return [((next ^ (next >>> 14)) >>> 0) / 4294967296, next >>> 0];
}

export function filterFlywheelEnergyTargets(
  targets: readonly FlywheelEnergyTarget[]
): FlywheelEnergyTarget[] {
  return targets
    .filter(
      (target) =>
        target.poiId !== FLYWHEEL_POI_ID &&
        target.floorId !== 'upper' &&
        Number.isFinite(target.worldPosition.x) &&
        Number.isFinite(target.worldPosition.y) &&
        Number.isFinite(target.worldPosition.z)
    )
    .map(copyTarget);
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
  source: FlywheelEnergyPoint,
  destination: FlywheelEnergyPoint,
  t: number
): FlywheelEnergyPoint {
  const clamped = Math.max(0, Math.min(1, t));
  const distance = Math.hypot(
    destination.x - source.x,
    destination.z - source.z
  );
  const lift = Math.min(2.1, Math.max(0.75, distance * 0.18));
  const mid = {
    x: (source.x + destination.x) / 2,
    y: Math.max(source.y, destination.y) + lift,
    z: (source.z + destination.z) / 2,
  };
  const a = (1 - clamped) * (1 - clamped);
  const b = 2 * (1 - clamped) * clamped;
  const c = clamped * clamped;
  return {
    x: a * source.x + b * mid.x + c * destination.x,
    y: a * source.y + b * mid.y + c * destination.y,
    z: a * source.z + b * mid.z + c * destination.z,
  };
}

export class FlywheelEnergyNetwork {
  private targets: FlywheelEnergyTarget[] = [];
  private randomState: number;
  private lastTargetId: string | null = null;
  private incomingCompletedCount = 0;
  private outgoingCompletedCount = 0;
  private cycleCount = 0;
  private active: FlywheelEnergyTransfer | null = null;

  constructor(seed: number | string = 'flywheel-energy-network') {
    this.randomState = normalizeSeed(seed);
  }

  setTargets(targets: readonly FlywheelEnergyTarget[]): void {
    this.targets = filterFlywheelEnergyTargets(targets);
    if (
      this.active &&
      !this.targets.some((target) => target.poiId === this.active?.targetPoiId)
    ) {
      this.active = null;
    }
  }

  update(delta: number): FlywheelEnergyTransfer | null {
    if (this.targets.length === 0) return null;
    if (!this.active) this.active = this.createTransfer();
    if (!this.active) return null;
    this.active.phase += Math.max(0, delta) / this.active.duration;
    while (this.active.phase >= 1) {
      this.completeActiveTransfer();
      this.active = this.targets.length > 0 ? this.createTransfer() : null;
      if (!this.active) break;
    }
    return this.getActiveTransfer();
  }

  getActiveTransfer(): FlywheelEnergyTransfer | null {
    return this.active ? { ...this.active } : null;
  }

  getTarget(poiId: string): FlywheelEnergyTarget | null {
    const target = this.targets.find((candidate) => candidate.poiId === poiId);
    return target ? copyTarget(target) : null;
  }

  getSnapshot(): FlywheelEnergyNetworkSnapshot {
    const active = this.getActiveTransfer();
    const window = active
      ? getFlywheelEnergyVisibleWindow(active)
      : { start: 0, end: 0 };
    return {
      seed: this.randomState,
      targetCount: this.targets.length,
      cycleCount: this.cycleCount,
      direction: active?.direction ?? null,
      selectedTargetId: active?.targetPoiId ?? null,
      phase: active?.phase ?? 0,
      visibleWindowStart: window.start,
      visibleWindowEnd: window.end,
      incomingCompletedCount: this.incomingCompletedCount,
      outgoingCompletedCount: this.outgoingCompletedCount,
      activeTransfer: active,
      targets: this.targets.map(copyTarget),
    };
  }

  private createTransfer(): FlywheelEnergyTransfer | null {
    const target = this.pickTarget();
    if (!target) return null;
    const direction =
      this.incomingCompletedCount < FLYWHEEL_INCOMING_PER_CYCLE
        ? 'incoming'
        : 'outgoing';
    return {
      direction,
      targetPoiId: target.poiId,
      phase: 0,
      duration:
        direction === 'incoming'
          ? FLYWHEEL_INCOMING_DURATION
          : FLYWHEEL_OUTGOING_DURATION,
      window:
        direction === 'incoming'
          ? FLYWHEEL_INCOMING_WINDOW
          : FLYWHEEL_OUTGOING_WINDOW,
      strength:
        direction === 'incoming'
          ? FLYWHEEL_INCOMING_STRENGTH
          : FLYWHEEL_OUTGOING_STRENGTH,
    };
  }

  private pickTarget(): FlywheelEnergyTarget | null {
    if (this.targets.length === 0) return null;
    let index = 0;
    [index, this.randomState] = this.nextIndex(this.targets.length);
    let target = this.targets[index];
    if (this.targets.length > 1 && target.poiId === this.lastTargetId) {
      index = (index + 1) % this.targets.length;
      target = this.targets[index];
    }
    this.lastTargetId = target.poiId;
    return target;
  }

  private nextIndex(length: number): [number, number] {
    const [value, state] = nextRandom(this.randomState);
    return [Math.floor(value * length), state];
  }

  private completeActiveTransfer(): void {
    if (!this.active) return;
    if (this.active.direction === 'incoming') {
      this.incomingCompletedCount += 1;
      return;
    }
    this.outgoingCompletedCount += 1;
    this.incomingCompletedCount = 0;
    this.cycleCount += 1;
  }
}
