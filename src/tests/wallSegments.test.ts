import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  WALL_THICKNESS,
  type DoorwayDefinition,
  type FloorPlanDefinition,
} from '../assets/floorPlan';
import {
  createWallSegmentInstances,
  type WallSegmentInstance,
} from '../assets/floorPlan/wallSegments';
import { isLevelSourceId } from '../scene/level/sourceIds';
import { collidesWithColliders } from '../systems/collision';

const WALL_HEIGHT = 6;
const FENCE_HEIGHT = 2.4;
const FENCE_THICKNESS = 0.28;
const PLAYER_RADIUS = 0.75;

const subMillimeterEndpointPlan: FloorPlanDefinition = {
  outline: [
    [0, 0],
    [3, 0],
    [3, 2],
    [0, 2],
  ],
  rooms: [
    {
      id: 'nearWall',
      name: 'Near Wall A',
      bounds: { minX: 0, maxX: 2, minZ: 0, maxZ: 1 },
      ledColor: 0xffffff,
    },
    {
      id: 'nearWall',
      name: 'Near Wall B',
      bounds: { minX: 0.0004, maxX: 2.0004, minZ: 0, maxZ: 1 },
      ledColor: 0xffffff,
    },
  ],
};

const fixturePlan: FloorPlanDefinition = {
  outline: [
    [0, 0],
    [12, 0],
    [12, 4],
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
      bounds: { minX: 8, maxX: 12, minZ: 0, maxZ: 4 },
      ledColor: 0xffffff,
    },
  ],
};

const getFixtureRoomCategory = () => 'interior' as const;

const createFixtureInstances = (plan: FloorPlanDefinition) =>
  createWallSegmentInstances(plan, {
    floorId: 'ground',
    baseElevation: 0,
    wallHeight: WALL_HEIGHT,
    wallThickness: WALL_THICKNESS,
    fenceHeight: FENCE_HEIGHT,
    fenceThickness: FENCE_THICKNESS,
    getRoomCategory: getFixtureRoomCategory,
  });

const getSegmentKey = (instance: Pick<WallSegmentInstance, 'segment'>) =>
  [
    instance.segment.orientation,
    instance.segment.start.x.toFixed(3),
    instance.segment.start.z.toFixed(3),
    instance.segment.end.x.toFixed(3),
    instance.segment.end.z.toFixed(3),
    instance.segment.rooms
      .map((room) => `${room.id}:${room.wall}`)
      .sort()
      .join('|'),
  ].join('|');

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
    getRoomCategory,
    floorId: 'ground',
  });
  const colliders = groundWallInstances.map((instance) => instance.collider);

  it('assigns valid unique semantic source IDs without array index suffixes', () => {
    const sourceIds = groundWallInstances.map((instance) => instance.sourceId);
    const segmentIds = groundWallInstances.map(
      (instance) => instance.segmentId
    );

    expect(sourceIds.every(isLevelSourceId)).toBe(true);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(sourceIds.every((sourceId) => !/[.|_-]\d+$/.test(sourceId))).toBe(
      true
    );
    expect(segmentIds.every((segmentId) => !/[.|_-]\d+$/.test(segmentId))).toBe(
      true
    );
  });

  it('keeps sub-0.001 endpoint differences distinct in generated source IDs', () => {
    const nearWallInstances = createFixtureInstances(subMillimeterEndpointPlan);
    const nearWallSouthFragments = nearWallInstances.filter(
      (instance) =>
        instance.segment.orientation === 'horizontal' &&
        instance.segment.rooms.length === 1 &&
        instance.segment.rooms[0]?.id === 'nearWall' &&
        instance.segment.rooms[0]?.wall === 'south'
    );

    expect(nearWallSouthFragments).toHaveLength(2);
    expect(
      nearWallSouthFragments.every((instance) =>
        isLevelSourceId(instance.sourceId)
      )
    ).toBe(true);
    expect(
      new Set(nearWallSouthFragments.map((instance) => instance.sourceId)).size
    ).toBe(2);
    expect(
      nearWallSouthFragments.some((instance) =>
        [instance.segment.start.x, instance.segment.end.x].some(
          (coordinate) => Math.abs(coordinate - 0.0004) < 1e-8
        )
      )
    ).toBe(true);
    expect(nearWallSouthFragments[0]?.collider).not.toEqual(
      nearWallSouthFragments[1]?.collider
    );
  });

  it('keeps source IDs stable when an unrelated segment is inserted', () => {
    const original = createFixtureInstances(fixturePlan);
    const inserted = createFixtureInstances({
      ...fixturePlan,
      rooms: [
        fixturePlan.rooms[0]!,
        {
          id: 'insertedRoom',
          name: 'Inserted Room',
          bounds: { minX: 5, maxX: 7, minZ: 0, maxZ: 4 },
          ledColor: 0xffffff,
        },
        fixturePlan.rooms[1]!,
      ],
    });

    const insertedSourceIdsBySegment = new Map(
      inserted.map((instance) => [getSegmentKey(instance), instance.sourceId])
    );

    original.forEach((instance) => {
      expect(insertedSourceIdsBySegment.get(getSegmentKey(instance))).toBe(
        instance.sourceId
      );
    });
  });

  it('requires floor context for semantic source IDs', () => {
    expect(() =>
      createWallSegmentInstances(FLOOR_PLAN, {
        baseElevation: 0,
        wallHeight: WALL_HEIGHT,
        wallThickness: WALL_THICKNESS,
        fenceHeight: FENCE_HEIGHT,
        fenceThickness: FENCE_THICKNESS,
        getRoomCategory,
      } as never)
    ).toThrow(/requires floorId or levelId/);
  });

  it('preserves generated geometry and collider bounds when source IDs are added', () => {
    const alternateFloorContext = createWallSegmentInstances(FLOOR_PLAN, {
      floorId: 'alternate',
      baseElevation: 0,
      wallHeight: WALL_HEIGHT,
      wallThickness: WALL_THICKNESS,
      fenceHeight: FENCE_HEIGHT,
      fenceThickness: FENCE_THICKNESS,
      getRoomCategory,
    });

    expect(
      alternateFloorContext.map((instance) => ({
        center: instance.center,
        dimensions: instance.dimensions,
        collider: instance.collider,
        isFence: instance.isFence,
        isSharedInterior: instance.isSharedInterior,
        thickness: instance.thickness,
      }))
    ).toEqual(
      groundWallInstances.map((instance) => ({
        center: instance.center,
        dimensions: instance.dimensions,
        collider: instance.collider,
        isFence: instance.isFence,
        isSharedInterior: instance.isSharedInterior,
        thickness: instance.thickness,
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
