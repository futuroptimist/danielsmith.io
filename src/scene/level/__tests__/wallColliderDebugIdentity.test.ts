import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, WALL_THICKNESS } from '../../../assets/floorPlan';
import type { RoomCategory } from '../../../assets/floorPlan';
import { generateWallSegmentInstances } from '../generateWalls';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { getWallColliderDebugIdentity } from '../wallColliderDebugIdentity';

const getRoomCategory = (
  roomId: string,
  floorId: 'ground' | 'upper'
): RoomCategory => {
  return (
    PORTFOLIO_LEVEL.floors
      .find((floor) => floor.id === floorId)
      ?.rooms.find((room) => room.id === roomId)?.category ?? 'interior'
  );
};

const wallOptions = (floorId: 'ground' | 'upper') => ({
  coordinateScale: FLOOR_PLAN_SCALE,
  baseElevation: floorId === 'ground' ? 0 : 6,
  wallHeight: 6,
  wallThickness: WALL_THICKNESS,
  fenceHeight: 2.4,
  fenceThickness: 0.28,
  getRoomCategory: (roomId: string) => getRoomCategory(roomId, floorId),
});

describe('wall collider debug identities', () => {
  it('derives deterministic names from wall source IDs', () => {
    const floor = PORTFOLIO_LEVEL.floors.find(
      (candidate) => candidate.id === 'ground'
    );
    expect(floor).toBeDefined();
    if (!floor) return;

    const [instance] = generateWallSegmentInstances(
      floor,
      wallOptions('ground')
    );
    expect(instance).toBeDefined();
    if (!instance) return;

    const identity = getWallColliderDebugIdentity('ground', instance);

    expect(identity).toEqual(getWallColliderDebugIdentity('ground', instance));
    expect(identity.name).toBe(
      `GroundWallCollider:${instance.sourceId}:${identity.debugId}`
    );
    expect(identity.debugId).toMatch(/^[0-9A-F]{6}$/);
  });

  it('keeps split wall segments explicit without colliding debug IDs', () => {
    const identities = PORTFOLIO_LEVEL.floors.flatMap((floor) => {
      const floorId = floor.id as 'ground' | 'upper';
      return generateWallSegmentInstances(floor, wallOptions(floorId)).map(
        (instance) => getWallColliderDebugIdentity(floorId, instance)
      );
    });

    expect(identities.length).toBeGreaterThan(0);
    expect(new Set(identities.map((identity) => identity.name)).size).toBe(
      identities.length
    );
    expect(new Set(identities.map((identity) => identity.debugId)).size).toBe(
      identities.length
    );
    expect(
      identities.some((identity) =>
        identity.name.startsWith(
          'GroundWallCollider:ground.living_room.north_wall'
        )
      )
    ).toBe(true);
    expect(
      identities.some((identity) =>
        identity.name.startsWith(
          'UpperWallCollider:upper.upper_landing_to_loft_library.wall'
        )
      )
    ).toBe(true);
  });
});
