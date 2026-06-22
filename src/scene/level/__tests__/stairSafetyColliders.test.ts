import { describe, expect, it } from 'vitest';

import {
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from '../../../systems/movement/stairs';
import { assertDebugColliderIdsDoNotCollide } from '../../debug/colliderDebugIds';
import { createColliderDebugId } from '../../debug/colliderVisualizer';
import { assertValidSourceCollisionRecords } from '../sourceCollisionValidation';
import {
  createGroundStairSafetyColliders,
  createUpperStairSafetyColliders,
  type LevelSafetyCollider,
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

const upperArgs = {
  stairCenterX: geometry.centerX,
  stairHalfWidth: geometry.halfWidth,
  playerRadius: PLAYER_RADIUS,
  wallThickness: 0.42,
  doorwayDepth: 1.92,
  stairwellMarginX: 0.9,
  stairTopZ: geometry.topZ,
  stairLandingTriggerMargin: behavior.landingTriggerMargin,
  stairLayoutDirectionMultiplier: -1 as const,
  upperLandingRoomBounds: {
    minX: 6,
    maxX: 24,
    minZ: -34,
    maxZ: -18,
  },
  upperStairwellOpening: {
    minX: 8.4,
    maxX: 16.4,
    minZ: -31.1,
    maxZ: -24.7,
  },
  stairNavigationZones: createStairNavigationZones(geometry, behavior),
  upperStairBannisterThickness: 0.28,
};

const collectSafetyColliders = (): LevelSafetyCollider[] => [
  ...createGroundStairSafetyColliders(geometry, behavior, {
    playerRadius: PLAYER_RADIUS,
    guardThickness: 0.44,
  }),
  ...createUpperStairSafetyColliders(upperArgs),
];

describe('stair safety collider source definitions', () => {
  it('preserves key generated upper stair guard bounds', () => {
    // Exact bounds stay here because this is a small synthetic generator fixture,
    // not the production PORTFOLIO_LEVEL scene inventory.
    const colliders = createUpperStairSafetyColliders(upperArgs);

    expect(
      colliders.find(
        (collider) => collider.name === 'UpperStairWestBannisterGuard'
      )?.bounds
    ).toEqual({
      minX: 9.4,
      maxX: 10.290000000000001,
      minZ: -24.669999999999998,
      maxZ: -18.130000000000003,
    });
    expect(
      colliders.find(
        (collider) => collider.name === 'UpperStairNorthBannisterGuard'
      )?.bounds
    ).toEqual({
      minX: 10.47,
      maxX: 16.119999999999997,
      minZ: -18.270000000000003,
      maxZ: -17.990000000000002,
    });
  });

  it('emits valid source-backed active safety records', () => {
    expect(() =>
      assertValidSourceCollisionRecords(collectSafetyColliders())
    ).not.toThrow();
  });

  it('keeps active safety collider debug IDs collision-free', () => {
    const declaredIds = collectSafetyColliders().map(
      (collider) => [collider.name, collider.debugId] as const
    );

    expect(() => assertDebugColliderIdsDoNotCollide(declaredIds)).not.toThrow();
  });

  it('passes source-backed safety debug IDs through runtime registration unchanged', () => {
    collectSafetyColliders().forEach((collider) => {
      expect(
        createColliderDebugId({
          floor: collider.floor,
          category: collider.floor,
          name: collider.name,
          bounds: collider.bounds,
          debugId: collider.debugId,
        })
      ).toBe(collider.debugId);
    });
  });
});
