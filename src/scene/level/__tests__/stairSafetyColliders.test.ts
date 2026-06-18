import { describe, expect, it } from 'vitest';

import {
  createGroundStairSafetyColliders,
  createUpperStairSafetyColliders,
} from '../stairSafetyColliders';

const sourceIdTombstonePattern =
  /(^|\.)(former|removed|debugonlyremoval)(\.|$)/;

describe('stair safety collider source metadata', () => {
  it('adds source IDs and purposes to ground stair safety colliders', () => {
    const colliders = createGroundStairSafetyColliders(
      {
        centerX: 12.4,
        halfWidth: 3.1,
        bottomZ: -10.6,
        topZ: -25.9,
        landingMinZ: -31.1,
        landingMaxZ: -25.9,
        totalRise: 3.78,
        direction: -1,
      },
      {
        transitionMargin: 1.2,
        landingTriggerMargin: 0.4,
        stepRise: 0.42,
        descentCorridorInset: 0.75,
      },
      {
        playerRadius: 0.75,
        guardThickness: 0.44,
      }
    );

    expect(colliders).toMatchObject([
      {
        name: 'GroundStairEastBoundary',
        sourceId: 'ground.stairwell.eastBoundary.safetyCollider',
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
        sourceId: 'ground.stairwell.lowerCorner.safetyCollider',
        purpose: 'block raw lower-step occupancy',
        bounds: {
          minX: 15.5,
          maxX: 22.18,
          minZ: -10.6,
          maxZ: -9.4,
        },
      },
    ]);
  });

  it('keeps upper stair guard names and source-backed purposes stable', () => {
    const colliders = createUpperStairSafetyColliders({
      stairCenterX: 12.4,
      stairHalfWidth: 3.1,
      stairTopZ: -25.9,
      stairTransitionMargin: 1.2,
      stairLandingTriggerMargin: 0.4,
      stairwellMarginX: 1.25,
      playerRadius: 0.75,
      wallThickness: 0.36,
      upperLandingRoomBounds: {
        minX: 4,
        maxX: 20,
        minZ: -34,
        maxZ: -20,
      },
      upperStairwellOpening: {
        minX: 8.05,
        maxX: 16.75,
        minZ: -32.1,
        maxZ: -24.65,
      },
      stairNavigationZones: {
        lowerStairEntrance: { minX: 8.1, maxX: 16.7, minZ: -10.6, maxZ: -9.4 },
        stairRampBody: { minX: 9.3, maxX: 15.5, minZ: -25.9, maxZ: -10.6 },
        upperLanding: { minX: 9.3, maxX: 15.5, minZ: -31.1, maxZ: -25.9 },
        explicitDescentCorridor: {
          minX: 10.05,
          maxX: 14.75,
          minZ: -25.9,
          maxZ: -10.6,
        },
      },
      stairLayoutDirectionMultiplier: -1,
      upperStairBannisterThickness: 0.32,
    });

    expect(colliders.map((collider) => collider.name)).toEqual([
      'UpperStairEastLowerVoidGuard',
      'UpperStairEastUpperVoidGuard',
      'UpperStairHiddenRunVoidGuard',
      'UpperStairWestBannisterGuard',
      'UpperStairNorthBannisterGuard',
    ]);
    expect(colliders).toContainEqual(
      expect.objectContaining({
        name: 'UpperStairEastLowerVoidGuard',
        sourceId: 'upper.stairwell.eastLowerVoid.safetyCollider',
        purpose: 'guard upper stairwell void edge',
        bounds: expect.objectContaining({
          minX: 14.75,
          maxX: 16.75,
          minZ: -32.1,
          maxZ: -27.799999999999997,
        }),
      })
    );
  });

  it('requires unique current-state source IDs and non-empty purposes', () => {
    const allColliders = [
      ...createGroundStairSafetyColliders(
        {
          centerX: 12.4,
          halfWidth: 3.1,
          bottomZ: -10.6,
          topZ: -25.9,
          landingMinZ: -31.1,
          landingMaxZ: -25.9,
          totalRise: 3.78,
          direction: -1,
        },
        {
          transitionMargin: 1.2,
          landingTriggerMargin: 0.4,
          stepRise: 0.42,
          descentCorridorInset: 0.75,
        },
        { playerRadius: 0.75, guardThickness: 0.44 }
      ),
    ];
    const sourceIds = allColliders.map((collider) => collider.sourceId);

    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(
      allColliders.every((collider) => collider.purpose.trim().length > 0)
    ).toBe(true);
    expect(sourceIds).not.toEqual(
      expect.arrayContaining([expect.stringMatching(sourceIdTombstonePattern)])
    );
  });
});
