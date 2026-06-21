import { describe, expect, it } from 'vitest';

import {
  formatColliderReport,
  inspectColliders,
  parseColliderInspectArgs,
  type RuntimeColliderMetadata,
} from '../colliderInspect';

const colliders: RuntimeColliderMetadata[] = [
  {
    id: '400D',
    debugId: '400D',
    name: 'UpperStairNorthBannisterGuard',
    sourceId: 'upper.stairwell.landingGuard.shoulderEast',
    sourceType: 'generatedCollider',
    role: 'shoulder-east',
    intent: 'safety-guard',
    purpose: 'upper stairwell landing shoulder-east guard',
    floor: 'upper',
    category: 'upper',
    bounds: { minX: 1, maxX: 2.23456, minZ: 3, maxZ: 4 },
  },
  {
    id: '1007',
    name: 'legacy-collider',
    floor: 'ground',
    category: 'static',
    bounds: { minX: 1.5, maxX: 3, minZ: 3.5, maxZ: 5 },
  },
];

describe('parseColliderInspectArgs', () => {
  it('parses exactly one query and json output', () => {
    expect(parseColliderInspectArgs(['--id', '400d', '--json'])).toEqual({
      id: '400D',
      json: true,
    });
  });

  it('rejects missing or ambiguous queries', () => {
    expect(() => parseColliderInspectArgs([])).toThrow('exactly one');
    expect(() =>
      parseColliderInspectArgs(['--id', '400D', '--name', 'x'])
    ).toThrow('exactly one');
  });
});

describe('inspectColliders', () => {
  it('resolves by source ID with source metadata and overlap counts', () => {
    const [match] = inspectColliders(colliders, {
      sourceId: 'upper.stairwell.landingGuard.shoulderEast',
    });

    expect(match).toMatchObject({
      id: '400D',
      sourceType: 'generatedCollider',
      role: 'shoulder-east',
      intent: 'safety-guard',
      idKind: 'explicit',
      overlapCount: 1,
      dimensions: { width: 1.235, depth: 1, area: 1.235 },
    });
  });

  it('reports generated legacy IDs when no explicit debug ID is exposed', () => {
    const [match] = inspectColliders(colliders, { id: '1007' });

    expect(match.idKind).toBe('generated');
    expect(match.sourceId).toBeUndefined();
  });
});

describe('formatColliderReport', () => {
  it('prints a deterministic human readable report', () => {
    const report = formatColliderReport(
      inspectColliders(colliders, { id: '400D' })
    );

    expect(report).toContain('Collider 400D');
    expect(report).toContain(
      'source ID: upper.stairwell.landingGuard.shoulderEast'
    );
    expect(report).toContain('role/intent: shoulder-east / safety-guard');
    expect(report).toContain('overlapping active colliders: 1');
  });
});
