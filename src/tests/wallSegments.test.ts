import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  WALL_THICKNESS,
  type DoorwayDefinition,
  type FloorPlanDefinition,
} from '../assets/floorPlan';
import { createWallSegmentInstances } from '../assets/floorPlan/wallSegments';
import { isLevelSourceId } from '../scene/level/sourceIds';
import { collidesWithColliders } from '../systems/collision';

const WALL_HEIGHT = 6;
const FENCE_HEIGHT = 2.4;
const FENCE_THICKNESS = 0.28;
const PLAYER_RADIUS = 0.75;

function getRoomCategory(roomId: string) {
  const room = FLOOR_PLAN.rooms.find((entry) => entry.id === roomId);
  return room?.category ?? 'interior';
}

function findSharedDoorway(
  a: readonly DoorwayDefinition[] | undefined,
  b: readonly DoorwayDefinition[] | undefined
): DoorwayDefinition | undefined {
  if (!a || !b) {
    return undefined;
  }
  return a.find((doorwayA) =>
    b.some(
      (doorwayB) =>
        Math.abs(doorwayA.start - doorwayB.start) < 1e-3 &&
        Math.abs(doorwayA.end - doorwayB.end) < 1e-3
    )
  );
}

describe('createWallSegmentInstances', () => {
  const groundWallInstances = createWallSegmentInstances(FLOOR_PLAN, {
    baseElevation: 0,
    wallHeight: WALL_HEIGHT,
    wallThickness: WALL_THICKNESS,
    fenceHeight: FENCE_HEIGHT,
    fenceThickness: FENCE_THICKNESS,
    floorId: 'ground',
    getRoomCategory,
  });
  const colliders = groundWallInstances.map((instance) => instance.collider);

  it('creates valid unique floor-scoped source IDs without array indexes', () => {
    const sourceIds = groundWallInstances.map((instance) => instance.sourceId);
    expect(sourceIds.every(isLevelSourceId)).toBe(true);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(sourceIds.every((sourceId) => sourceId.startsWith('ground.'))).toBe(
      true
    );
    expect(
      sourceIds.every((sourceId) => !/[.|-](?:0|[1-9]\d*)$/.test(sourceId))
    ).toBe(true);
  });

  it('keeps source IDs stable when an unrelated fixture segment is inserted', () => {
    const fixture: FloorPlanDefinition = {
      outline: [
        [0, 0],
        [8, 0],
        [8, 4],
        [0, 4],
      ],
      rooms: [
        {
          id: 'alphaRoom',
          name: 'Alpha Room',
          bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
          ledColor: 0xffffff,
        },
        {
          id: 'betaRoom',
          name: 'Beta Room',
          bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
          ledColor: 0xffffff,
        },
      ],
    };
    const withInsertedRoom: FloorPlanDefinition = {
      ...fixture,
      rooms: [
        {
          id: 'insertedRoom',
          name: 'Inserted Room',
          bounds: { minX: 20, maxX: 24, minZ: 20, maxZ: 24 },
          ledColor: 0xffffff,
        },
        ...fixture.rooms,
      ],
    };
    const options = {
      floorId: 'ground',
      baseElevation: 0,
      wallHeight: WALL_HEIGHT,
      wallThickness: WALL_THICKNESS,
      fenceHeight: FENCE_HEIGHT,
      fenceThickness: FENCE_THICKNESS,
      getRoomCategory: () => 'interior' as const,
    };

    const before = createWallSegmentInstances(fixture, options);
    const after = createWallSegmentInstances(withInsertedRoom, options);
    const beforeIdsBySegment = new Map(
      before.map((instance) => [instance.segmentId, instance.sourceId])
    );

    for (const instance of after.filter(
      (candidate) => !candidate.sourceId.includes('inserted-room')
    )) {
      expect(instance.sourceId).toBe(
        beforeIdsBySegment.get(instance.segmentId)
      );
    }
  });

  it('does not change geometry or collider bounds when floor source context is added', () => {
    const withoutFloor = createWallSegmentInstances(FLOOR_PLAN, {
      baseElevation: 0,
      wallHeight: WALL_HEIGHT,
      wallThickness: WALL_THICKNESS,
      fenceHeight: FENCE_HEIGHT,
      fenceThickness: FENCE_THICKNESS,
      getRoomCategory,
    });

    expect(
      groundWallInstances.map((instance) => ({
        segmentId: instance.segmentId,
        center: instance.center,
        dimensions: instance.dimensions,
        collider: instance.collider,
      }))
    ).toEqual(
      withoutFloor.map((instance) => ({
        segmentId: instance.segmentId,
        center: instance.center,
        dimensions: instance.dimensions,
        collider: instance.collider,
      }))
    );
  });

  it('leaves usable gaps for shared doorways', () => {
    const livingRoom = FLOOR_PLAN.rooms.find(
      (room) => room.id === 'livingRoom'
    );
    const kitchen = FLOOR_PLAN.rooms.find((room) => room.id === 'kitchen');
    expect(livingRoom).toBeDefined();
    expect(kitchen).toBeDefined();
    if (!livingRoom || !kitchen) {
      return;
    }

    const shared = findSharedDoorway(livingRoom.doorways, kitchen.doorways);
    expect(shared).toBeDefined();
    if (!shared) {
      return;
    }

    const doorwayCenter = (shared.start + shared.end) / 2;
    const livingSideZ = livingRoom.bounds.maxZ - PLAYER_RADIUS * 0.6;
    const kitchenSideZ = kitchen.bounds.minZ + PLAYER_RADIUS * 0.6;

    expect(
      collidesWithColliders(
        doorwayCenter,
        livingSideZ,
        PLAYER_RADIUS,
        colliders
      )
    ).toBe(false);
    expect(
      collidesWithColliders(
        doorwayCenter,
        kitchenSideZ,
        PLAYER_RADIUS,
        colliders
      )
    ).toBe(false);

    const wallX = livingRoom.bounds.minX + WALL_THICKNESS * 0.25;
    expect(collidesWithColliders(wallX, livingSideZ, 0.3, colliders)).toBe(
      true
    );
  });

  it('flags backyard perimeter segments as fences', () => {
    const backyardFence = groundWallInstances.find(
      (instance) =>
        instance.segment.rooms.length === 1 &&
        instance.segment.rooms[0]?.id === 'backyard'
    );
    expect(backyardFence).toBeDefined();
    expect(backyardFence?.isFence).toBe(true);
    expect(backyardFence?.dimensions.height).toBeCloseTo(FENCE_HEIGHT, 5);
  });

  it('treats interior-to-exterior transitions as shared segments', () => {
    const transition = groundWallInstances.find(
      (instance) =>
        instance.segment.rooms.some((room) => room.id === 'backyard') &&
        instance.segment.rooms.some((room) => room.id === 'kitchen')
    );
    expect(transition).toBeDefined();
    expect(transition?.isFence).toBe(false);
    expect(transition?.isSharedInterior).toBe(true);
    expect(transition?.dimensions.height).toBeCloseTo(WALL_HEIGHT, 5);
  });
});
