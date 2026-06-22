import { describe, expect, it } from 'vitest';

import {
  auditColliderGeometry,
  parseColliderGeometryAuditArgs,
} from '../colliderGeometryAudit';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const collider = (
  id: string,
  bounds: RuntimeColliderMetadata['bounds'],
  floor = 'ground',
  category = 'active'
): RuntimeColliderMetadata => ({
  id,
  debugId: id,
  name: `Collider${id}`,
  sourceId: `source.${id}`,
  sourceType: 'generatedCollider',
  floor,
  category,
  bounds,
});

describe('parseColliderGeometryAuditArgs', () => {
  it('parses the candidate query and simple audit options', () => {
    expect(
      parseColliderGeometryAuditArgs([
        '--source-id',
        'upper.stairwell.landingGuard.shoulderEast',
        '--samples',
        '8',
        '--tolerance',
        '0.1',
        '--json',
      ])
    ).toEqual({
      query: {
        kind: 'source-id',
        value: 'upper.stairwell.landingGuard.shoulderEast',
      },
      samples: 8,
      tolerance: 0.1,
      json: true,
    });
  });
});

describe('auditColliderGeometry', () => {
  it('keeps floor and category filtering out of geometric evidence', () => {
    const records = auditColliderGeometry(
      [
        collider('1007', { minX: 0, maxX: 2, minZ: 0, maxZ: 2 }),
        collider('DUP', { minX: 0, maxX: 2, minZ: 0, maxZ: 2 }),
        collider('UP', { minX: 0, maxX: 2, minZ: 0, maxZ: 2 }, 'upper'),
        collider(
          'STATIC',
          { minX: 0, maxX: 2, minZ: 0, maxZ: 2 },
          'ground',
          'static'
        ),
      ],
      {
        query: { kind: 'id', value: '1007' },
        json: false,
        samples: 2,
        tolerance: 0.05,
      }
    );

    expect(records).toHaveLength(1);
    expect(records[0].exactDuplicates.map((item) => item.id)).toEqual(['DUP']);
    expect(records[0].pairwiseOverlaps.map((item) => item.collider.id)).toEqual(
      ['DUP']
    );
    expect(records[0].unionCoverage.coverageRatio).toBe(1);
  });

  it('separates pairwise partial overlap from union coverage', () => {
    const [record] = auditColliderGeometry(
      [
        collider('CANDIDATE', { minX: 0, maxX: 2, minZ: 0, maxZ: 2 }),
        collider('LEFT', { minX: 0, maxX: 1, minZ: 0, maxZ: 2 }),
        collider('BOTTOM_RIGHT', { minX: 1, maxX: 2, minZ: 0, maxZ: 1 }),
      ],
      {
        query: { kind: 'id', value: 'CANDIDATE' },
        json: false,
        samples: 2,
        tolerance: 0.05,
      }
    );

    expect(record.pairwiseOverlaps).toHaveLength(2);
    expect(
      record.pairwiseOverlaps.map((item) => item.candidateCoverage)
    ).toEqual([0.5, 0.25]);
    expect(record.unionCoverage.coverageRatio).toBe(0.75);
    expect(record.contains.map((item) => item.id)).toEqual([
      'LEFT',
      'BOTTOM_RIGHT',
    ]);
  });
});
