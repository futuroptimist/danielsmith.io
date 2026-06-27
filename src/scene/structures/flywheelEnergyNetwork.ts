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
  floorId?: string;
}

export interface FlywheelEnergyTransfer {
  direction: FlywheelEnergyDirection;
  targetPoiId: string;
  phase: number;
  duration: number;
  window: number;
  strength: number;
}

export interface FlywheelEnergyNetworkOptions {
  seed?: number | string;
  incomingPerCycle?: number;
  incomingDuration?: number;
  outgoingDuration?: number;
  incomingWindow?: number;
  outgoingWindow?: number;
  incomingStrength?: number;
  outgoingStrength?: number;
}

export interface FlywheelEnergyNetworkDebugSnapshot {
  targetCount: number;
  cycleIndex: number;
  incomingCompletedCount: number;
  outgoingCompletedCount: number;
  activeTransfer: FlywheelEnergyTransfer | null;
  visibleWindow: { start: number; end: number } | null;
  targetSequence: string[];
}

export const FLYWHEEL_POI_ID = 'flywheel-studio-flywheel';
const DEFAULT_INCOMING_PER_CYCLE = 5;
const DEFAULT_INCOMING_DURATION = 2.8;
const DEFAULT_OUTGOING_DURATION = 2.35;
const DEFAULT_INCOMING_WINDOW = 0.1;
const DEFAULT_OUTGOING_WINDOW = 0.16;
const DEFAULT_INCOMING_STRENGTH = 1;
const DEFAULT_OUTGOING_STRENGTH = 1.65;

export function createSeededFlywheelEnergyNetwork(
  options: FlywheelEnergyNetworkOptions = {}
) {
  let randomState = hashSeed(options.seed ?? 'flywheel-energy-network');
  let targets: FlywheelEnergyTarget[] = [];
  let active: FlywheelEnergyTransfer | null = null;
  let cycleIndex = 0;
  let incomingCompletedCount = 0;
  let outgoingCompletedCount = 0;
  let lastTargetPoiId: string | null = null;
  const targetSequence: string[] = [];
  const incomingPerCycle =
    options.incomingPerCycle ?? DEFAULT_INCOMING_PER_CYCLE;
  const config = {
    incomingDuration: options.incomingDuration ?? DEFAULT_INCOMING_DURATION,
    outgoingDuration: options.outgoingDuration ?? DEFAULT_OUTGOING_DURATION,
    incomingWindow: options.incomingWindow ?? DEFAULT_INCOMING_WINDOW,
    outgoingWindow: options.outgoingWindow ?? DEFAULT_OUTGOING_WINDOW,
    incomingStrength: options.incomingStrength ?? DEFAULT_INCOMING_STRENGTH,
    outgoingStrength: options.outgoingStrength ?? DEFAULT_OUTGOING_STRENGTH,
  };

  const chooseTarget = (): FlywheelEnergyTarget | null => {
    if (targets.length === 0) return null;
    if (targets.length === 1) return targets[0];
    let candidate = targets[nextRandomInt(targets.length)];
    if (candidate.poiId === lastTargetPoiId) {
      const startIndex = targets.findIndex(
        (target) => target.poiId === candidate.poiId
      );
      candidate =
        targets[
          (startIndex + 1 + nextRandomInt(targets.length - 1)) % targets.length
        ];
    }
    lastTargetPoiId = candidate.poiId;
    targetSequence.push(candidate.poiId);
    return candidate;
  };

  const nextRandomInt = (exclusiveMax: number): number => {
    const next = mulberry32Step(randomState);
    randomState = next.value;
    return Math.floor(next.normalized * exclusiveMax);
  };

  const startNextTransfer = () => {
    const target = chooseTarget();
    if (!target) {
      active = null;
      return;
    }
    const direction: FlywheelEnergyDirection =
      incomingCompletedCount >= incomingPerCycle ? 'outgoing' : 'incoming';
    active = {
      direction,
      targetPoiId: target.poiId,
      phase: 0,
      duration:
        direction === 'incoming'
          ? config.incomingDuration
          : config.outgoingDuration,
      window:
        direction === 'incoming'
          ? config.incomingWindow
          : config.outgoingWindow,
      strength:
        direction === 'incoming'
          ? config.incomingStrength
          : config.outgoingStrength,
    };
  };

  return {
    setTargets(nextTargets: readonly FlywheelEnergyTarget[]) {
      targets = sanitizeFlywheelEnergyTargets(nextTargets);
      if (
        active &&
        !targets.some((target) => target.poiId === active?.targetPoiId)
      ) {
        active = null;
      }
      if (!active) startNextTransfer();
    },
    update(delta: number): FlywheelEnergyTransfer | null {
      if (!active) startNextTransfer();
      if (!active) return null;
      const safeDelta = Math.max(0, Number.isFinite(delta) ? delta : 0);
      active = {
        ...active,
        phase: Math.min(1, active.phase + safeDelta / active.duration),
      };
      if (active.phase >= 1) {
        if (active.direction === 'incoming') {
          incomingCompletedCount += 1;
        } else {
          outgoingCompletedCount += 1;
          incomingCompletedCount = 0;
          cycleIndex += 1;
        }
        startNextTransfer();
      }
      return active ? { ...active } : null;
    },
    getActiveTransfer(): FlywheelEnergyTransfer | null {
      return active ? { ...active } : null;
    },
    getTarget(poiId: string): FlywheelEnergyTarget | null {
      const target = targets.find((candidate) => candidate.poiId === poiId);
      return target ? cloneTarget(target) : null;
    },
    getDebugSnapshot(): FlywheelEnergyNetworkDebugSnapshot {
      return {
        targetCount: targets.length,
        cycleIndex,
        incomingCompletedCount,
        outgoingCompletedCount,
        activeTransfer: active ? { ...active } : null,
        visibleWindow: active ? getFlywheelEnergyVisibleWindow(active) : null,
        targetSequence: [...targetSequence],
      };
    },
  };
}

