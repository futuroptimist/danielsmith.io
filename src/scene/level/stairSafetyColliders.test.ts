import { describe, expect, it } from 'vitest';

import {
  computeStairLayout,
  computeStairwellOpeningBounds,
} from '../../systems/movement/stairLayout';
import {
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from '../../systems/movement/stairs';

import {
  createGroundStairSafetyColliders,
  createUpperStairSafetyColliders,
  type LevelSafetyCollider,
} from './stairSafetyColliders';

const PLAYER_RADIUS = 0.75;
const stairGeometry: StairGeometry = {
  centerX: 12.4,
  halfWidth: 3.1,
  bottomZ: -10.6,
  topZ: -25.9,
  landingMinZ: -31.1,
  landingMaxZ: -25.9,
  totalRise: 3.78,
  direction: -1,
};
const stairBehavior: StairBehavior = {
  transitionMargin: 1.2,
  landingTriggerMargin: 0.4,
  stepRise: 0.42,
  descentCorridorInset: PLAYER_RADIUS,
};
const stairLayout = computeStairLayout({
  baseZ: stairGeometry.bottomZ,
  stepRun: 1.275,
  stepCount: 12,
  landingDepth: 5.2,
  direction: 'negativeZ',
  guardMargin: stairBehavior.transitionMargin,
  stairwellMargin: 0.8,
});
const upperLandingRoomBounds = {
  minX: 7,
  maxX: 20,
  minZ: -34,
  maxZ: -18,
};
const upperStairwellOpening = computeStairwellOpeningBounds({
  centerX: stairGeometry.centerX,
  halfWidth: stairGeometry.halfWidth,
  marginX: 0.4,
  roomBounds: upperLandingRoomBounds,
  layout: stairLayout,
});

const upperSafetyColliders = createUpperStairSafetyColliders({
  stairGeometry,
  stairBehavior,
  stairLayout,
  upperLandingRoomBounds,
  upperStairwellOpening,
  playerRadius: PLAYER_RADIUS,
  doorwayDepth: 2.4,
  wallThickness: 0.4,
  stairwellMarginX: 0.4,
  bannisterThickness: 0.24,
});
const groundSafetyColliders = createGroundStairSafetyColliders({
  geometry: stairGeometry,
  behavior: stairBehavior,
  playerRadius: PLAYER_RADIUS,
  guardThickness: 0.44,
});
const allSafetyColliders = [...groundSafetyColliders, ...upperSafetyColliders];

const byName = (name: string): LevelSafetyCollider => {
  const collider = allSafetyColliders.find(
    (candidate) => candidate.name === name
  );
  if (!collider) {
    throw new Error(`Missing safety collider ${name}`);
  }

  return collider;
};

describe('stair safety collider source generation', () => {
  it('preserves declared stair safety collider names', () => {
    expect(allSafetyColliders.map((collider) => collider.name)).toEqual([
      'GroundStairEastBoundary',
      'GroundStairLowerCornerGuard',
      'UpperStairEastLowerVoidGuard',
      'UpperStairEastUpperVoidGuard',
      'UpperStairHiddenRunVoidGuard',
      'UpperStairWestBannisterGuard',
      'UpperStairNorthBannisterGuard',
    ]);
  });

  it('generates bounds matching the pre-extraction stair guard math', () => {
    expect(byName('GroundStairEastBoundary').bounds).toEqual({
      minX: 15.94,
      maxX: 22.18,
      minZ: -25.9,
      maxZ: -10.6,
    });
    expect(byName('GroundStairLowerCornerGuard').bounds).toEqual({
      minX: 15.5,
      maxX: 22.18,
      minZ: -10.6,
      maxZ: -9.4,
    });
    expect(byName('UpperStairEastLowerVoidGuard').bounds).toEqual({
      minX: 14.75,
      maxX: 15.9,
      minZ: -31.9,
      maxZ: -27.799999999999997,
    });
    expect(byName('UpperStairHiddenRunVoidGuard').bounds).toEqual({
      minX: 8.9,
      maxX: 15.9,
      minZ: -23.549999999999997,
      maxZ: -21.23,
    });
    expect(byName('UpperStairWestBannisterGuard').bounds).toEqual({
      minX: 9.9,
      maxX: 10.290000000000001,
      minZ: -24.71,
      maxZ: -18.349999999999998,
    });
    expect(byName('UpperStairNorthBannisterGuard').bounds).toEqual({
      minX: 10.41,
      maxX: 15.66,
      minZ: -18.47,
      maxZ: -18.229999999999997,
    });
  });

  it('adds source IDs and concise purposes without duplicate or tombstoned IDs', () => {
    const sourceIds = allSafetyColliders.map((collider) => collider.sourceId);

    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    allSafetyColliders.forEach((collider) => {
      expect(collider.sourceId).toMatch(/\.safetyCollider$/);
      expect(collider.purpose.length).toBeGreaterThan(0);
      expect(collider.sourceId).not.toMatch(
        /\.former\.|\.removed\.|debug.*remov/i
      );
    });
  });

  it('keeps upper safety colliders clear of the explicit descent corridor', () => {
    const navigationZones = createStairNavigationZones(
      stairGeometry,
      stairBehavior
    );
    const westBannister = byName('UpperStairWestBannisterGuard').bounds;
    const eastVoidGuard = byName('UpperStairEastLowerVoidGuard').bounds;

    expect(westBannister.maxX - 1).toBeLessThan(
      navigationZones.explicitDescentCorridor.minX
    );
    expect(eastVoidGuard.minX).toBe(
      navigationZones.explicitDescentCorridor.maxX
    );
  });
});
