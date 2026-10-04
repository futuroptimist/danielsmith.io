import { describe, expect, it } from 'vitest';

import { collidesWithColliders } from '../../../systems/collision';
import {
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from '../../../systems/movement/stairs';
import { assertDebugColliderIdsDoNotCollide } from '../../debug/colliderDebugIds';
import { createColliderDebugId } from '../../debug/colliderVisualizer';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../../level/floorElevations';
import { validateSourceCollisionRecords } from '../sourceCollisionValidation';
import {
  createGroundStairSafetyColliders,
  createUpperStairSafetyColliders,
  type LevelSafetyCollider,
} from '../stairSafetyColliders';

const PLAYER_RADIUS = 0.75;
const LANDING_THICKNESS = 0.38;
const STAIR_STEP_COUNT = 9;
const STAIR_STEP_RISE =
  (UPPER_FLOOR_TOP_ELEVATION - GROUND_FLOOR_TOP_ELEVATION - LANDING_THICKNESS) /
  STAIR_STEP_COUNT;

const geometry: StairGeometry = {
  centerX: 12.4,
  halfWidth: 3.1,
  bottomZ: -10.6,
  topZ: -25.9,
  landingMinZ: -31.1,
  landingMaxZ: -25.9,
  totalRise:
    UPPER_FLOOR_TOP_ELEVATION - GROUND_FLOOR_TOP_ELEVATION - LANDING_THICKNESS,
  direction: -1,
};

const behavior: StairBehavior = {
  transitionMargin: 1.2,
  landingTriggerMargin: 0.4,
  stepRise: STAIR_STEP_RISE,
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

  it('satisfies the source-backed active collider contract', () => {
    expect(validateSourceCollisionRecords(collectSafetyColliders())).toEqual(
      []
    );
  });

  it('keeps active safety collider debug IDs collision-free against generated IDs', () => {
    const colliders = collectSafetyColliders();
    const declaredIds = colliders.map(
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

describe('mirrored stair safety on both local floor roles', () => {
  const reflect = (bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }) => ({
    ...bounds,
    minZ: -bounds.maxZ,
    maxZ: -bounds.minZ,
  });
  const positiveGeometry = {
    ...geometry,
    bottomZ: -geometry.bottomZ,
    topZ: -geometry.topZ,
    landingMinZ: -geometry.landingMaxZ,
    landingMaxZ: -geometry.landingMinZ,
    direction: 1 as const,
  };

  it('gives positive-Z lower-corner guards positive area and mirrored squeeze protection', () => {
    const negative = createGroundStairSafetyColliders(geometry, behavior, {
      playerRadius: PLAYER_RADIUS,
      guardThickness: 0.44,
    });
    const positive = createGroundStairSafetyColliders(
      positiveGeometry,
      behavior,
      {
        playerRadius: PLAYER_RADIUS,
        guardThickness: 0.44,
        floorId: 'basement',
        sourceIdPrefix: 'basement.stairwell',
      }
    );
    expect(positive[0].bounds).toEqual(reflect(negative[0].bounds));
    expect(positive[0].bounds.maxZ).toBeGreaterThan(positive[0].bounds.minZ);
    expect(positive[0].floor).toBe('basement');
    expect(positive[0].sourceId).toBe(
      'basement.stairwell.lowerCorner.safetyCollider'
    );
    for (const point of [
      { x: 17.38, z: -8.84 },
      { x: 21.35, z: -14.66 },
      { x: 22.1, z: -14.66 },
    ]) {
      expect(
        collidesWithColliders(
          point.x,
          -point.z,
          PLAYER_RADIUS,
          positive.map((entry) => entry.bounds)
        )
      ).toBe(true);
    }
    expect(
      collidesWithColliders(
        geometry.centerX,
        -geometry.bottomZ - 0.3,
        PLAYER_RADIUS,
        positive.map((entry) => entry.bounds)
      )
    ).toBe(false);
  });

  it('mirrors upper side/back guards while preserving the entry corridor and unique sources', () => {
    const negative = createUpperStairSafetyColliders(upperArgs);
    const positive = createUpperStairSafetyColliders({
      ...upperArgs,
      floorId: 'ground',
      sourceIdPrefix: 'ground.basementStairwell',
      stairTopZ: -upperArgs.stairTopZ,
      stairLayoutDirectionMultiplier: 1,
      upperLandingRoomBounds: reflect(upperArgs.upperLandingRoomBounds),
      upperStairwellOpening: reflect(upperArgs.upperStairwellOpening),
      stairNavigationZones: createStairNavigationZones(
        positiveGeometry,
        behavior
      ),
    });
    expect(positive.map((entry) => entry.bounds)).toEqual(
      negative.map((entry) => reflect(entry.bounds))
    );
    positive.forEach((entry) => {
      expect(entry.floor).toBe('ground');
      expect(entry.bounds.maxX).toBeGreaterThan(entry.bounds.minX);
      expect(entry.bounds.maxZ).toBeGreaterThan(entry.bounds.minZ);
      const x = (entry.bounds.minX + entry.bounds.maxX) / 2;
      const z = (entry.bounds.minZ + entry.bounds.maxZ) / 2;
      expect(
        collidesWithColliders(
          x,
          z,
          PLAYER_RADIUS,
          positive.map((guard) => guard.bounds)
        )
      ).toBe(true);
    });
    expect(
      collidesWithColliders(
        geometry.centerX,
        -geometry.topZ - 0.7,
        PLAYER_RADIUS,
        positive.map((entry) => entry.bounds)
      )
    ).toBe(false);
    expect(validateSourceCollisionRecords([...negative, ...positive])).toEqual(
      []
    );
    expect(() =>
      assertDebugColliderIdsDoNotCollide(
        [...negative, ...positive].map(
          (entry) => [entry.sourceId, entry.debugId] as const
        )
      )
    ).not.toThrow();
  });
});
