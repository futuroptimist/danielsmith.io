import { describe, expect, it } from 'vitest';

import {
  rectArea,
  rectContains,
  rectDistance,
  rectIntersection,
  rectsAdjacentWithin,
  rectsEqual,
  sampleGridUnionCoverage,
} from '../rectGeometry';

describe('rectGeometry', () => {
  it('detects duplicate rectangles with tolerance', () => {
    expect(
      rectsEqual(
        { minX: 0, maxX: 2, minZ: 0, maxZ: 2 },
        { minX: 0.01, maxX: 2.01, minZ: -0.01, maxZ: 1.99 },
        0.02
      )
    ).toBe(true);
  });

  it('calculates containment and area', () => {
    const outer = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };
    const inner = { minX: 1, maxX: 3, minZ: 1, maxZ: 3 };
    expect(rectContains(outer, inner)).toBe(true);
    expect(rectContains(inner, outer)).toBe(false);
    expect(rectArea(inner)).toBe(4);
  });

  it('returns partial intersections', () => {
    expect(
      rectIntersection(
        { minX: 0, maxX: 3, minZ: 0, maxZ: 3 },
        { minX: 2, maxX: 4, minZ: 1, maxZ: 4 }
      )
    ).toEqual({ minX: 2, maxX: 3, minZ: 1, maxZ: 3 });
  });

  it('measures disjoint distance and adjacency tolerance', () => {
    const left = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
    const right = { minX: 1.04, maxX: 2, minZ: 0, maxZ: 1 };
    expect(rectIntersection(left, right)).toBeUndefined();
    expect(rectDistance(left, right)).toBeCloseTo(0.04);
    expect(rectsAdjacentWithin(left, right, 0.05)).toBe(true);
    expect(rectsAdjacentWithin(left, right, 0.01)).toBe(false);
  });

  it('estimates multi-collider union coverage deterministically', () => {
    const coverage = sampleGridUnionCoverage(
      { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
      [
        { minX: 0, maxX: 2, minZ: 0, maxZ: 4 },
        { minX: 2, maxX: 4, minZ: 0, maxZ: 2 },
      ],
      4
    );

    expect(coverage.totalSamples).toBe(16);
    expect(coverage.coveredSamples).toBe(12);
    expect(coverage.coverageRatio).toBe(0.75);
    expect(coverage.uncoveredSamples).toEqual([
      { x: 2.5, z: 2.5 },
      { x: 3.5, z: 2.5 },
      { x: 2.5, z: 3.5 },
      { x: 3.5, z: 3.5 },
    ]);
  });
});
