import { describe, expect, it } from 'vitest';

import {
  collectProductionHorizontalSurfaces,
  findHorizontalZFightCandidates,
  formatZFightFindings,
  type HorizontalSurfaceAuditRecord,
} from '../zFightAudit';

const surface = (
  id: string,
  bounds: HorizontalSurfaceAuditRecord['bounds'],
  y = 0
): HorizontalSurfaceAuditRecord => ({
  id,
  sourceId: `test.${id}`,
  meshName: id,
  floorId: 'ground',
  category: 'test-horizontal',
  purpose: 'test',
  y,
  bounds,
});

describe('findHorizontalZFightCandidates', () => {
  it('detects exact and near-coplanar overlaps while ignoring separated or tiny contacts', () => {
    const findings = findHorizontalZFightCandidates(
      [
        surface('base', { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }),
        surface('exact', { minX: 2, maxX: 5, minZ: 2, maxZ: 5 }),
        surface('near', { minX: 1, maxX: 3, minZ: 1, maxZ: 3 }, 0.005),
        surface('separated', { minX: 10, maxX: 12, minZ: 10, maxZ: 12 }),
        surface('edge-touch', { minX: 4, maxX: 5, minZ: 0, maxZ: 4 }),
      ],
      { yTolerance: 0.01, edgeTolerance: 0.001, minimumOverlapArea: 0.02 }
    );

    const pairs = findings.map((finding) => [finding.a.id, finding.b.id]);
    expect(pairs).toContainEqual(['base', 'exact']);
    expect(pairs).toContainEqual(['base', 'near']);
    expect(pairs).not.toContainEqual(['base', 'separated']);
    expect(pairs).not.toContainEqual(['base', 'edge-touch']);
  });
});

describe('production horizontal z-fighting audit', () => {
  it('has no coplanar overlapping production horizontal surfaces', () => {
    const findings = findHorizontalZFightCandidates(
      collectProductionHorizontalSurfaces()
    );
    expect(formatZFightFindings(findings)).toBe('');
  });

  it('does not include a candidate over the reported studio/outside-stairs point', () => {
    const point = { x: 24.94, y: 0, z: 10.36, floorId: 'ground' };
    const findings = findHorizontalZFightCandidates(
      collectProductionHorizontalSurfaces()
    ).filter(
      ({ overlapBounds, a }) =>
        a.floorId === point.floorId &&
        Math.abs(a.y - point.y) <= 0.05 &&
        point.x >= overlapBounds.minX &&
        point.x <= overlapBounds.maxX &&
        point.z >= overlapBounds.minZ &&
        point.z <= overlapBounds.maxZ
    );

    expect(formatZFightFindings(findings)).toBe('');
  });
});
