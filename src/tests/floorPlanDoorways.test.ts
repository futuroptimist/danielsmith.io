import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  UPPER_FLOOR_PLAN,
  WALL_THICKNESS,
  type RoomCategory,
} from '../assets/floorPlan';
import {
  getDoorwayClearanceZones,
  getDoorwayPassageZones,
  getNormalizedDoorways,
} from '../assets/floorPlan/doorways';
import { createWallSegmentInstances } from '../assets/floorPlan/wallSegments';
import { collidesWithColliders } from '../systems/collision';
import { createNavMesh } from '../systems/navigation/navMesh';

import {
  DOOR_EPSILON,
  findSharedDoorway,
  resolveNormalizedDoorway,
} from './helpers/doorwayTestHelpers';

const PLAYER_RADIUS = 0.75;
const WALL_HEIGHT = 6;
const FENCE_HEIGHT = 2.4;
const FENCE_THICKNESS = 0.28;

function getRoomCategory(roomId: string): RoomCategory {
  const room = UPPER_FLOOR_PLAN.rooms.find((entry) => entry.id === roomId);
  return room?.category ?? 'interior';
}

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

describe('getNormalizedDoorways', () => {
  const doorways = getNormalizedDoorways(FLOOR_PLAN);

  it('deduplicates shared doorway definitions', () => {
    const doorway = resolveNormalizedDoorway({
      doorways,
      roomAId: 'livingRoom',
      wallA: 'north',
      roomBId: 'kitchen',
      wallB: 'south',
    });
    expect(doorway).toBeDefined();
    expect(doorway?.width).toBeGreaterThan(0);
  });

  it('includes vertical doorway centers for east-west transitions', () => {
    const doorway = resolveNormalizedDoorway({
      doorways,
      roomAId: 'kitchen',
      wallA: 'east',
      roomBId: 'studio',
      wallB: 'west',
    });
    expect(doorway).toBeDefined();
    expect(doorway?.axis).toBe('vertical');
  });
});

