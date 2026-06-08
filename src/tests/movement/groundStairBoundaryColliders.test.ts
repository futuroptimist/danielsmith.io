import { describe, expect, it } from 'vitest';

import { collidesWithColliders } from '../../systems/collision';
import {
  createGroundStairBoundaryColliders,
  type StairBehavior,
  type StairGeometry,
} from '../../systems/movement/stairs';

const playerRadius = 0.75;
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
  descentCorridorInset: playerRadius,
};

const createColliders = () =>
  createGroundStairBoundaryColliders(geometry, behavior, {
    playerRadius,
    eastSideClearance:
      geometry.halfWidth + behavior.transitionMargin + playerRadius + 0.4,
  });

describe('createGroundStairBoundaryColliders', () => {
  it('names precise east-side blockers for debug visualization', () => {
    expect(createColliders().map((collider) => collider.name)).toEqual([
      'GroundStairEastBoundary',
      'GroundStairLowerCornerGuard',
    ]);
  });

  it('blocks the reported ground-floor east stair squeeze samples', () => {
    const colliders = createColliders().map(({ bounds }) => bounds);

    expect(collidesWithColliders(17.38, -8.84, playerRadius, colliders)).toBe(
      true
    );
    expect(collidesWithColliders(21.35, -14.66, playerRadius, colliders)).toBe(
      true
    );
  });

  it('leaves the intended stair centerline and lower entrance clear', () => {
    const colliders = createColliders().map(({ bounds }) => bounds);

    expect(
      collidesWithColliders(
        geometry.centerX,
        geometry.bottomZ + 0.3,
        playerRadius,
        colliders
      )
    ).toBe(false);
    expect(
      collidesWithColliders(
        geometry.centerX,
        (geometry.bottomZ + geometry.topZ) / 2,
        playerRadius,
        colliders
      )
    ).toBe(false);
  });
});
