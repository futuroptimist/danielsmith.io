import { describe, expect, it } from 'vitest';

import { collidesWithColliders } from '../collision';

import {
  createGroundStairBoundaryColliders,
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from './stairs';

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

const boundaryColliders = createGroundStairBoundaryColliders(
  geometry,
  behavior,
  {
    playerRadius: PLAYER_RADIUS,
    guardThickness: 0.44,
    eastApproachSealMaxX: 32,
  }
);
const boundaryBounds = boundaryColliders.map((collider) => collider.bounds);

describe('createGroundStairBoundaryColliders', () => {
  it('names the ground stair blockers for debug visualization', () => {
    expect(boundaryColliders.map((collider) => collider.name)).toEqual([
      'GroundStairEastBoundary',
      'GroundStairLowerCornerGuard',
      'GroundStairEastApproachSeal',
    ]);
  });

  it('blocks the east-side squeeze route without sealing the whole room', () => {
    expect(
      collidesWithColliders(17.38, -8.84, PLAYER_RADIUS, boundaryBounds)
    ).toBe(true);
    expect(
      collidesWithColliders(21.35, -14.66, PLAYER_RADIUS, boundaryBounds)
    ).toBe(true);
    expect(
      collidesWithColliders(22.1, -14.66, PLAYER_RADIUS, boundaryBounds)
    ).toBe(true);
    expect(
      collidesWithColliders(23, -14.66, PLAYER_RADIUS, boundaryBounds)
    ).toBe(true);
  });

  it('keeps regular living-room positions east of the stairs clear', () => {
    expect(collidesWithColliders(24, -18, PLAYER_RADIUS, boundaryBounds)).toBe(
      false
    );
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
