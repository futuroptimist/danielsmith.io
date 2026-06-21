import { describe, expect, it } from 'vitest';

import {
  findColliderMatches,
  formatInspectionRecords,
  inspectColliders,
  parseColliderInspectArgs,
  toInspectionRecords,
} from '../colliderInspect';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const colliders: RuntimeColliderMetadata[] = [
  {
    id: '1007',
    floor: 'upper',
    category: 'stair',
    name: 'UpperStairNorthBannisterGuard',
    sourceId: 'upper.stairwell.landingGuard.shoulderEast',
    sourceType: 'generatedCollider',
    intent: 'safety-guard',
    purpose: 'guard upper stairwell void edge',
    debugId: '1007',
    bounds: { minX: 1.23456, maxX: 2.23456, minZ: -1, maxZ: 1 },
  },
  {
    id: '400D',
    floor: 'upper',
    category: 'wall',
    name: 'UpperWallSegment:north',
    sourceId: 'upper.wall.north.1',
    sourceType: 'wall',
    bounds: { minX: 2, maxX: 3, minZ: -0.5, maxZ: 0.5 },
  },
  {
    id: 'ABCD',
    floor: 'ground',
    category: 'legacy',
    name: 'LegacyGeneratedCollider',
    bounds: { minX: 10, maxX: 11, minZ: 10, maxZ: 12 },
  },
];

describe('parseColliderInspectArgs', () => {
  it('parses a single selector and json flag', () => {
    expect(parseColliderInspectArgs(['--id', '1007', '--json'])).toEqual({
      query: { kind: 'id', value: '1007' },
      json: true,
    });
  });

  it('rejects missing or ambiguous selectors', () => {
    expect(() => parseColliderInspectArgs([])).toThrow('Provide exactly one');
    expect(() =>
      parseColliderInspectArgs(['--id', '1007', '--name', 'x'])
    ).toThrow('Provide exactly one');
  });
});

describe('findColliderMatches', () => {
  it('matches debug ids case-insensitively', () => {
    expect(
      findColliderMatches(colliders, { kind: 'id', value: '400d' })
    ).toEqual([colliders[1]]);
  });

  it('matches source ids and runtime names exactly', () => {
    expect(
      findColliderMatches(colliders, {
        kind: 'source-id',
        value: 'upper.stairwell.landingGuard.shoulderEast',
      })
    ).toEqual([colliders[0]]);
    expect(
      findColliderMatches(colliders, {
        kind: 'name',
        value: 'UpperStairNorthBannisterGuard',
      })
    ).toEqual([colliders[0]]);
  });
});

describe('inspectColliders', () => {
  it('adds normalized bounds, dimensions, id kind, and overlap counts', () => {
    const [record] = inspectColliders(colliders, {
      query: { kind: 'id', value: '1007' },
      json: false,
    });

    expect(record.normalizedBounds).toEqual({
      minX: 1.235,
      maxX: 2.235,
      minZ: -1,
      maxZ: 1,
    });
    expect(record.dimensions).toEqual({ width: 1, depth: 2, area: 2 });
    expect(record.idKind).toBe('explicit');
    expect(record.overlappingActiveColliderCount).toBe(1);
  });

  it('reports generated IDs for legacy records without debugId metadata', () => {
    const [record] = toInspectionRecords([colliders[2]], colliders);
    expect(record.idKind).toBe('generated');
  });

  it('throws clear no-match errors', () => {
    expect(() =>
      inspectColliders(colliders, {
        query: { kind: 'id', value: 'FFFF' },
        json: false,
      })
    ).toThrow('No collider matched id "FFFF".');
  });

  it('throws clear ambiguous errors for non-source selectors', () => {
    const duplicatedName = [
      ...colliders,
      { ...colliders[2], id: 'BCDE', name: 'LegacyGeneratedCollider' },
    ];
    expect(() =>
      inspectColliders(duplicatedName, {
        query: { kind: 'name', value: 'LegacyGeneratedCollider' },
        json: false,
      })
    ).toThrow('Ambiguous collider name "LegacyGeneratedCollider"');
  });
});

describe('formatInspectionRecords', () => {
  it('prints deterministic human-readable collider details', () => {
    const [record] = inspectColliders(colliders, {
      query: { kind: 'id', value: '1007' },
      json: false,
    });

    expect(formatInspectionRecords([record])).toContain('Collider 1007');
    expect(formatInspectionRecords([record])).toContain(
      'source ID: upper.stairwell.landingGuard.shoulderEast'
    );
    expect(formatInspectionRecords([record])).toContain('intent: safety-guard');
    expect(formatInspectionRecords([record])).toContain(
      'normalized bounds: x 1.235..2.235, z -1..1'
    );
  });
});
