import type { RectCollider } from '../collision';

export type DoorState = 'closed' | 'opening' | 'open' | 'closing';
export interface DoorDefinition {
  id: string;
  sourceId: string;
  floorId: string;
  kind: 'sliding' | 'overhead';
  center: { x: number; z: number };
  /** World-space aperture dimensions and animation distance. */
  width: number;
  height: number;
  depth: number;
  travel: number;
  duration: number;
  clearanceProgress: number;
  threshold: RectCollider;
  sweep: RectCollider;
  blockingBounds: RectCollider;
}
export interface DoorOccupant {
  x: number;
  z: number;
  radius: number;
  floorId: string;
}
export interface DoorSnapshot {
  id: string;
  sourceId: string;
  state: DoorState;
  progress: number;
  target: 0 | 1;
  blocked: boolean;
  occupied: boolean;
}

function overlaps(point: DoorOccupant, bounds: RectCollider): boolean {
  const x = Math.max(bounds.minX, Math.min(point.x, bounds.maxX));
  const z = Math.max(bounds.minZ, Math.min(point.z, bounds.maxZ));
  return (point.x - x) ** 2 + (point.z - z) ** 2 <= point.radius ** 2;
}

/** One progress value owns animation, collision and status. No callbacks/timers can race. */
export function createDoorController(definition: DoorDefinition) {
  if (
    definition.duration <= 0 ||
    definition.clearanceProgress <= 0 ||
    definition.clearanceProgress > 1
  )
    throw new Error(`Invalid door timing or clearance: ${definition.id}`);
  let progress = 0;
  let target: 0 | 1 = 0;
  let occupied = false;
  const isOccupied = (occupant: DoorOccupant) =>
    occupant.floorId === definition.floorId &&
    (overlaps(occupant, definition.threshold) ||
      overlaps(occupant, definition.sweep));
  const snapshot = (): DoorSnapshot => ({
    id: definition.id,
    sourceId: definition.sourceId,
    state:
      progress === 0
        ? 'closed'
        : progress === 1
          ? 'open'
          : target
            ? 'opening'
            : 'closing',
    progress,
    target,
    blocked: progress < definition.clearanceProgress,
    occupied,
  });
  const request = (next: 0 | 1, occupant: DoorOccupant) => {
    occupied = next === 0 && isOccupied(occupant);
    target = occupied ? 1 : next;
    return snapshot();
  };
  return {
    definition,
    snapshot,
    request,
    toggle(occupant: DoorOccupant) {
      return request(target ? 0 : 1, occupant);
    },
    update(delta: number, occupant: DoorOccupant, reducedMotion = false) {
      if (occupied && !isOccupied(occupant)) occupied = false;
      // Check before every closing step, including the exact collider-enable frame.
      if (target === 0 && progress > 0 && isOccupied(occupant)) {
        occupied = true;
        target = 1;
      }
      if (reducedMotion) progress = target;
      else {
        const step =
          Math.max(0, Number.isFinite(delta) ? delta : 0) / definition.duration;
        progress = target
          ? Math.min(1, progress + step)
          : Math.max(0, progress - step);
      }
      return snapshot();
    },
    isInRange(occupant: DoorOccupant) {
      return (
        occupant.floorId === definition.floorId &&
        Math.abs(occupant.x - definition.center.x) <= 3.8 &&
        Math.abs(occupant.z - definition.center.z) <=
          definition.width / 2 - occupant.radius
      );
    },
  };
}
export type DoorController = ReturnType<typeof createDoorController>;
