import { describe, expect, it } from 'vitest';

import {
  findColliderMatches,
  formatColliderInspection,
  formatNoMatchError,
  inspectColliderMatches,
  parseColliderInspectArgs,
  type RuntimeColliderMetadata,
} from './colliderInspection';

const colliders = [
  {
    id: '400D',
    floor: 'upper',
    category: 'upper',
    name: 'UpperStairNorthBannisterGuard',
    bounds: { minX: 1.1111, maxX: 2.2222, minZ: 3, maxZ: 4.5555 },
    sourceId: 'upper.stairwell.landingGuard.shoulderEast',
    sourceType: 'safetyCollider',
    role: 'shoulder-east',
    intent: 'safety-guard',
    purpose: 'upper stairwell landing shoulder-east guard',
    debugId: '400D',
  },
  {
    id: '1007',
    floor: 'upper',
    category: 'upper',
    name: 'UpperGeneratedCollider',
    bounds: { minX: 2, maxX: 3, minZ: 4, maxZ: 5 },
  },
] satisfies RuntimeColliderMetadata[];

describe('collider inspection argument parsing', () => {
  it('parses a single query and json flag', () => {
    expect(parseColliderInspectArgs(['--id', '400d', '--json'])).toEqual({
      query: { field: 'id', value: '400d' },
      json: true,
    });
  });

  it('rejects ambiguous query arguments', () => {
    expect(() =>
      parseColliderInspectArgs([
        '--id',
        '400D',
        '--name',
        'UpperGeneratedCollider',
      ])
    ).toThrow('Pass exactly one');
  });
});

describe('collider inspection matching', () => {
  it('matches ids case-insensitively and source ids exactly', () => {
    expect(
      findColliderMatches(colliders, { field: 'id', value: '400d' })
    ).toEqual([colliders[0]]);
    expect(
      findColliderMatches(colliders, {
        field: 'sourceId',
        value: 'upper.stairwell.landingGuard.shoulderEast',
      })
    ).toEqual([colliders[0]]);
  });

  it('adds normalized dimensions and active overlap counts', () => {
    expect(inspectColliderMatches([colliders[0]], colliders)).toEqual([
      expect.objectContaining({
        bounds: { minX: 1.111, maxX: 2.222, minZ: 3, maxZ: 4.556 },
        dimensions: { width: 1.111, depth: 1.556, area: 1.729 },
        debugIdKind: 'explicit',
        overlapCount: 1,
      }),
    ]);
  });
});

describe('collider inspection formatting', () => {
  it('renders source metadata, intent, bounds, and debug id provenance', () => {
    const output = formatColliderInspection(
      inspectColliderMatches([colliders[0]], colliders)
    );

    expect(output).toContain('Debug ID: 400D');
    expect(output).toContain(
      'Source ID: upper.stairwell.landingGuard.shoulderEast'
    );
    expect(output).toContain('Semantic intent: safety-guard');
    expect(output).toContain('Debug ID kind: explicit');
    expect(output).toContain('Overlapping active colliders: 1');
  });

  it('renders no-match context', () => {
    expect(formatNoMatchError({ field: 'name', value: 'Missing' }, 2)).toBe(
      'No collider matched name=Missing. Searched 2 active colliders.'
    );
  });
});
