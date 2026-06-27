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
  targetCount: number;
  currentCycleCount: number;
  direction: FlywheelEnergyDirection | null;
  selectedTargetId: string | null;
  phase: number;
  visibleWindowStart: number;
  visibleWindowEnd: number;
  incomingCompletedCount: number;
  outgoingCompletedCount: number;
  transfer: FlywheelEnergyTransfer | null;
  targetOrder: string[];
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

const FLYWHEEL_POI_ID = 'flywheel-studio-flywheel';
const DEFAULTS = {
  seed: 'flywheel-energy-network',
  incomingPerCycle: 5,
  incomingDuration: 2.8,
  outgoingDuration: 2.35,
  incomingWindow: 0.1,
  outgoingWindow: 0.16,
  incomingStrength: 1,
  outgoingStrength: 1.65,
} as const;

export function resolveFlywheelEnergyTargets(
  targets: readonly FlywheelEnergyTarget[]
): FlywheelEnergyTarget[] {
  return targets
    .filter((target) => target.poiId !== FLYWHEEL_POI_ID)
    .filter((target) => target.floorId !== 'upper')
    .filter((target) => isFinitePoint(target.worldPosition))
    .map(cloneTarget);
}

export function createFlywheelEnergyNetwork(
  rawTargets: readonly FlywheelEnergyTarget[] = [],
  options: FlywheelEnergyNetworkOptions = {}
) {
  const config = { ...DEFAULTS, ...options };
  const rng = mulberry32(hashSeed(config.seed));
  let targets = resolveFlywheelEnergyTargets(rawTargets);
  let incomingCompletedCount = 0;
  let outgoingCompletedCount = 0;
  let currentCycleCount = 0;
  let lastTargetId: string | null = null;
  let active: FlywheelEnergyTransfer | null = null;
  const targetOrder: string[] = [];

  const chooseTarget = (): FlywheelEnergyTarget | null => {
    if (targets.length === 0) return null;
    const candidates =
      targets.length > 1 && lastTargetId
        ? targets.filter((target) => target.poiId !== lastTargetId)
        : targets;
    const target =
      candidates[Math.floor(rng() * candidates.length)] ?? candidates[0];
    lastTargetId = target.poiId;
    targetOrder.push(target.poiId);
    return target;
  };

  const startTransfer = () => {
    const target = chooseTarget();
    if (!target) {
      active = null;
      return;
    }
    const outgoing = incomingCompletedCount >= config.incomingPerCycle;
    active = {
      direction: outgoing ? 'outgoing' : 'incoming',
      targetPoiId: target.poiId,
      phase: 0,
      duration: outgoing ? config.outgoingDuration : config.incomingDuration,
      window: outgoing ? config.outgoingWindow : config.incomingWindow,
      strength: outgoing ? config.outgoingStrength : config.incomingStrength,
    };
  };

  const completeTransfer = () => {
    if (!active) return;
    if (active.direction === 'incoming') {
      incomingCompletedCount += 1;
    } else {
      outgoingCompletedCount += 1;
      currentCycleCount += 1;
      incomingCompletedCount = 0;
    }
    startTransfer();
  };

  startTransfer();

  return {
    setTargets(nextTargets: readonly FlywheelEnergyTarget[]) {
      targets = resolveFlywheelEnergyTargets(nextTargets);
      lastTargetId = targets.some((target) => target.poiId === lastTargetId)
        ? lastTargetId
        : null;
      active = null;
      startTransfer();
    },
    update(delta: number) {
      if (!active) return null;
      const safeDelta = Math.max(0, Number.isFinite(delta) ? delta : 0);
      active = {
        ...active,
        phase: Math.min(1, active.phase + safeDelta / active.duration),
      };
      if (active.phase >= 1) completeTransfer();
      return active ? { ...active } : null;
    },
    getActiveTransfer() {
      return active ? { ...active } : null;
    },
    getTarget(poiId: string) {
      const target = targets.find((item) => item.poiId === poiId);
      return target ? cloneTarget(target) : null;
    },
    getTargets() {
      return targets.map(cloneTarget);
    },
    getSnapshot(): FlywheelEnergyNetworkSnapshot {
      const window = active
        ? getFlywheelEnergyVisibleWindow(active.phase, active.window)
        : { start: 0, end: 0 };
      return {
        targetCount: targets.length,
        currentCycleCount,
        direction: active?.direction ?? null,
        selectedTargetId: active?.targetPoiId ?? null,
        phase: active?.phase ?? 0,
        visibleWindowStart: window.start,
        visibleWindowEnd: window.end,
        incomingCompletedCount,
        outgoingCompletedCount,
        transfer: active ? { ...active } : null,
        targetOrder: [...targetOrder],
      };
    },
  };
}

export function getFlywheelEnergyVisibleWindow(phase: number, size: number) {
  const clampedSize = clamp(size, 0.01, 1);
  const center = clamp(phase, 0, 1);
  return {
    start: clamp(center - clampedSize / 2, 0, 1),
    end: clamp(center + clampedSize / 2, 0, 1),
  };
}

export function sampleFlywheelEnergyArc(
  source: FlywheelEnergyPoint,
  destination: FlywheelEnergyPoint,
  t: number
): FlywheelEnergyPoint {
  const clamped = clamp(t, 0, 1);
  const lift = Math.min(
    1.35,
    Math.max(0.45, distance(source, destination) * 0.18)
  );
  const mid = {
    x: (source.x + destination.x) / 2,
    y: Math.max(source.y, destination.y) + lift,
    z: (source.z + destination.z) / 2,
  };
  const a = lerpPoint(source, mid, clamped);
  const b = lerpPoint(mid, destination, clamped);
  return lerpPoint(a, b, clamped);
}

function cloneTarget(target: FlywheelEnergyTarget): FlywheelEnergyTarget {
  return {
    poiId: target.poiId,
    label: target.label,
    floorId: target.floorId,
    worldPosition: { ...target.worldPosition },
  };
}
function isFinitePoint(point: FlywheelEnergyPoint): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Number.isFinite(point.z)
  );
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpPoint(a: FlywheelEnergyPoint, b: FlywheelEnergyPoint, t: number) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}
function distance(a: FlywheelEnergyPoint, b: FlywheelEnergyPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
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
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