describe('getDoorwayPassageZones', () => {
  const padding = 0.5;
  const depth = 2;
  const zones = getDoorwayPassageZones(FLOOR_PLAN, { padding, depth });

  it('extends horizontal passages along the Z axis using depth', () => {
    const normalized = resolveNormalizedDoorway({
      roomAId: 'livingRoom',
      wallA: 'north',
      roomBId: 'kitchen',
      wallB: 'south',
    });
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
    const normalized = resolveNormalizedDoorway({
      roomAId: 'kitchen',
      wallA: 'east',
      roomBId: 'studio',
      wallB: 'west',
    });
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

describe('upper landing west egress doorway', () => {
  const desiredWorldZSamples = [-26.14, -27.5, -29, -30.5, -31.24];
  const upperLanding = UPPER_FLOOR_PLAN.rooms.find(
    (room) => room.id === 'upperLanding'
  );
  const creatorsStudio = UPPER_FLOOR_PLAN.rooms.find(
    (room) => room.id === 'creatorsStudio'
  );

  it('aligns the upperLanding west doorway with the creatorsStudio east doorway', () => {
    expect(upperLanding).toBeDefined();
    expect(creatorsStudio).toBeDefined();
    if (!upperLanding || !creatorsStudio) {
      return;
    }

    const sharedDoorway = findSharedDoorway(
      upperLanding.doorways?.filter((doorway) => doorway.wall === 'west'),
      creatorsStudio.doorways?.filter((doorway) => doorway.wall === 'east')
    );

    expect(sharedDoorway).toBeDefined();
    expect(sharedDoorway?.start).toBeLessThanOrEqual(
      Math.min(...desiredWorldZSamples) + DOOR_EPSILON
    );
    expect(sharedDoorway?.end).toBeGreaterThanOrEqual(
      Math.max(...desiredWorldZSamples) - DOOR_EPSILON
    );
  });

  it('exposes a passage zone across the widened west egress band', () => {
    const normalized = resolveNormalizedDoorway({
      plan: UPPER_FLOOR_PLAN,
      roomAId: 'upperLanding',
      wallA: 'west',
      roomBId: 'creatorsStudio',
      wallB: 'east',
    });
    expect(normalized).toBeDefined();
    if (!normalized) {
      return;
    }

    const zones = getDoorwayPassageZones(UPPER_FLOOR_PLAN);
    const egressZone = zones.find(
      (zone) =>
        Math.abs(zone.doorway.center.x - normalized.center.x) < DOOR_EPSILON &&
        Math.abs(zone.doorway.center.z - normalized.center.z) < DOOR_EPSILON
    );
    expect(egressZone).toBeDefined();
    if (!egressZone) {
      return;
    }

    const navMesh = createNavMesh(UPPER_FLOOR_PLAN);
    for (const z of desiredWorldZSamples) {
      expect(z).toBeGreaterThanOrEqual(egressZone.bounds.minZ - DOOR_EPSILON);
      expect(z).toBeLessThanOrEqual(egressZone.bounds.maxZ + DOOR_EPSILON);
      expect(navMesh.contains(normalized.center.x, z)).toBe(true);
    }
  });

  it('leaves the lower requested doorway edge crossable for player collision', () => {
    const normalized = resolveNormalizedDoorway({
      plan: UPPER_FLOOR_PLAN,
      roomAId: 'upperLanding',
      wallA: 'west',
      roomBId: 'creatorsStudio',
      wallB: 'east',
    });
    expect(normalized).toBeDefined();
    if (!normalized) {
      return;
    }

    const wallInstances = createWallSegmentInstances(UPPER_FLOOR_PLAN, {
      baseElevation: 0,
      wallHeight: WALL_HEIGHT,
      wallThickness: WALL_THICKNESS,
      fenceHeight: FENCE_HEIGHT,
      fenceThickness: FENCE_THICKNESS,
      getRoomCategory,
    });
    const colliders = wallInstances.map((instance) => instance.collider);
    const lowerRequestedEdgeZ = Math.min(...desiredWorldZSamples);

    expect(
      collidesWithColliders(
        normalized.center.x + PLAYER_RADIUS,
        lowerRequestedEdgeZ,
        PLAYER_RADIUS,
        colliders
      )
    ).toBe(false);
    expect(
      collidesWithColliders(
        normalized.center.x - PLAYER_RADIUS,
        lowerRequestedEdgeZ,
        PLAYER_RADIUS,
        colliders
      )
    ).toBe(false);
  });

  it('omits the former upper landing to loft library west wall blocker', () => {
    const wallInstances = createWallSegmentInstances(UPPER_FLOOR_PLAN, {
      baseElevation: 0,
      wallHeight: WALL_HEIGHT,
      wallThickness: WALL_THICKNESS,
      fenceHeight: FENCE_HEIGHT,
      fenceThickness: FENCE_THICKNESS,
      getRoomCategory,
    });
    const formerWallBounds = {
      minX: 3.875,
      maxX: 8.525,
      minZ: -16.25,
      maxZ: -15.75,
    };

    expect(
      wallInstances.some(
        (instance) =>
          instance.segment.rooms.some((room) => room.id === 'upperLanding') &&
          instance.segment.rooms.some((room) => room.id === 'loftLibrary') &&
          Math.abs(instance.collider.minX - formerWallBounds.minX) < 0.001 &&
          Math.abs(instance.collider.maxX - formerWallBounds.maxX) < 0.001 &&
          Math.abs(instance.collider.minZ - formerWallBounds.minZ) < 0.001 &&
          Math.abs(instance.collider.maxZ - formerWallBounds.maxZ) < 0.001
      )
    ).toBe(false);
    expect(
      collidesWithColliders(
        6.2,
        -16,
        PLAYER_RADIUS,
        wallInstances.map((instance) => instance.collider)
      )
    ).toBe(false);
  });
});
