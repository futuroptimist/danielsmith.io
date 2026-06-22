import { describe, expect, it } from 'vitest';

import {
  auditColliderGeometry,
  formatColliderGeometryAuditReports,
  parseColliderGeometryAuditArgs,
} from '../colliderGeometryAudit';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const colliders: RuntimeColliderMetadata[] = [
  {
    id: '1007',
    floor: 'upper',
    category: 'stair',
    name: 'Candidate',
    sourceId: 'upper.stairwell.landingGuard.shoulderEast',
    bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
  },
  {
    id: 'AMBIG',
    floor: 'upper',
    category: 'stair',
    name: 'Candidate',
    bounds: { minX: 10, maxX: 12, minZ: 10, maxZ: 12 },
  },
  {
    id: 'DUP1',
    floor: 'upper',
    category: 'stair',
    name: 'Duplicate',
    bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
  },
  {
    id: 'EDGE',
    floor: 'upper',
    category: 'stair',
    name: 'Neighbor',
    bounds: { minX: 4.02, maxX: 5, minZ: 0, maxZ: 4 },
  },
  {
    id: 'ALL',
    floor: 'all',
    category: 'stair',
    name: 'AllFloorDuplicate',
    bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
  },
  {
    id: 'GROUND',
    floor: 'ground',
    category: 'stair',
    name: 'DifferentFloor',
    bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
  },
  {
    id: 'WALL',
    floor: 'upper',
    category: 'wall',
    name: 'DifferentCategory',
    bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
  },
];

describe('parseColliderGeometryAuditArgs', () => {
  it('parses selector, json, samples, and tolerance', () => {
    expect(
      parseColliderGeometryAuditArgs([
        '--source-id',
        'upper.stairwell.landingGuard.shoulderEast',
        '--json',
        '--samples',
        '8',
        '--tolerance',
        '0.1',
      ])
    ).toEqual({
      query: {
        kind: 'source-id',
        value: 'upper.stairwell.landingGuard.shoulderEast',
      },
      json: true,
      samples: 8,
      tolerance: 0.1,
    });
  });

  it('allows exact-match tolerance and valid integer sample counts', () => {
    expect(
      parseColliderGeometryAuditArgs(['--id', '1007', '--tolerance', '0'])
    ).toMatchObject({ tolerance: 0 });

    expect(
      parseColliderGeometryAuditArgs(['--id', '1007', '--samples', '1'])
    ).toMatchObject({ samples: 1 });
  });

  it('rejects fractional sample counts before they can be floored', () => {
    expect(() =>
      parseColliderGeometryAuditArgs(['--id', '1007', '--samples', '0.5'])
    ).toThrow('--samples must be a positive integer.');
  });
});

describe('auditColliderGeometry', () => {
  it('orders duplicate, containment, overlap, union coverage, and adjacency evidence', () => {
    const [report] = auditColliderGeometry(colliders, {
      query: { kind: 'id', value: '1007' },
      json: false,
      tolerance: 0.05,
      samples: 4,
    });

    expect(report.filters).toMatchObject({ floor: 'upper', category: 'stair' });
    expect(report.evidence.map((item) => item.collider.id)).toEqual([
      'ALL',
      'DUP1',
      'EDGE',
    ]);
    expect(report.evidence[0].labels).toContain('exact duplicate');
    expect(report.evidence[0].labels).toContain('candidate fully contained');
    expect(report.evidence[1].labels).toContain('exact duplicate');
    expect(report.evidence[2].labels).toEqual(['edge adjacent']);
    expect(report.unionCoverage.coveragePercent).toBe(100);
    expect(report.classification).toBe('exact duplicate');
  });

  it('reports zero coverage for degenerate colliders instead of NaN', () => {
    const [candidate] = colliders;
    const [report] = auditColliderGeometry(
      [
        candidate,
        {
          id: 'LINE',
          floor: 'upper',
          category: 'stair',
          name: 'Line',
          bounds: { minX: 1, maxX: 1, minZ: 0, maxZ: 4 },
        },
      ],
      {
        query: { kind: 'id', value: '1007' },
        json: false,
        tolerance: 0.05,
        samples: 4,
      }
    );

    expect(report.evidence[0].candidateCoveragePercent).toBe(0);
    expect(report.evidence[0].otherCoveragePercent).toBe(0);
    expect(JSON.stringify(report)).not.toContain('null');
  });

  it('uses all-floor colliders as comparable evidence for specific floors', () => {
    const [report] = auditColliderGeometry(colliders, {
      query: { kind: 'id', value: '1007' },
      json: false,
      tolerance: 0.05,
      samples: 4,
    });

    expect(report.evidence.some((item) => item.collider.id === 'ALL')).toBe(
      true
    );
  });

  it('includes matched IDs in ambiguous match errors', () => {
    expect(() =>
      auditColliderGeometry(colliders, {
        query: { kind: 'name', value: 'Candidate' },
        json: false,
        tolerance: 0.05,
        samples: 4,
      })
    ).toThrow('matched 2 records: 1007, AMBIG.');
  });

  it('formats limitation language without safe-delete claims', () => {
    const [report] = auditColliderGeometry(colliders, {
      query: { kind: 'id', value: '1007' },
      json: false,
      tolerance: 0.05,
      samples: 4,
    });
    const output = formatColliderGeometryAuditReports([report]);
    expect(output).toContain('supporting evidence only');
    expect(output).not.toContain('safe to delete');
  });
});
