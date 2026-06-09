import { describe, expect, it } from 'vitest';

import { collidesWithColliders } from '../collision';

import {
  createGroundStairBoundaryColliders,
  createStairNavigationZones,
  createUpperStairVoidBoundaryColliders,
  type StairBehavior,
  type StairGeometry,
} from './stairs';

const PLAYER_RADIUS = 0.75;
const EPSILON = 0.1;

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

const boundaryColliders = createGroundStairBoundaryColliders(
  geometry,
  behavior,
  {
    playerRadius: PLAYER_RADIUS,
    guardThickness: 0.44,
  }
);
const boundaryBounds = boundaryColliders.map((collider) => collider.bounds);

const stairEastX = geometry.centerX + geometry.halfWidth;
const rampMinZ = Math.min(geometry.bottomZ, geometry.topZ);
const rampMaxZ = Math.max(geometry.bottomZ, geometry.topZ);
const lowerApproachZ =
  geometry.bottomZ - geometry.direction * behavior.transitionMargin;
const lowerApproachMaxZ = Math.max(geometry.bottomZ, lowerApproachZ);
const eastBoundaryMaxX = Math.max(
  ...boundaryColliders.map((collider) => collider.bounds.maxX)
);

describe('createGroundStairBoundaryColliders', () => {
  it('names the local ground stair blockers for debug visualization', () => {
    const names = boundaryColliders.map((collider) => collider.name);

    expect(names).toEqual([
      'GroundStairEastBoundary',
      'GroundStairLowerCornerGuard',
    ]);
    expect(names).not.toContain('GroundStairEastRunSeal');
  });

  it('blocks the reported stair-side squeeze samples', () => {
    const blockedSamples = [
      { x: 17.38, z: -8.84 },
      { x: 21.35, z: -14.66 },
      { x: 22.1, z: -14.66 },
    ];

    blockedSamples.forEach((sample) => {
      expect(
        collidesWithColliders(sample.x, sample.z, PLAYER_RADIUS, boundaryBounds)
      ).toBe(true);
    });
  });

  it('keeps ordinary living-room space east of the local blocker clear', () => {
    const clearSamples = [
      { x: 23, z: -18 },
      { x: 24, z: -18 },
    ];

    clearSamples.forEach((sample) => {
      expect(
        collidesWithColliders(sample.x, sample.z, PLAYER_RADIUS, boundaryBounds)
      ).toBe(false);
    });
  });

  it('keeps living-room lanes outside the local stair-side blocker clear', () => {
    const clearSamples = [
      {
        x: eastBoundaryMaxX + PLAYER_RADIUS + EPSILON,
        z: (rampMinZ + rampMaxZ) / 2,
      },
      {
        x: stairEastX + PLAYER_RADIUS + EPSILON,
        z: lowerApproachMaxZ + PLAYER_RADIUS + EPSILON,
      },
      {
        x: stairEastX + PLAYER_RADIUS + EPSILON,
        z: rampMinZ - PLAYER_RADIUS - EPSILON,
      },
    ];

    clearSamples.forEach((sample) => {
      expect(
        collidesWithColliders(sample.x, sample.z, PLAYER_RADIUS, boundaryBounds)
      ).toBe(false);
    });
  });

  it('preserves the center lower entrance and ramp body', () => {
    const zones = createStairNavigationZones(geometry, behavior);
    const validSamples = [
      { x: geometry.centerX, z: geometry.bottomZ + 0.3 },
      {
        x: (zones.stairRampBody.minX + zones.stairRampBody.maxX) / 2,
        z: (geometry.bottomZ + geometry.topZ) / 2,
      },
    ];

    validSamples.forEach((sample) => {
      expect(
        collidesWithColliders(sample.x, sample.z, PLAYER_RADIUS, boundaryBounds)
      ).toBe(false);
    });
  });
});

describe('createUpperStairVoidBoundaryColliders', () => {
  const zones = createStairNavigationZones(geometry, behavior);
  const upperVoidColliders = createUpperStairVoidBoundaryColliders(geometry, {
    openingBounds: { minX: 8.9, maxX: 15.9, minZ: -31.9, maxZ: -16 },
    roomBounds: { minX: 4, maxX: 20.8, minZ: -32, maxZ: -16 },
    explicitDescentCorridor: zones.explicitDescentCorridor,
    playerRadius: PLAYER_RADIUS,
    stairwellMarginX: 0.4,
    westEgressMinZ: -30.3,
    westEgressMaxZ: -25.9,
    doorwayClearanceZ: -17.75,
  });
  const upperVoidBounds = upperVoidColliders.map((collider) => collider.bounds);

  it('names concise upper void guards for collider debug visualization', () => {
    expect(upperVoidColliders.map((collider) => collider.name)).toEqual([
      'UpperStairWestVoidGuard-LandingSide',
      'UpperStairWestVoidGuard-RoomSide',
      'UpperStairEastVoidGuard',
      'UpperStairWestVoidGapGuard',
      'UpperStairHiddenRampGuard',
    ]);
  });

  it('leaves the stair-top and landing centerline occupiable', () => {
    const clearSamples = [
      { x: geometry.centerX, z: geometry.topZ - geometry.direction * 0.1 },
      { x: geometry.centerX, z: geometry.topZ + geometry.direction * 0.1 },
      { x: geometry.centerX, z: geometry.landingMinZ + 0.6 },
    ];

    clearSamples.forEach((sample) => {
      expect(
        collidesWithColliders(
          sample.x,
          sample.z,
          PLAYER_RADIUS,
          upperVoidBounds
        )
      ).toBe(false);
    });
  });

  it('continues blocking the hidden ramp and west void gaps', () => {
    const blockedSamples = [
      { x: 12.7, z: -23.72 },
      {
        x: geometry.centerX - 1.9,
        z: geometry.topZ + geometry.direction * 0.95,
      },
      {
        x: geometry.centerX - 2.6,
        z: geometry.topZ + geometry.direction * 2.1,
      },
      { x: geometry.centerX + geometry.halfWidth + 0.15, z: geometry.topZ - 1 },
    ];

    blockedSamples.forEach((sample) => {
      expect(
        collidesWithColliders(
          sample.x,
          sample.z,
          PLAYER_RADIUS,
          upperVoidBounds
        )
      ).toBe(true);
    });
  });
});
