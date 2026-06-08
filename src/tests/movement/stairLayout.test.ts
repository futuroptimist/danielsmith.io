import { describe, expect, it } from 'vitest';

import {
  computeStairLayout,
  computeStairwellOpeningBounds,
} from '../../systems/movement/stairLayout';

describe('computeStairLayout', () => {
  it('derives layout metrics for negative Z staircases', () => {
    const layout = computeStairLayout({
      baseZ: 0,
      stepRun: 1,
      stepCount: 3,
      landingDepth: 2,
      direction: 'negativeZ',
      guardMargin: 0.5,
      stairwellMargin: 0.25,
    });

    expect(layout).toEqual({
      topZ: -3,
      landingMinZ: -5,
      landingMaxZ: -3,
      directionMultiplier: -1,
      guardRange: { minZ: -5, maxZ: 0.5 },
      stairHoleRange: { minZ: -5.25, maxZ: 0.25 },
    });
  });

  it('derives layout metrics for positive Z staircases', () => {
    const layout = computeStairLayout({
      baseZ: 0,
      stepRun: 1,
      stepCount: 3,
      landingDepth: 2,
      direction: 'positiveZ',
      guardMargin: 0.5,
      stairwellMargin: 0.25,
    });

    expect(layout).toEqual({
      topZ: 3,
      landingMinZ: 3,
      landingMaxZ: 5,
      directionMultiplier: 1,
      guardRange: { minZ: -0.5, maxZ: 5 },
      stairHoleRange: { minZ: -0.25, maxZ: 5.25 },
    });
  });

  it('clips upstairs stairwell hole bounds from the shared stair layout plus margin', () => {
    const layout = computeStairLayout({
      baseZ: -10.6,
      stepRun: 1.7,
      stepCount: 9,
      landingDepth: 5.2,
      direction: 'negativeZ',
      guardMargin: 1.2,
      stairwellMargin: 0.8,
    });

    const opening = computeStairwellOpeningBounds({
      centerX: 9.92,
      halfWidth: 2.48,
      marginX: 0.4,
      roomBounds: { minX: 4, maxX: 20.8, minZ: -32, maxZ: -16 },
      layout,
    });

    expect(opening.minX).toBeCloseTo(7.04);
    expect(opening.maxX).toBeCloseTo(12.8);
    expect(opening.minZ).toBeCloseTo(-31.9);
    expect(opening.maxZ).toBeCloseTo(-16);
  });

  it('extends negative Z cutouts over the hidden stair run, not just the landing lip', () => {
    const layout = computeStairLayout({
      baseZ: 0,
      stepRun: 1,
      stepCount: 4,
      landingDepth: 2,
      direction: 'negativeZ',
      guardMargin: 0.5,
      stairwellMargin: 0.25,
    });

    const opening = computeStairwellOpeningBounds({
      centerX: 0,
      halfWidth: 1,
      marginX: 0.25,
      roomBounds: { minX: -5, maxX: 5, minZ: -7, maxZ: 1 },
      layout,
    });

    expect(opening.minZ).toBeCloseTo(-6.25);
    expect(opening.maxZ).toBeCloseTo(0.25);
  });
});
