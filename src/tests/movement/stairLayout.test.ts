import { describe, expect, it } from 'vitest';

import { computeStairLayout } from '../../systems/movement/stairLayout';

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
});
