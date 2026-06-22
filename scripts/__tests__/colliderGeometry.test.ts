import { describe, expect, it } from 'vitest';

import {
  areRectanglesAdjacent,
  containsRectangle,
  estimateUnionCoverage,
  getIntersection,
  getRectangleArea,
  getRectangleDistance,
  rectanglesEqual,
} from '../colliderGeometry';
import { auditColliderGeometry } from '../colliderGeometryAudit';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const base = {
  floor: 'ground',
  category: 'wall',
  sourceType: 'test',
} satisfies Partial<RuntimeColliderMetadata>;

const collider = (
  id: string,
  bounds: RuntimeColliderMetadata['bounds'],
  floor = 'ground'
): RuntimeColliderMetadata =>
  ({
    ...base,
    id,
    floor,
    name: `Collider${id}`,
    bounds,
  }) as RuntimeColliderMetadata;

describe('rectangle geometry helpers', () => {
  it('detects exact duplicates and full containment', () => {
    const target = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };
    const duplicate = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };
    const contained = { minX: 1, maxX: 2, minZ: 1, maxZ: 2 };

    expect(rectanglesEqual(target, duplicate)).toBe(true);
    expect(containsRectangle(target, contained)).toBe(true);
    expect(getRectangleArea(target)).toBe(16);
  });

  it('calculates partial overlap intersections', () => {
    expect(
      getIntersection(
        { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
        { minX: 2, maxX: 6, minZ: 1, maxZ: 3 }
      )
    ).toEqual({ minX: 2, maxX: 4, minZ: 1, maxZ: 3 });
  });

  it('measures disjoint rectangle distance and adjacency', () => {
    const left = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
    const right = { minX: 1.04, maxX: 2, minZ: 0, maxZ: 1 };

    expect(getIntersection(left, right)).toBeUndefined();
    expect(getRectangleDistance(left, right)).toBeCloseTo(0.04);
    expect(areRectanglesAdjacent(left, right, 0.05)).toBe(true);
    expect(areRectanglesAdjacent(left, right, 0.01)).toBe(false);
  });

  it('estimates deterministic multi-collider union coverage', () => {
    const target = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };
    const coverage = estimateUnionCoverage(
      target,
      [
        { minX: 0, maxX: 2, minZ: 0, maxZ: 4 },
        { minX: 2, maxX: 4, minZ: 0, maxZ: 2 },
      ],
      4
    );

    expect(coverage.coveredSamples).toBe(12);
    expect(coverage.totalSamples).toBe(16);
    expect(coverage.coveragePercent).toBe(75);
    expect(coverage.uncoveredSamples).toEqual([
      { x: 2.5, z: 2.5, covered: false },
      { x: 3.5, z: 2.5, covered: false },
      { x: 2.5, z: 3.5, covered: false },
      { x: 3.5, z: 3.5, covered: false },
    ]);
  });
});

describe('auditColliderGeometry', () => {
  it('filters unrelated floors and reports duplicate, containment, overlap, and adjacency evidence', () => {
    const colliders = [
      collider('candidate', { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }),
      collider('duplicate', { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }),
      collider('contained', { minX: 1, maxX: 2, minZ: 1, maxZ: 2 }),
      collider('partial', { minX: 3, maxX: 5, minZ: 0, maxZ: 4 }),
      collider('adjacent', { minX: 4.02, maxX: 5, minZ: 0, maxZ: 4 }),
      collider(
        'upperDuplicate',
        { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
        'upper'
      ),
    ];

    const report = auditColliderGeometry(colliders, {
      query: { kind: 'id', value: 'candidate' },
      tolerance: 0.05,
      samples: 4,
    });

    expect(report.consideredColliderCount).toBe(4);
    expect(report.exactDuplicates.map((peer) => peer.id)).toEqual([
      'duplicate',
    ]);
    expect(report.containsCandidate.map((peer) => peer.id)).toContain(
      'contained'
    );
    expect(report.overlaps.map((peer) => peer.id)).toContain('partial');
    expect(report.adjacent.map((peer) => peer.id)).toEqual(['adjacent']);
    expect(report.unionCoverage.coveragePercent).toBe(100);
    expect(report.labels).toContain('exact duplicate');
  });
});
