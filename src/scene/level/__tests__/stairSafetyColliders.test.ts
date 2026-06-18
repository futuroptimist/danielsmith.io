import { describe, expect, it } from 'vitest';

import {
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from '../../../systems/movement/stairs';
import {
  createGroundStairSafetyColliders,
  createUpperStairSafetyColliders,
} from '../stairSafetyColliders';

const PLAYER_RADIUS = 0.75;

const geometry: StairGeometry = {
  centerX: 12.4,
  halfWidth: 3.1,
  bottomZ: -10.6,
  topZ: -25.9,
  landingMinZ: -31.1,
  landingMaxZ: -25.9,
  totalRise: 3.78,
  direction: -1,
};

const behavior: StairBehavior = {
  transitionMargin: 1.2,
  landingTriggerMargin: 0.4,
  stepRise: 0.42,
  descentCorridorInset: PLAYER_RADIUS,
};

const expectSourceBackedSafetyColliders = (
  colliders: ReturnType<typeof createGroundStairSafetyColliders>
) => {
  expect(colliders.every((collider) => collider.sourceId)).toBe(true);
  expect(colliders.every((collider) => collider.purpose.trim())).toBe(true);
  expect(new Set(colliders.map((collider) => collider.sourceId)).size).toBe(
    colliders.length
  );
  expect(colliders.map((collider) => collider.sourceId)).not.toEqual(
    expect.arrayContaining([expect.stringMatching(/\.(former|removed)\./i)])
  );
};

describe('stair safety colliders', () => {
  it('wraps ground stair boundary colliders with source IDs and purposes', () => {
    const colliders = createGroundStairSafetyColliders(geometry, behavior, {
      playerRadius: PLAYER_RADIUS,
      guardThickness: 0.44,
    });

    expect(colliders).toMatchObject([
      {
        name: 'GroundStairEastBoundary',
        floor: 'ground',
        category: 'stair',
        sourceId: 'ground.stair.eastBoundary.safetyCollider',
        purpose: 'prevent lower stair side squeeze',
        bounds: {
          minX: 15.94,
          maxX: 22.18,
          minZ: -25.9,
          maxZ: -10.6,
        },
      },
      {
        name: 'GroundStairLowerCornerGuard',
        sourceId: 'ground.stair.lowerCorner.safetyCollider',
        purpose: 'block raw lower-step occupancy',
        bounds: {
          minX: 15.5,
          maxX: 22.18,
          minZ: -10.6,
          maxZ: -9.4,
        },
      },
    ]);
    expectSourceBackedSafetyColliders(colliders);
  });

  it('generates stable source-backed upper stair guard metadata and bounds', () => {
    const colliders = createUpperStairSafetyColliders({
      stairCenterX: geometry.centerX,
      stairHalfWidth: geometry.halfWidth,
      stairTopZ: geometry.topZ,
      stairwellMarginX: 0.4,
      doorwayDepth: 1.9,
      playerRadius: PLAYER_RADIUS,
      stairLandingTriggerMargin: behavior.landingTriggerMargin,
      stairTransitionMargin: behavior.transitionMargin,
      wallThickness: 0.32,
      upperLandingRoomBounds: {
        minX: -28,
        maxX: 28,
        minZ: -32,
        maxZ: 28,
      },
      upperStairwellOpening: {
        minX: 8.9,
        maxX: 15.9,
        minZ: -31.5,
        maxZ: -23.8,
      },
      stairNavigationZones: createStairNavigationZones(geometry, behavior),
      stairLayoutDirectionMultiplier: geometry.direction,
      upperStairBannisterThickness: 0.28,
    });

    expect(
      colliders.map((collider) => [collider.name, collider.sourceId])
    ).toEqual([
      [
        'UpperStairEastLowerVoidGuard',
        'upper.stairwell.eastLowerVoid.safetyCollider',
      ],
      [
        'UpperStairEastUpperVoidGuard',
        'upper.stairwell.eastUpperVoid.safetyCollider',
      ],
      [
        'UpperStairHiddenRunVoidGuard',
        'upper.stairwell.hiddenRun.safetyCollider',
      ],
      [
        'UpperStairWestBannisterGuard',
        'upper.stairwell.westBannister.safetyCollider',
      ],
      [
        'UpperStairNorthBannisterGuard',
        'upper.stairwell.northBannister.safetyCollider',
      ],
    ]);
    expect(
      colliders.find(
        (collider) => collider.name === 'UpperStairEastLowerVoidGuard'
      )?.bounds
    ).toEqual({
      minX: 14.75,
      maxX: 15.9,
      minZ: -31.5,
      maxZ: -27.799999999999997,
    });
    expect(
      colliders.find(
        (collider) => collider.name === 'UpperStairHiddenRunVoidGuard'
      )?.purpose
    ).toBe('guard hidden stair run no-floor area');
    expectSourceBackedSafetyColliders(colliders);
  });
});
