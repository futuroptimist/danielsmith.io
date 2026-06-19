import { describe, expect, it } from 'vitest';

import {
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from '../../../systems/movement/stairs';
import { getDeclaredColliderDebugId } from '../../debug/colliderDebugIds';
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
    const colliders = createUpperStairSafetyColliders(upperArgs);

    // This file uses synthetic stair geometry, so exact bounds stay here with
    // the isolated generator rather than in production PORTFOLIO_LEVEL tests.
    expect(
      colliders.find(
        (collider) => collider.name === 'UpperStairEastLowerVoidGuard'
      )?.bounds
    ).toEqual({
      minX: 14.75,
      maxX: 16.4,
      minZ: -31.1,
      maxZ: -27.799999999999997,
    });
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

  it('keeps declared debug IDs mapped to existing safety collider names', () => {
    const names = new Set(
      collectSafetyColliders().map((collider) => collider.name)
    );

    [
      ['GroundStairEastBoundary', '4001'],
      ['GroundStairLowerCornerGuard', '4002'],
      ['UpperStairEastLowerVoidGuard', '4006'],
      ['UpperStairEastUpperVoidGuard', '4007'],
      ['UpperStairWestBannisterGuard', '4009'],
      ['UpperStairNorthBannisterGuard', '400A'],
    ].forEach(([name, id]) => {
      expect(names.has(name)).toBe(true);
      expect(
        getDeclaredColliderDebugId({ floor: 'upper', category: 'upper', name })
      ).toBe(id);
    });

    expect(
      getDeclaredColliderDebugId({
        floor: 'upper',
        category: 'upper',
        name: 'UpperStairTopGapBlockerWest',
      })
    ).toBe('4003');
    expect(
      getDeclaredColliderDebugId({
        floor: 'upper',
        category: 'upper',
        name: 'UpperStairTopGapBlockerEast',
      })
    ).toBe('4004');
    expect(
      getDeclaredColliderDebugId({
        floor: 'upper',
        category: 'upper',
        name: 'UpperStairHiddenRunVoidGuard',
      })
    ).toBeUndefined();
  });

  it('does not generate the removed hidden-run guard collider', () => {
    expect(
      collectSafetyColliders().some(
        (collider) => collider.name === 'UpperStairHiddenRunVoidGuard'
      )
    ).toBe(false);
  });

  it('keeps safety collider source IDs free of tombstone wording', () => {
    collectSafetyColliders().forEach((collider) => {
      expect(String(collider.sourceId)).not.toMatch(
        /\.(former|removed|debugonlyremoval)\./i
      );
    });
  });
});
