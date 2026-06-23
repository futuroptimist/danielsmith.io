import { describe, expect, it } from 'vitest';

import { getSourceBackedWallColliderIdentity } from '../colliderSourceIdentities';

const wallInstance = {
  sourceId: 'ground.living_room.north_wall' as const,
  segmentId: 'horizontal|-10.000,10.000|10.000,10.000|livingRoom:north',
  isFence: false,
};

describe('getSourceBackedWallColliderIdentity', () => {
  it('derives deterministic ground wall names and explicit debug IDs from source metadata', () => {
    const identity = getSourceBackedWallColliderIdentity(
      'ground',
      wallInstance
    );

    expect(identity).toEqual(
      getSourceBackedWallColliderIdentity('ground', wallInstance)
    );
    expect(identity.name).toBe(
      'GroundWallCollider:ground.living_room.north_wall:horizontal|-10.000,10.000|10.000,10.000|livingRoom:north'
    );
    expect(identity.debugId).toMatch(/^[0-9A-F]{6}$/);
  });

  it('keeps fence and upper wall identities source-backed without generated labels', () => {
    expect(
      getSourceBackedWallColliderIdentity('ground', {
        ...wallInstance,
        sourceId: 'ground.backyard.north_fence' as const,
        isFence: true,
      }).name
    ).toMatch(/^GroundFenceCollider:ground\.backyard\.north_fence:/);

    expect(
      getSourceBackedWallColliderIdentity('upper', wallInstance).name
    ).toMatch(/^UpperWallCollider:ground\.living_room\.north_wall:/);
  });

  it('uses segment IDs to distinguish split colliders with the same source ID', () => {
    const first = getSourceBackedWallColliderIdentity('ground', wallInstance);
    const second = getSourceBackedWallColliderIdentity('ground', {
      ...wallInstance,
      segmentId: 'horizontal|-20.000,10.000|-10.000,10.000|livingRoom:north',
    });

    expect(second.name).not.toBe(first.name);
    expect(second.debugId).not.toBe(first.debugId);
  });
});
