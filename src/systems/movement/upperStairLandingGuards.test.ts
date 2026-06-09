import { describe, expect, it } from 'vitest';

import { collidesWithColliders } from '../collision';

import { splitColliderAroundCorridor } from './upperStairLandingGuards';

const PLAYER_RADIUS = 0.75;

describe('splitColliderAroundCorridor', () => {
  it('leaves the deliberate stair-to-landing mouth open', () => {
    const blockers = splitColliderAroundCorridor({
      name: 'UpperStairTopGapBlocker',
      bounds: { minX: 11.65, maxX: 14.75, minZ: -27.05, maxZ: -26.65 },
      corridor: { minX: 11.275, maxX: 13.525 },
    });

    expect(blockers).toEqual([
      {
        name: 'UpperStairTopGapBlockerEast',
        bounds: { minX: 13.525, maxX: 14.75, minZ: -27.05, maxZ: -26.65 },
      },
    ]);
    expect(
      collidesWithColliders(
        12.4,
        -26.3,
        PLAYER_RADIUS,
        blockers.map((blocker) => blocker.bounds)
      )
    ).toBe(false);
  });

  it('preserves side blockers outside the landing entry corridor', () => {
    const blockers = splitColliderAroundCorridor({
      name: 'UpperStairTopGapBlocker',
      bounds: { minX: 11.65, maxX: 14.75, minZ: -27.05, maxZ: -26.65 },
      corridor: { minX: 11.275, maxX: 13.525 },
    });

    expect(
      collidesWithColliders(
        14.4,
        -26.85,
        PLAYER_RADIUS,
        blockers.map((blocker) => blocker.bounds)
      )
    ).toBe(true);
  });
});
