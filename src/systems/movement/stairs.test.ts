import { describe, expect, it } from 'vitest';

import { createGroundStairSafetyColliders } from '../../scene/level/stairSafetyColliders';
import { collidesWithColliders } from '../collision';

import {
  createStairNavigationZones,
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

const boundaryColliders = createGroundStairSafetyColliders(geometry, behavior, {
  playerRadius: PLAYER_RADIUS,
  guardThickness: 0.44,
});
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

describe('createGroundStairSafetyColliders', () => {
  it('names the local ground stair blockers for debug visualization', () => {
    const names = boundaryColliders.map((collider) => collider.name);

    expect(names).toEqual(['GroundStairLowerCornerGuard']);
    expect(names).not.toContain('GroundStairEastRunSeal');
  });

  it('adds source metadata to raw blockers for reported stair-side squeeze samples', () => {
    expect(boundaryColliders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'GroundStairLowerCornerGuard',
          sourceId: 'ground.stairwell.lowerCorner.safetyCollider',
          purpose: 'block raw lower-step occupancy',
        }),
      ])
    );
  });

  it('blocks the lower stair-side squeeze samples', () => {
    const blockedSamples = [
      { x: 17.38, z: -8.84 },
      { x: 21.35, z: -9.5 },
      { x: 22.1, z: -9.5 },
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
