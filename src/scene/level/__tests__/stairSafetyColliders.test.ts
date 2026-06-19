import { describe, expect, it } from 'vitest';

import {
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from '../../../systems/movement/stairs';
import {
  DEBUG_COLLIDER_ID_PATTERN,
  getGeneratedColliderId,
} from '../../debug/colliderDebugIds';
import { createColliderVisualizer } from '../../debug/colliderVisualizer';
import {
  createGroundStairSafetyColliders,
  createUpperStairSafetyColliders,
  type LevelSafetyCollider,
} from '../stairSafetyColliders';
import { UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES } from '../upperStairwellLandingSegments';

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

  it('keeps active source-backed debug IDs valid, unique, and non-generated', () => {
    const debugIds = collectSafetyColliders().flatMap((collider) =>
      collider.debugId ? [collider.debugId] : []
    );
    const landingDebugIds = UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES.flatMap(
      (policy) => (policy.collision && policy.debugId ? [policy.debugId] : [])
    );
    const activeDebugIds = [...debugIds, ...landingDebugIds];

    expect([...activeDebugIds].sort()).toEqual([
      '4001',
      '4002',
      '4007',
      '4009',
      '400A',
      '400D',
    ]);
    expect(new Set(activeDebugIds).size).toBe(activeDebugIds.length);

    activeDebugIds.forEach((debugId) => {
      expect(DEBUG_COLLIDER_ID_PATTERN.test(debugId)).toBe(true);
      expect(
        getGeneratedColliderId({
          floor: 'upper',
          category: debugId.startsWith('1') ? 'ground' : 'upper',
          name: `${debugId.startsWith('1') ? 'ground' : 'upper'}-collider-${Number.parseInt(debugId.slice(1), 16)}`,
        })
      ).not.toBe(debugId);
    });
  });

  it('exposes source-backed debug IDs unchanged at runtime registration', () => {
    const colliders = collectSafetyColliders();
    const visualizer = createColliderVisualizer({ activeFloorId: 'upper' });

    visualizer.register(
      colliders.map((collider) => ({
        floor: collider.floor,
        category: collider.floor,
        name: collider.name,
        bounds: collider.bounds,
        sourceId: collider.sourceId,
        sourceType: 'safetyCollider',
        purpose: collider.purpose,
        debugId: collider.debugId,
      }))
    );

    colliders.forEach((collider) => {
      if (!collider.debugId) return;

      expect(visualizer.getColliderBySourceId(collider.sourceId)?.id).toBe(
        collider.debugId
      );
    });

    visualizer.dispose();
  });

  it('keeps safety collider source IDs free of tombstone wording', () => {
    collectSafetyColliders().forEach((collider) => {
      expect(String(collider.sourceId)).not.toMatch(
        /\.(former|removed|debugonlyremoval)\./i
      );
    });
  });
});
