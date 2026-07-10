import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../assets/floorPlan';
import { getFloorTopElevation } from '../scene/level/floorElevations';
import { PORTFOLIO_LEVEL } from '../scene/level/portfolioLevel';
import {
  DEFAULT_LOWER_FLOOR_FURNISHINGS,
  DEFAULT_UPPER_FLOOR_FURNISHINGS,
  createLowerFloorFurnishings,
  createUpperFloorFurnishings,
} from '../scene/structures/lowerFloorFurnishings';

import {
  findHorizontalZFightingCandidates,
  formatZFightingFindings,
  zFightFindingContainsPoint,
} from './helpers/zFightingAudit';
import type { HorizontalSurfaceAuditRecord } from './helpers/zFightingAudit';

const REPORTED_POINT = { x: 24.94, y: 0, z: 10.36, floorId: 'ground' };
const DECORATIVE_SURFACE_HEIGHT = 0.025;

const PRODUCTION_Z_FIGHT_ALLOWLIST = [
  {
    sourceIds: [
      'upper.upperLanding.floor.main',
      'upper.upperLanding.floor.stairEdgePiece',
    ],
    reason: 'Narrow upper stair edge strip bridges the visible landing lip.',
    expectedYOffsetOrStrategy:
      'Coplanar structural floor strip generated as the same material.',
    safeBecause:
      'The strip is a 0.1-source-unit seam filler at the landing boundary and does not cover the reported ground-floor studio point.',
  },
] as const;

const scaledBounds = (bounds: HorizontalSurfaceAuditRecord['bounds']) => ({
  minX: bounds.minX * FLOOR_PLAN_SCALE,
  maxX: bounds.maxX * FLOOR_PLAN_SCALE,
  minZ: bounds.minZ * FLOOR_PLAN_SCALE,
  maxZ: bounds.maxZ * FLOOR_PLAN_SCALE,
});

const collectProductionHorizontalSurfaces =
  (): HorizontalSurfaceAuditRecord[] => {
    const floorSurfaces = PORTFOLIO_LEVEL.floors.flatMap((floor) =>
      floor.floorSurfaces.map((surface) => ({
        sourceId: surface.sourceId,
        objectName: surface.id,
        floorId: floor.id,
        category: 'floor-surface',
        purpose: surface.purpose,
        y: surface.elevation ?? getFloorTopElevation(floor.id),
        bounds: scaledBounds(surface.bounds),
      }))
    );

    const lowerFurnishings = createLowerFloorFurnishings({
      definitions: DEFAULT_LOWER_FLOOR_FURNISHINGS,
    }).decorativeFootprints.map((footprint) => ({
      sourceId: `ground.furnishings.${footprint.category}.${footprint.furnishingId}.decorative_footprint`,
      objectName: footprint.id,
      floorId: 'ground',
      category: 'decorative-horizontal-surface',
      purpose: 'floor-decor',
      y: getFloorTopElevation('ground') + DECORATIVE_SURFACE_HEIGHT,
      bounds: footprint.bounds,
    }));

    const upperFurnishings = createUpperFloorFurnishings({
      definitions: DEFAULT_UPPER_FLOOR_FURNISHINGS,
      baseElevation: getFloorTopElevation('upper'),
    }).decorativeFootprints.map((footprint) => ({
      sourceId: `upper.furnishings.${footprint.category}.${footprint.furnishingId}.decorative_footprint`,
      objectName: footprint.id,
      floorId: 'upper',
      category: 'decorative-horizontal-surface',
      purpose: 'floor-decor',
      y: getFloorTopElevation('upper') + DECORATIVE_SURFACE_HEIGHT,
      bounds: footprint.bounds,
    }));

    return [...floorSurfaces, ...lowerFurnishings, ...upperFurnishings];
  };

describe('horizontal z-fighting audit helper', () => {
  const base = {
    floorId: 'ground',
    category: 'fixture',
    y: 0,
    bounds: { minX: 0, maxX: 2, minZ: 0, maxZ: 2 },
  };

  it('detects exact and near-coplanar overlap while ignoring separated or tiny contacts', () => {
    const findings = findHorizontalZFightingCandidates(
      [
        { ...base, sourceId: 'fixture.exact.a' },
        {
          ...base,
          sourceId: 'fixture.exact.b',
          bounds: { minX: 1, maxX: 3, minZ: 1, maxZ: 3 },
        },
        {
          ...base,
          sourceId: 'fixture.near.a',
          y: 1,
          bounds: { minX: 5, maxX: 7, minZ: 5, maxZ: 7 },
        },
        {
          ...base,
          sourceId: 'fixture.near.b',
          y: 1.003,
          bounds: { minX: 6, maxX: 8, minZ: 6, maxZ: 8 },
        },
        {
          ...base,
          sourceId: 'fixture.separate',
          bounds: { minX: 9, maxX: 10, minZ: 9, maxZ: 10 },
        },
        {
          ...base,
          sourceId: 'fixture.edge',
          bounds: { minX: 3, maxX: 4, minZ: 0, maxZ: 2 },
        },
        {
          ...base,
          sourceId: 'fixture.tiny',
          bounds: { minX: 1.99, maxX: 3, minZ: 0, maxZ: 0.2 },
        },
      ],
      { yTolerance: 0.005, minOverlapArea: 0.01 }
    );

    expect(
      findings.map((finding) => [finding.a.sourceId, finding.b.sourceId])
    ).toEqual([
      ['fixture.exact.a', 'fixture.exact.b'],
      ['fixture.near.a', 'fixture.near.b'],
    ]);
  });
});

describe('production horizontal z-fighting audit', () => {
  it('has no coplanar overlapping floor, landing, rug, or decorative horizontal surfaces', () => {
    const findings = findHorizontalZFightingCandidates(
      collectProductionHorizontalSurfaces(),
      {
        allowlist: PRODUCTION_Z_FIGHT_ALLOWLIST,
      }
    );

    expect(formatZFightingFindings(findings)).toBe('');
  });

  it('does not contain a z-fighting candidate at the reported studio outside-stairs point', () => {
    const findings = findHorizontalZFightingCandidates(
      collectProductionHorizontalSurfaces(),
      {
        allowlist: PRODUCTION_Z_FIGHT_ALLOWLIST,
      }
    ).filter((finding) => zFightFindingContainsPoint(finding, REPORTED_POINT));

    expect(formatZFightingFindings(findings)).toBe('');
  });
});
