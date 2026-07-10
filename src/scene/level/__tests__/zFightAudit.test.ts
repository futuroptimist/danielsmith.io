import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOWER_FLOOR_FURNISHINGS,
  DECORATIVE_FLOOR_OVERLAY_Y_OFFSET,
} from '../../structures/lowerFloorFurnishings';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import type { Bounds2D } from '../schema';
import {
  findingOverlapsPoint,
  findHorizontalZFightCandidates,
  formatZFightFindings,
  type HorizontalSurfaceAuditEntry,
} from '../zFightAudit';

const REPORTED_POINT = { x: 24.94, y: 0, z: 10.36, floorId: 'ground' };

const boundsFromCenter = (
  position: { x: number; z: number },
  footprint: { width: number; depth: number }
): Bounds2D => ({
  minX: position.x - footprint.width / 2,
  maxX: position.x + footprint.width / 2,
  minZ: position.z - footprint.depth / 2,
  maxZ: position.z + footprint.depth / 2,
});

const collectProductionHorizontalSurfaces =
  (): HorizontalSurfaceAuditEntry[] => {
    const surfaces: HorizontalSurfaceAuditEntry[] = [];

    PORTFOLIO_LEVEL.floors.forEach((floor) => {
      floor.floorSurfaces.forEach((surface) => {
        surfaces.push({
          sourceId: surface.sourceId,
          meshName: `${surface.id}:top`,
          floorId: surface.floorId,
          category: 'floor',
          material: 'room-floor',
          purpose: surface.purpose,
          y: surface.elevation ?? 0,
          bounds: surface.bounds,
        });
      });
    });

    DEFAULT_LOWER_FLOOR_FURNISHINGS.forEach((furnishing) => {
      if (!furnishing.decorativeFootprint) return;
      surfaces.push({
        sourceId: `furnishing:${furnishing.id}:decorative-bottom`,
        meshName: `Furnishing:${furnishing.id}:decorativeFootprint`,
        floorId: 'ground',
        category: 'decorative-floor-overlay',
        material: furnishing.kind,
        purpose: furnishing.category,
        y: furnishing.position.y ?? DECORATIVE_FLOOR_OVERLAY_Y_OFFSET,
        bounds:
          furnishing.decorativeBounds ??
          boundsFromCenter(furnishing.position, furnishing.decorativeFootprint),
      });
    });

    return surfaces;
  };

describe('horizontal z-fighting audit helper', () => {
  it('detects exact and near-coplanar overlaps while ignoring separated and tiny overlaps', () => {
    const surfaces: HorizontalSurfaceAuditEntry[] = [
      {
        sourceId: 'floor:a',
        floorId: 'ground',
        category: 'floor',
        y: 0,
        bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
      },
      {
        sourceId: 'floor:b',
        floorId: 'ground',
        category: 'floor',
        y: 0,
        bounds: { minX: 2, maxX: 5, minZ: 2, maxZ: 5 },
      },
      {
        sourceId: 'floor:c',
        floorId: 'ground',
        category: 'floor',
        y: 0.0005,
        bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
      },
      {
        sourceId: 'floor:d',
        floorId: 'ground',
        category: 'floor',
        y: 0,
        bounds: { minX: 10, maxX: 11, minZ: 10, maxZ: 11 },
      },
      {
        sourceId: 'floor:e',
        floorId: 'ground',
        category: 'floor',
        y: 0,
        bounds: { minX: 4, maxX: 4.01, minZ: 0, maxZ: 0.01 },
      },
    ];

    const findings = findHorizontalZFightCandidates(surfaces, {
      yTolerance: 0.001,
      minimumOverlapArea: 0.02,
    });

    expect(findings.map(({ a, b }) => [a.sourceId, b.sourceId])).toEqual([
      ['floor:a', 'floor:b'],
      ['floor:a', 'floor:c'],
    ]);
  });
});

describe('production horizontal z-fighting audit', () => {
  it('has no coplanar horizontal floor or decorative overlay overlaps', () => {
    const findings = findHorizontalZFightCandidates(
      collectProductionHorizontalSurfaces(),
      {
        yTolerance: 0.001,
        minimumOverlapArea: 0.01,
      }
    );

    expect(formatZFightFindings(findings)).toBe('');
  });

  it('does not contain a z-fighting candidate at the reported studio/outside-stairs point', () => {
    const findings = findHorizontalZFightCandidates(
      collectProductionHorizontalSurfaces(),
      {
        yTolerance: 0.001,
        minimumOverlapArea: 0.01,
      }
    ).filter((finding) => findingOverlapsPoint(finding, REPORTED_POINT));

    expect(formatZFightFindings(findings)).toBe('');
  });
});
