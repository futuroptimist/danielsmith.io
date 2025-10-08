import { describe, expect, it } from 'vitest';

import { collidesWithColliders } from '../collision';
import {
  FLOOR_PLAN,
  WALL_THICKNESS,
  type DoorwayDefinition,
} from '../floorPlan';
import { createWallSegmentInstances } from '../floorPlan/wallSegments';

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
    getRoomCategory,
  });
  const colliders = groundWallInstances.map((instance) => instance.collider);

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
