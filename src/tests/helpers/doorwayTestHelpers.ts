import {
  FLOOR_PLAN,
  type DoorwayDefinition,
  type FloorPlanDefinition,
  type RoomWall,
} from '../../assets/floorPlan';
import { getNormalizedDoorways } from '../../assets/floorPlan/doorways';

export const DOOR_EPSILON = 1e-6;

export type NormalizedDoorway = ReturnType<
  typeof getNormalizedDoorways
>[number];

export function findSharedDoorway(
  first: readonly DoorwayDefinition[] | undefined,
  second: readonly DoorwayDefinition[] | undefined
): DoorwayDefinition | undefined {
  if (!first || !second) {
    return undefined;
  }

  return first.find((candidate) =>
    second.some(
      (comparison) =>
        Math.abs(candidate.start - comparison.start) < DOOR_EPSILON &&
        Math.abs(candidate.end - comparison.end) < DOOR_EPSILON
    )
  );
}

interface ResolveNormalizedDoorwayOptions {
  plan?: FloorPlanDefinition;
  doorways?: ReturnType<typeof getNormalizedDoorways>;
  roomAId: string;
  wallA: RoomWall;
  roomBId: string;
  wallB: RoomWall;
}

export function resolveNormalizedDoorway({
  plan = FLOOR_PLAN,
  doorways = getNormalizedDoorways(plan),
  roomAId,
  wallA,
  roomBId,
  wallB,
}: ResolveNormalizedDoorwayOptions): NormalizedDoorway | undefined {
  const roomA = plan.rooms.find((room) => room.id === roomAId);
  const roomB = plan.rooms.find((room) => room.id === roomBId);
  if (!roomA || !roomB) {
    return undefined;
  }

  const shared = findSharedDoorway(
    roomA.doorways?.filter((doorway) => doorway.wall === wallA),
    roomB.doorways?.filter((doorway) => doorway.wall === wallB)
  );
  if (!shared) {
    return undefined;
  }

  const centerValue = (shared.start + shared.end) / 2;
  const centerZ =
    wallA === 'north'
      ? roomA.bounds.maxZ
      : wallA === 'south'
        ? roomA.bounds.minZ
        : centerValue;
  const centerX =
    wallA === 'east'
      ? roomA.bounds.maxX
      : wallA === 'west'
        ? roomA.bounds.minX
        : centerValue;

  return doorways.find(
    (doorway) =>
      Math.abs(doorway.center.x - centerX) < DOOR_EPSILON &&
      Math.abs(doorway.center.z - centerZ) < DOOR_EPSILON
  );
}
