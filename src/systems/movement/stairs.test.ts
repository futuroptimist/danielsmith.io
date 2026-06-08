import { describe, expect, it } from 'vitest';

import { collidesWithColliders } from '../collision';

import {
  createGroundStairBoundaryColliders,
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from './stairs';

const PLAYER_RADIUS = 0.75;
const EPSILON = 0.1;
const CONTAINING_ROOM_MAX_X = 32;

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
    containingRoomMaxX: CONTAINING_ROOM_MAX_X,
  }
);
const boundaryBounds = boundaryColliders.map((collider) => collider.bounds);

const stairEastX = geometry.centerX + geometry.halfWidth;
const rampMinZ = Math.min(geometry.bottomZ, geometry.topZ);
const rampMaxZ = Math.max(geometry.bottomZ, geometry.topZ);
const lowerApproachZ =
  geometry.bottomZ - geometry.direction * behavior.transitionMargin;
const lowerApproachMaxZ = Math.max(geometry.bottomZ, lowerApproachZ);
const roomLaneX = stairEastX + (CONTAINING_ROOM_MAX_X - stairEastX) / 2;

describe('createGroundStairBoundaryColliders', () => {
  it('names the ground stair blockers for debug visualization', () => {
    const names = boundaryColliders.map((collider) => collider.name);

    expect(names).toEqual([
      'GroundStairEastBoundary',
      'GroundStairLowerCornerGuard',
      'GroundStairEastRunSeal',
    ]);
  });

  it('seals the east-side stair-run band to the containing room edge', () => {
    const stairRunZSamples = [
      rampMinZ + EPSILON,
      (rampMinZ + rampMaxZ) / 2,
      rampMaxZ - EPSILON,
    ];
    const eastBandXSamples = [
      stairEastX + EPSILON,
      stairEastX + (CONTAINING_ROOM_MAX_X - stairEastX) * 0.25,
      stairEastX + (CONTAINING_ROOM_MAX_X - stairEastX) * 0.5,
      CONTAINING_ROOM_MAX_X - EPSILON,
    ];

    stairRunZSamples.forEach((z) => {
      eastBandXSamples.forEach((x) => {
        expect(collidesWithColliders(x, z, PLAYER_RADIUS, boundaryBounds)).toBe(
          true
        );
      });
    });
  });

  it('blocks representative east-side squeeze and route-around samples', () => {
    const blockedSamples = [
      { x: 17.38, z: -8.84 },
      { x: 21.35, z: -14.66 },
      { x: 22.1, z: -14.66 },
      { x: 24, z: -18 },
    ];

    blockedSamples.forEach((sample) => {
      expect(
        collidesWithColliders(sample.x, sample.z, PLAYER_RADIUS, boundaryBounds)
      ).toBe(true);
    });
  });

  it('keeps living-room lanes outside the east-side seal band clear', () => {
    const clearSamples = [
      {
        x: roomLaneX,
        z: lowerApproachMaxZ + PLAYER_RADIUS + EPSILON,
      },
      {
        x: roomLaneX,
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
