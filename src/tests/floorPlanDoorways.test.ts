import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN, type DoorwayDefinition, type RoomWall } from '../assets/floorPlan';
import {
  getDoorwayClearanceZones,
  getDoorwayPassageZones,
  getNormalizedDoorways,
} from '../assets/floorPlan/doorways';

describe('getDoorwayClearanceZones', () => {
const zones = getDoorwayClearanceZones(FLOOR_PLAN, {
    depth: 1.2,
    sidePadding: 0.4,
  });

  it('generates doorway clearances for rooms with door definitions', () => {
    const livingRoomZones = zones.filter(
      (zone) => zone.roomId === 'livingRoom'
    );
    expect(livingRoomZones.length).toBeGreaterThan(0);
  });

  it('creates north wall clearances that extend toward positive Z', () => {
    const livingNorth = zones.find(
      (zone) => zone.roomId === 'livingRoom' && zone.wall === 'north'
    );
    expect(livingNorth).toBeDefined();
    const { bounds } = livingNorth!;
    const room = FLOOR_PLAN.rooms.find((entry) => entry.id === 'livingRoom')!;
    expect(bounds.maxZ).toBeGreaterThan(room.bounds.maxZ);
    expect(bounds.minZ).toBeLessThan(bounds.maxZ);
  });

  it('clamps doorway padding within room bounds', () => {
    const studioEast = zones.find(
      (zone) => zone.roomId === 'studio' && zone.wall === 'west'
    );
    expect(studioEast).toBeDefined();
    const { bounds } = studioEast!;
    const room = FLOOR_PLAN.rooms.find((entry) => entry.id === 'studio')!;
    expect(bounds.minZ).toBeGreaterThanOrEqual(room.bounds.minZ - 1e-3);
    expect(bounds.maxZ).toBeLessThanOrEqual(room.bounds.maxZ + 1e-3);
  });
});

const DOOR_EPSILON = 1e-6;

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
  doorways: ReturnType<typeof getNormalizedDoorways>,
  roomAId: string,
  wallA: RoomWall,
  roomBId: string,
  wallB: RoomWall
) {
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

describe('getNormalizedDoorways', () => {
  const doorways = getNormalizedDoorways(FLOOR_PLAN);

  it('deduplicates shared doorway definitions', () => {
    const doorway = resolveNormalizedDoorway(
      doorways,
      'livingRoom',
      'north',
      'kitchen',
      'south'
    );
    expect(doorway).toBeDefined();
    expect(doorway?.width).toBeGreaterThan(0);
  });

  it('includes vertical doorway centers for east-west transitions', () => {
    const doorway = resolveNormalizedDoorway(
      doorways,
      'kitchen',
      'east',
      'studio',
      'west'
    );
    expect(doorway).toBeDefined();
    expect(doorway?.axis).toBe('vertical');
  });
});

describe('getDoorwayPassageZones', () => {
  const padding = 0.5;
  const depth = 2;
  const zones = getDoorwayPassageZones(FLOOR_PLAN, { padding, depth });

  it('extends horizontal passages along the Z axis using depth', () => {
    const normalized = resolveNormalizedDoorway(
      getNormalizedDoorways(FLOOR_PLAN),
      'livingRoom',
      'north',
      'kitchen',
      'south'
    );
    const livingKitchen = zones.find(
      (zone) =>
        normalized &&
        Math.abs(zone.doorway.center.x - normalized.center.x) < DOOR_EPSILON &&
        Math.abs(zone.doorway.center.z - normalized.center.z) < DOOR_EPSILON
    );
    expect(livingKitchen).toBeDefined();
    if (!livingKitchen) {
      return;
    }
    const halfDepth = depth / 2;
    expect(livingKitchen.bounds.minZ).toBeCloseTo(
      livingKitchen.doorway.center.z - halfDepth,
      3
    );
    expect(livingKitchen.bounds.maxZ).toBeCloseTo(
      livingKitchen.doorway.center.z + halfDepth,
      3
    );
  });

  it('pads vertical passages along the X axis', () => {
    const normalized = resolveNormalizedDoorway(
      getNormalizedDoorways(FLOOR_PLAN),
      'kitchen',
      'east',
      'studio',
      'west'
    );
    const kitchenStudio = zones.find(
      (zone) =>
        normalized &&
        Math.abs(zone.doorway.center.x - normalized.center.x) < DOOR_EPSILON &&
        Math.abs(zone.doorway.center.z - normalized.center.z) < DOOR_EPSILON
    );
    expect(kitchenStudio).toBeDefined();
    if (!kitchenStudio) {
      return;
    }
    const halfWidth = kitchenStudio.doorway.width / 2;
    expect(kitchenStudio.bounds.minX).toBeCloseTo(
      kitchenStudio.doorway.center.x - depth / 2,
      3
    );
    expect(kitchenStudio.bounds.maxX).toBeCloseTo(
      kitchenStudio.doorway.center.x + depth / 2,
      3
    );
    expect(kitchenStudio.bounds.minZ).toBeCloseTo(
      kitchenStudio.doorway.center.z - halfWidth - padding,
      3
    );
    expect(kitchenStudio.bounds.maxZ).toBeCloseTo(
      kitchenStudio.doorway.center.z + halfWidth + padding,
      3
    );
  });
});
