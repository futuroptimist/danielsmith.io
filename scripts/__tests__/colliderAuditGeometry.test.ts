import { describe, expect, it } from 'vitest';

import {
  auditColliderGeometry,
  formatGeometryAuditRecords,
  parseColliderGeometryAuditArgs,
} from '../colliderAuditGeometry';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const collider = (
  id: string,
  bounds: RuntimeColliderMetadata['bounds'],
  floor = 'ground',
  category = 'wall'
): RuntimeColliderMetadata => ({
  id,
  bounds,
  floor,
  category,
  name: `Collider${id}`,
  sourceId: `source.${id}`,
});

const colliders: RuntimeColliderMetadata[] = [
  collider('A', { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }),
  collider('B', { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }),
  collider('C', { minX: 1, maxX: 3, minZ: 1, maxZ: 3 }),
  collider('D', { minX: 3, maxX: 5, minZ: 0, maxZ: 2 }),
  collider('E', { minX: 4.02, maxX: 5, minZ: 2.2, maxZ: 3.2 }),
  collider('F', { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }, 'upper'),
  collider('G', { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }, 'ground', 'safety'),
];

describe('parseColliderGeometryAuditArgs', () => {
  it('parses selector, json, samples, and tolerance', () => {
    expect(
      parseColliderGeometryAuditArgs([
        '--source-id',
        'source.A',
        '--json',
        '--samples',
        '8',
        '--tolerance',
        '0.1',
      ])
    ).toEqual({
      query: { kind: 'source-id', value: 'source.A' },
      json: true,
      samples: 8,
      tolerance: 0.1,
    });
  });
});

describe('auditColliderGeometry', () => {
  it('reports duplicates, containment, overlap, adjacency, and union coverage', () => {
    const [record] = auditColliderGeometry(colliders, {
      query: { kind: 'id', value: 'A' },
      json: false,
      samples: 4,
      tolerance: 0.05,
    });

    expect(record.exactDuplicates.map((match) => match.id)).toEqual(['B']);
    expect(record.candidateContainedBy.map((match) => match.id)).toEqual(['B']);
    expect(record.containedByCandidate.map((match) => match.id)).toEqual([
      'B',
      'C',
    ]);
    expect(record.overlaps.map((overlap) => overlap.collider.id)).toEqual([
      'B',
      'C',
      'D',
    ]);
    expect(record.adjacent.map((match) => match.collider.id)).toEqual(['E']);
    expect(record.unionCoverage.coveragePercent).toBe(100);
    expect(record.comparedColliderCount).toBe(4);
    expect(record.labels).toContain('exact duplicate');
    expect(record.labels).toContain('fully contained');
  });

  it('avoids cross-floor and cross-category false positives', () => {
    const [record] = auditColliderGeometry(colliders, {
      query: { kind: 'id', value: 'A' },
      json: false,
      samples: 2,
      tolerance: 0,
    });

    expect(record.exactDuplicates.map((match) => match.id)).not.toContain('F');
    expect(record.exactDuplicates.map((match) => match.id)).not.toContain('G');
  });

  it('prints candidate metadata before supporting-evidence note', () => {
    const [record] = auditColliderGeometry(colliders, {
      query: { kind: 'id', value: 'D' },
      json: false,
      samples: 2,
      tolerance: 0.05,
    });
    const output = formatGeometryAuditRecords([record]);
    expect(output.indexOf('runtime name: ColliderD')).toBeLessThan(
      output.indexOf('note:')
    );
    expect(output).toContain('Geometry overlap is supporting evidence only');
  });
});