export function sanitizeFlywheelEnergyTargets(
  targets: readonly FlywheelEnergyTarget[]
): FlywheelEnergyTarget[] {
  const seen = new Set<string>();
  return targets
    .filter((target) => target.poiId !== FLYWHEEL_POI_ID)
    .filter((target) => target.floorId !== 'upper')
    .filter((target) => {
      const valid =
        target.poiId &&
        target.label &&
        Number.isFinite(target.worldPosition.x) &&
        Number.isFinite(target.worldPosition.y) &&
        Number.isFinite(target.worldPosition.z) &&
        !seen.has(target.poiId);
      seen.add(target.poiId);
      return valid;
    })
    .map(cloneTarget);
}

export function getFlywheelEnergyVisibleWindow(
  transfer: FlywheelEnergyTransfer
) {
  const half = transfer.window / 2;
  return {
    start: clamp01(transfer.phase - half),
    end: clamp01(transfer.phase + half),
  };
}

export function sampleFlywheelEnergyArc(
  source: FlywheelEnergyPoint,
  destination: FlywheelEnergyPoint,
  t: number,
  lift = 1.35
): FlywheelEnergyPoint {
  const phase = clamp01(t);
  const mid = {
    x: (source.x + destination.x) / 2,
    y: Math.max(source.y, destination.y) + lift,
    z: (source.z + destination.z) / 2,
  };
  const a = (1 - phase) * (1 - phase);
  const b = 2 * (1 - phase) * phase;
  const c = phase * phase;
  return {
    x: a * source.x + b * mid.x + c * destination.x,
    y: a * source.y + b * mid.y + c * destination.y,
    z: a * source.z + b * mid.z + c * destination.z,
  };
}

function cloneTarget(target: FlywheelEnergyTarget): FlywheelEnergyTarget {
  return {
    poiId: target.poiId,
    label: target.label,
    floorId: target.floorId,
    worldPosition: { ...target.worldPosition },
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function hashSeed(seed: number | string): number {
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32Step(state: number): { value: number; normalized: number } {
  const value = (state + 0x6d2b79f5) >>> 0;
  let t = value;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value, normalized: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}
