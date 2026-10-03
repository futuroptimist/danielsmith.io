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
  /** Open on approach and close on departure; manual operation remains available. */
  automatic?: boolean;
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
export interface DoorApproach {
  maximumSpeed: number;
  /** Intended native displacement, before collision, for this same frame. */
  movement: { x: number; z: number };
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

/** Closest distance to the aperture along this frame's intended path. */
function approachDistance(
  definition: DoorDefinition,
  occupant: DoorOccupant,
  movement: DoorApproach['movement']
): number {
  if (occupant.floorId !== definition.floorId) return Infinity;
  const halfWidth = definition.width / 2 - occupant.radius;
  const offsetZ = occupant.z - definition.center.z;
  let start = 0;
  let end = 1;
  if (Math.abs(movement.z) < 1e-8) {
    if (Math.abs(offsetZ) > halfWidth) return Infinity;
  } else {
    const first = (-halfWidth - offsetZ) / movement.z;
    const last = (halfWidth - offsetZ) / movement.z;
    start = Math.max(0, Math.min(first, last));
    end = Math.min(1, Math.max(first, last));
    if (start > end) return Infinity;
  }
  const a = occupant.x + movement.x * start - definition.center.x;
  const b = occupant.x + movement.x * end - definition.center.x;
  return a * b <= 0 ? 0 : Math.min(Math.abs(a), Math.abs(b));
}

const interactionDistance = 3.8;
const proximityHysteresis = 0.75;
const manualApproachTolerance = 0.001;
const ease = (phase: number) => phase * phase * (3 - 2 * phase);
const phaseForProgress = (progress: number) =>
  progress === 1 ? 1 : 0.5 - Math.sin(Math.asin(1 - 2 * progress) / 3);

/** One progress value owns animation, collision and status. No callbacks/timers can race. */
export function createDoorController(definition: DoorDefinition) {
  if (
    definition.duration <= 0 ||
    definition.clearanceProgress <= 0 ||
    definition.clearanceProgress > 1
  )
    throw new Error(`Invalid door timing or clearance: ${definition.id}`);
  let phase = 0;
  let progress = 0;
  let target: 0 | 1 = 0;
  let occupied = false;
  let automaticOpening = false;
  let automaticClosing = false;
  let wasInApproach = false;
  let lastApproachDistance = Infinity;
  let manualCloseDistance: number | null = null;
  let nearestApproachDistance = Infinity;
  let farthestDepartureDistance = 0;
  const clearancePhase = phaseForProgress(definition.clearanceProgress);
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
    automaticOpening = false;
    automaticClosing = false;
    if (next === 0) wasInApproach = true;
    // A stationary manual close persists. New inward movement can reopen it.
    lastApproachDistance = Math.abs(occupant.x - definition.center.x);
    manualCloseDistance = next === 0 && !occupied ? lastApproachDistance : null;
    nearestApproachDistance = lastApproachDistance;
    return snapshot();
  };
  return {
    definition,
    snapshot,
    request,
    toggle(occupant: DoorOccupant) {
      return request(target ? 0 : 1, occupant);
    },
    update(
      delta: number,
      occupant: DoorOccupant,
      reducedMotion = false,
      approach?: DoorApproach
    ) {
      const frameDelta = Math.max(0, Number.isFinite(delta) ? delta : 0);
      if (occupied && !isOccupied(occupant)) occupied = false;
      // Check before every closing step, including the exact collider-enable frame.
      if (target === 0 && progress > 0 && isOccupied(occupant)) {
        occupied = true;
        target = 1;
        automaticClosing = false;
        manualCloseDistance = null;
      }
      let clearanceTime = Infinity;
      if (definition.automatic && approach && approach.maximumSpeed > 0) {
        const distance = approachDistance(
          definition,
          occupant,
          approach.movement
        );
        // Outside the aperture's approach lane, use a continuous distance to
        // its edge for departure. Stepping sideways across the sensor boundary
        // must not instantly turn a nearby player into an infinitely far one.
        const departureDistance = Number.isFinite(distance)
          ? distance
          : occupant.floorId !== definition.floorId
            ? Infinity
            : Math.hypot(
                occupant.x - definition.center.x,
                Math.max(
                  0,
                  Math.abs(occupant.z - definition.center.z) -
                    (definition.width / 2 - occupant.radius)
                )
              );
        const clearanceDistance = definition.depth / 2 + occupant.radius;
        const leadDistance =
          clearanceDistance +
          approach.maximumSpeed * definition.duration * clearancePhase;
        const inApproach = distance <= leadDistance;
        if (automaticClosing)
          farthestDepartureDistance = Math.max(
            farthestDepartureDistance,
            departureDistance
          );
        if (manualCloseDistance !== null)
          manualCloseDistance = Math.max(
            manualCloseDistance,
            departureDistance
          );
        // Ignore residual damping drift after a manual close. Measure from
        // the farthest departure so slow movement and returning after a retreat
        // still accumulate into a renewed approach.
        const movedInward =
          manualCloseDistance === null
            ? distance < lastApproachDistance - 1e-7
            : distance < manualCloseDistance - manualApproachTolerance;
        if (
          inApproach &&
          (!wasInApproach || movedInward) &&
          (!automaticClosing ||
            departureDistance <=
              farthestDepartureDistance - proximityHysteresis)
        ) {
          if (target === 0) nearestApproachDistance = distance;
          target = 1;
          automaticOpening = true;
          automaticClosing = false;
          manualCloseDistance = null;
        }
        if (target === 1) {
          nearestApproachDistance = Math.min(
            nearestApproachDistance,
            departureDistance
          );
          // Keep a nearby stopped player welcome. Departure must clear both
          // the interaction zone and a meaningful distance from the closest
          // approach; small oscillations must not reverse the panel each frame.
          if (
            departureDistance >
            Math.max(
              interactionDistance,
              nearestApproachDistance + proximityHysteresis
            )
          ) {
            occupied = isOccupied(occupant);
            if (!occupied) {
              target = 0;
              automaticOpening = false;
              automaticClosing = true;
              farthestDepartureDistance = departureDistance;
            }
          }
        }
        wasInApproach = inApproach;
        lastApproachDistance = distance;
        if (automaticOpening && inApproach) {
          // Include the imminent frame in the deadline. A late turn or a coarse
          // frame advances the actual panel before movement, never just its collider.
          clearanceTime =
            Math.max(0, distance - clearanceDistance) / approach.maximumSpeed;
        }
      }
      if (reducedMotion) phase = target;
      else {
        const step = Math.max(
          frameDelta / definition.duration,
          target && automaticOpening && frameDelta > 0
            ? Math.max(0, clearancePhase - phase) *
                Math.min(1, frameDelta / Math.max(frameDelta, clearanceTime))
            : 0
        );
        phase = target ? Math.min(1, phase + step) : Math.max(0, phase - step);
      }
      // The eased physical progress is authoritative for the rendered panel,
      // collision and announcements in both directions, including reversals.
      progress = ease(phase);
      return snapshot();
    },
    isInRange(occupant: DoorOccupant) {
      return (
        occupant.floorId === definition.floorId &&
        Math.abs(occupant.x - definition.center.x) <= interactionDistance &&
        Math.abs(occupant.z - definition.center.z) <=
          definition.width / 2 - occupant.radius
      );
    },
  };
}
export type DoorController = ReturnType<typeof createDoorController>;
