import { describe, expect, it } from 'vitest';

import {
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from '../../../systems/movement/stairs';
import {
  getDeclaredColliderDebugId,
  isDebugColliderId,
} from '../../debug/colliderDebugIds';
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

  it('assigns every safety collider a source ID and purpose without duplicates', () => {
    const colliders = collectSafetyColliders();
    const sourceIds = colliders.map((collider) => String(collider.sourceId));

    expect(
      colliders.every(
        (collider) => collider.sourceId && collider.purpose.trim()
      )
    ).toBe(true);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
  });

  it('keeps source-backed debug IDs valid, unique, and source-owned', () => {
    const colliders = collectSafetyColliders();
    const debugIds = colliders.map((collider) => collider.debugId);

    expect(debugIds.every(isDebugColliderId)).toBe(true);
    expect(new Set(debugIds).size).toBe(debugIds.length);
    colliders.forEach((collider) => {
      expect(
        getDeclaredColliderDebugId({
          floor: collider.floor,
          category: collider.floor,
          name: collider.name,
        })
      ).not.toBe(collider.debugId);
    });
  });

  it('preserves the active stair safety debug ID set from declarations', () => {
    const idsByName = new Map(
      collectSafetyColliders().map((collider) => [
        collider.name,
        collider.debugId,
      ])
    );

    expect(idsByName.get('GroundStairEastBoundary')).toBe('4001');
    expect(idsByName.get('GroundStairLowerCornerGuard')).toBe('4002');
    expect(idsByName.get('UpperStairEastUpperVoidGuard')).toBe('4007');
    expect(idsByName.get('UpperStairWestBannisterGuard')).toBe('4009');
    expect(idsByName.get('UpperStairNorthBannisterGuard')).toBe('400A');
  });

  it('keeps safety collider source IDs free of tombstone wording', () => {
    collectSafetyColliders().forEach((collider) => {
      expect(String(collider.sourceId)).not.toMatch(
        /\.(former|removed|debugonlyremoval)\./i
      );
    });
  });
});
