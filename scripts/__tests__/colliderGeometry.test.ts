import { describe, expect, it } from 'vitest';

import {
  estimateUnionCoverage,
  rectangleArea,
  rectangleContains,
  rectangleDistance,
  rectangleIntersection,
  rectanglesAreAdjacent,
  type Rectangle,
} from '../colliderGeometry';

const rect = (
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number
): Rectangle => ({
  minX,
  maxX,
  minZ,
  maxZ,
});

describe('collider geometry helpers', () => {
  it('detects duplicate rectangles through equal intersection area and containment', () => {
    const left = rect(0, 2, 0, 3);
    const right = rect(0, 2, 0, 3);

    expect(rectangleIntersection(left, right)).toEqual(left);
    expect(rectangleArea(left)).toBe(6);
    expect(rectangleContains(left, right)).toBe(true);
    expect(rectangleContains(right, left)).toBe(true);
  });

  it('detects full containment without requiring equal bounds', () => {
    const outer = rect(-1, 3, -1, 3);
    const inner = rect(0, 1, 0, 1);

    expect(rectangleContains(outer, inner)).toBe(true);
    expect(rectangleContains(inner, outer)).toBe(false);
    expect(rectangleArea(rectangleIntersection(outer, inner)!)).toBe(1);
  });

  it('measures partial overlap area', () => {
    const left = rect(0, 2, 0, 2);
    const right = rect(1, 3, 0.5, 1.5);

    expect(rectangleIntersection(left, right)).toEqual(rect(1, 2, 0.5, 1.5));
    expect(rectangleArea(rectangleIntersection(left, right)!)).toBe(1);
  });

  it('distinguishes disjoint rectangles from adjacent rectangles within tolerance', () => {
    const left = rect(0, 1, 0, 1);
    const near = rect(1.04, 2, 0, 1);
    const far = rect(3, 4, 0, 1);

    expect(rectangleIntersection(left, near)).toBeUndefined();
    expect(rectangleDistance(left, near)).toBe(0.04);
    expect(rectanglesAreAdjacent(left, near, 0.05)).toBe(true);
    expect(rectanglesAreAdjacent(left, far, 0.05)).toBe(false);
  });

  it('estimates multi-collider union coverage on a deterministic sample grid', () => {
    const candidate = rect(0, 2, 0, 2);
    const coverage = estimateUnionCoverage(
      candidate,
      [rect(0, 1, 0, 2), rect(1, 2, 0, 1)],
      2
    );

    expect(coverage.totalSamples).toBe(4);
    expect(coverage.coveredSamples).toBe(3);
    expect(coverage.coverageRatio).toBe(0.75);
    expect(coverage.uncoveredSamples).toEqual([{ x: 1.5, z: 1.5 }]);
  });
});
