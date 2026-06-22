import { describe, expect, it } from 'vitest';

import {
  areRectanglesAdjacent,
  containsRectangle,
  estimateUnionCoverage,
  rectangleArea,
  rectangleIntersection,
  rectangleSeparationDistance,
  rectanglesEqual,
} from '../rectangleGeometry';

describe('rectangle geometry helpers', () => {
  it('detects exact duplicate rectangles with tolerance', () => {
    expect(
      rectanglesEqual(
        { minX: 0, maxX: 2, minZ: 0, maxZ: 2 },
        { minX: 0, maxX: 2, minZ: 0, maxZ: 2 }
      )
    ).toBe(true);
    expect(
      rectanglesEqual(
        { minX: 0, maxX: 2, minZ: 0, maxZ: 2 },
        { minX: 0.01, maxX: 2, minZ: 0, maxZ: 2 },
        0.02
      )
    ).toBe(true);
  });

  it('computes area, intersection, and containment', () => {
    const outer = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };
    const inner = { minX: 1, maxX: 3, minZ: 1, maxZ: 3 };
    expect(rectangleArea(outer)).toBe(16);
    expect(rectangleIntersection(outer, inner)).toEqual({ ...inner, area: 4 });
    expect(containsRectangle(outer, inner)).toBe(true);
    expect(containsRectangle(inner, outer)).toBe(false);
  });

  it('distinguishes partial overlap from disjoint rectangles', () => {
    const left = { minX: 0, maxX: 2, minZ: 0, maxZ: 2 };
    expect(
      rectangleIntersection(left, { minX: 1, maxX: 3, minZ: 1, maxZ: 3 })?.area
    ).toBe(1);
    expect(
      rectangleIntersection(left, { minX: 3, maxX: 4, minZ: 3, maxZ: 4 })
    ).toBeUndefined();
  });

  it('reports edge adjacency within tolerance', () => {
    const left = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
    const right = { minX: 1.03, maxX: 2, minZ: 0, maxZ: 1 };
    expect(rectangleSeparationDistance(left, right)).toBeCloseTo(0.03);
    expect(areRectanglesAdjacent(left, right, 0.05)).toBe(true);
    expect(areRectanglesAdjacent(left, right, 0.01)).toBe(false);
  });

  it('estimates multi-collider union coverage deterministically', () => {
    const candidate = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };
    const coverage = estimateUnionCoverage(
      candidate,
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
      { x: 2.5, z: 2.5, covered: false },
      { x: 3.5, z: 2.5, covered: false },
      { x: 2.5, z: 3.5, covered: false },
      { x: 3.5, z: 3.5, covered: false },
    ]);
  });
});
