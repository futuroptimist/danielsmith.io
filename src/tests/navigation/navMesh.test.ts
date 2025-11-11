import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  WALL_THICKNESS,
  type DoorwayDefinition,
  type RoomWall,
} from '../../assets/floorPlan';
import { getNormalizedDoorways } from '../../assets/floorPlan/doorways';
import { createNavMesh } from '../../systems/navigation/navMesh';

const PLAYER_RADIUS = 0.75;
const DOOR_EPSILON = 1e-6;

type NormalizedDoorway = ReturnType<typeof getNormalizedDoorways>[number];

function findSharedDoorway(
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

function resolveNormalizedDoorway(
  roomAId: string,
  wallA: RoomWall,
  roomBId: string,
  wallB: RoomWall
): NormalizedDoorway | undefined {
  const doorways = getNormalizedDoorways(FLOOR_PLAN);
  const roomA = FLOOR_PLAN.rooms.find((room) => room.id === roomAId);
  const roomB = FLOOR_PLAN.rooms.find((room) => room.id === roomBId);
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

describe('createNavMesh', () => {
  const doorwayPadding = PLAYER_RADIUS * 0.6;
  const doorwayDepth = WALL_THICKNESS + PLAYER_RADIUS * 2;
  const extraZone = { minX: 40, maxX: 42, minZ: 40, maxZ: 42 };
  const navMesh = createNavMesh(FLOOR_PLAN, {
    padding: doorwayPadding,
    depth: doorwayDepth,
    extraZones: [extraZone],
  });

  it('contains points inside interior rooms', () => {
    expect(navMesh.contains(0, -10)).toBe(true);
  });

  it('spans doorway thresholds along north-south transitions', () => {
    const livingKitchen = resolveNormalizedDoorway(
      'livingRoom',
      'north',
      'kitchen',
      'south'
    );
    expect(livingKitchen).toBeDefined();
    if (!livingKitchen) {
      return;
    }
    const halfDepth = doorwayDepth / 2 - 0.05;
    expect(navMesh.contains(livingKitchen.center.x, livingKitchen.center.z)).toBe(
      true
    );
    expect(
      navMesh.contains(
        livingKitchen.center.x,
        livingKitchen.center.z + halfDepth
      )
    ).toBe(true);
    expect(
      navMesh.contains(
        livingKitchen.center.x,
        livingKitchen.center.z - halfDepth
      )
    ).toBe(true);
  });

  it('spans doorway thresholds along east-west transitions', () => {
    const kitchenStudio = resolveNormalizedDoorway(
      'kitchen',
      'east',
      'studio',
      'west'
    );
    expect(kitchenStudio).toBeDefined();
    if (!kitchenStudio) {
      return;
    }
    const halfDepth = doorwayDepth / 2 - 0.05;
    expect(
      navMesh.contains(
        kitchenStudio.center.x + halfDepth,
        kitchenStudio.center.z
      )
    ).toBe(true);
    expect(
      navMesh.contains(
        kitchenStudio.center.x - halfDepth,
        kitchenStudio.center.z
      )
    ).toBe(true);
  });

  it('includes explicitly provided zones', () => {
    expect(navMesh.contains(41, 41)).toBe(true);
  });
});
