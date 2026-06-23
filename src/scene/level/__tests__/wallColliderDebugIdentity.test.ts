import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, WALL_THICKNESS } from '../../../assets/floorPlan';
import type { RoomCategory } from '../../../assets/floorPlan';
import {
  BACKYARD_FENCE_SEGMENT_POLICIES,
  BACKYARD_HOLOGRAM_BARRIER_POLICY,
} from '../backyardCollisionPolicies';
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

const generatedWallColliderIdentities = () =>
  PORTFOLIO_LEVEL.floors.flatMap((floor) => {
    const floorId = floor.id as 'ground' | 'upper';
    return generateWallSegmentInstances(floor, wallOptions(floorId)).map(
      (instance) => ({
        floorId,
        instance,
        identity: getWallColliderDebugIdentity(floorId, instance),
      })
    );
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

  it('covers generated fence instances with deterministic source identities', () => {
    const generatedIdentities = generatedWallColliderIdentities();
    const fenceIdentity = generatedIdentities.find(
      ({ instance }) => instance.isFence
    );

    expect(fenceIdentity).toBeDefined();
    if (!fenceIdentity) return;

    const prefix =
      fenceIdentity.floorId === 'ground'
        ? 'GroundWallCollider'
        : 'UpperWallCollider';
    expect(fenceIdentity?.identity.name).toBe(
      `${prefix}:${fenceIdentity.instance.sourceId}:${fenceIdentity.identity.debugId}`
    );
    expect(fenceIdentity.identity.debugId).toMatch(/^[0-9A-F]{6}$/);
  });

  it('keeps generated wall and fence debug identities deterministic and unique', () => {
    const generatedIdentities = generatedWallColliderIdentities();

    expect(generatedIdentities.length).toBeGreaterThan(0);
    expect(
      new Set(generatedIdentities.map(({ identity }) => identity.name)).size
    ).toBe(generatedIdentities.length);
    expect(
      new Set(generatedIdentities.map(({ identity }) => identity.debugId)).size
    ).toBe(generatedIdentities.length);
    expect(
      generatedIdentities.every(({ floorId, identity, instance }) => {
        const prefix =
          floorId === 'ground' ? 'GroundWallCollider' : 'UpperWallCollider';
        return (
          identity.name ===
            `${prefix}:${instance.sourceId}:${identity.debugId}` &&
          identity.name ===
            getWallColliderDebugIdentity(floorId, instance).name &&
          identity.debugId ===
            getWallColliderDebugIdentity(floorId, instance).debugId
        );
      })
    ).toBe(true);
  });

  it('keeps generated wall and fence names source-derived', () => {
    const generatedIdentities = generatedWallColliderIdentities();

    expect(generatedIdentities.length).toBeGreaterThan(0);
    expect(
      generatedIdentities.every(
        ({ identity }) =>
          !identity.name.startsWith('ground-collider-') &&
          !identity.name.startsWith('upper-collider-')
      )
    ).toBe(true);
    expect(
      generatedIdentities.some(({ identity }) =>
        identity.name.startsWith(
          'GroundWallCollider:ground.living_room.north_wall'
        )
      )
    ).toBe(true);
    expect(
      generatedIdentities.some(({ identity }) =>
        identity.name.startsWith(
          'UpperWallCollider:upper.upper_landing_to_loft_library.wall'
        )
      )
    ).toBe(true);
  });

  it('assigns valid non-colliding backyard side fence boundary debug IDs', () => {
    const sideFencePolicies = BACKYARD_FENCE_SEGMENT_POLICIES.filter(
      (policy) =>
        policy.role === 'leftFenceBoundary' ||
        policy.role === 'rightFenceBoundary'
    );
    const existingDebugIds = new Set([
      BACKYARD_FENCE_SEGMENT_POLICIES.find(
        (policy) => policy.role === 'backFenceBoundary'
      )?.debugId,
      BACKYARD_HOLOGRAM_BARRIER_POLICY.debugId,
    ]);

    expect(sideFencePolicies).toHaveLength(2);
    expect(
      sideFencePolicies.every((policy) =>
        /^[0-9A-F]{4,6}$/.test(policy.debugId ?? '')
      )
    ).toBe(true);
    expect(
      sideFencePolicies.every(
        (policy) => policy.debugId && !existingDebugIds.has(policy.debugId)
      )
    ).toBe(true);
    expect(
      new Set(sideFencePolicies.map((policy) => policy.debugId)).size
    ).toBe(sideFencePolicies.length);
  });
});
