import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import {
  DEFAULT_LOWER_FLOOR_FURNISHINGS,
  DEFAULT_UPPER_FLOOR_FURNISHINGS,
} from '../../structures/lowerFloorFurnishings';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../floorElevations';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import {
  boundsContainPoint,
  findHorizontalZFightCandidates,
  formatZFightFinding,
  type HorizontalSurfaceAuditRecord,
} from '../zFightAudit';

const surface = (
  id: string,
  bounds: HorizontalSurfaceAuditRecord['bounds'],
  y = 0
): HorizontalSurfaceAuditRecord => ({
  id,
  sourceId: `fixture.${id}`,
  floorId: 'ground',
  category: 'fixture',
  bounds,
  y,
});

const scaleBounds = (bounds: HorizontalSurfaceAuditRecord['bounds']) => ({
  minX: bounds.minX * FLOOR_PLAN_SCALE,
  maxX: bounds.maxX * FLOOR_PLAN_SCALE,
  minZ: bounds.minZ * FLOOR_PLAN_SCALE,
  maxZ: bounds.maxZ * FLOOR_PLAN_SCALE,
});

const furnishingSourceId = (floorId: string, id: string) =>
  `${floorId}.furnishings.decorative.${id}`;

const PRODUCTION_Z_FIGHT_ALLOWLIST = [
  {
    sourceIds: [
      'upper.upperLanding.floor.main',
      'upper.upperLanding.floor.stairEdgePiece',
    ],
    reason: 'Narrow stair-edge filler keeps the upper landing lip continuous.',
    expectedYOffset: 0,
    safeBecause:
      'The strip is outside the active ground-floor report area and is an authored landing-edge patch.',
  },
] as const;

const allowedFindingKey = (sourceIds: readonly string[]) =>
  [...sourceIds].sort().join('::');

const allowedProductionZFightKeys = new Set(
  PRODUCTION_Z_FIGHT_ALLOWLIST.map((entry) =>
    allowedFindingKey(entry.sourceIds)
  )
);

const withoutAllowedProductionFindings = (
  findings: ReturnType<typeof findHorizontalZFightCandidates>
) =>
  findings.filter(
    (finding) =>
      !allowedProductionZFightKeys.has(
        allowedFindingKey([finding.a.sourceId, finding.b.sourceId])
      )
  );

const collectProductionHorizontalSurfaces =
  (): HorizontalSurfaceAuditRecord[] => [
    ...PORTFOLIO_LEVEL.floors.flatMap((floor) =>
      floor.floorSurfaces.map((surface) => ({
        id: surface.id,
        sourceId: surface.sourceId,
        floorId: floor.id,
        category: 'floor-surface',
        bounds: scaleBounds(surface.bounds),
        y:
          surface.elevation ??
          (floor.id === 'upper'
            ? UPPER_FLOOR_TOP_ELEVATION
            : GROUND_FLOOR_TOP_ELEVATION),
        purpose: surface.purpose,
      }))
    ),
    ...DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
      (definition) => definition.decorativeFootprint
    ).map((definition) => ({
      id: definition.id,
      sourceId: furnishingSourceId('ground', definition.id),
      floorId: 'ground',
      category: 'decorative-horizontal-footprint',
      bounds: definition.decorativeBounds ?? {
        minX: definition.position.x - definition.decorativeFootprint!.width / 2,
        maxX: definition.position.x + definition.decorativeFootprint!.width / 2,
        minZ: definition.position.z - definition.decorativeFootprint!.depth / 2,
        maxZ: definition.position.z + definition.decorativeFootprint!.depth / 2,
      },
      y:
        (definition.position.y ?? 0) +
        (definition.visual?.decorativeHeight ?? 0.035),
      purpose: definition.category,
      material: definition.kind,
      meshName: `Furnishing:${definition.id}:decorativeFootprint`,
    })),
    ...DEFAULT_UPPER_FLOOR_FURNISHINGS.filter(
      (definition) => definition.decorativeFootprint
    ).map((definition) => ({
      id: definition.id,
      sourceId: furnishingSourceId('upper', definition.id),
      floorId: 'upper',
      category: 'decorative-horizontal-footprint',
      bounds: definition.decorativeBounds ?? {
        minX: definition.position.x - definition.decorativeFootprint!.width / 2,
        maxX: definition.position.x + definition.decorativeFootprint!.width / 2,
        minZ: definition.position.z - definition.decorativeFootprint!.depth / 2,
        maxZ: definition.position.z + definition.decorativeFootprint!.depth / 2,
      },
      y:
        UPPER_FLOOR_TOP_ELEVATION +
        (definition.position.y ?? 0) +
        (definition.visual?.decorativeHeight ?? 0.035),
      purpose: definition.category,
      material: definition.kind,
      meshName: `Furnishing:${definition.id}:decorativeFootprint`,
    })),
  ];

describe('horizontal z-fighting audit', () => {
  it('detects exact and near-coplanar overlap while ignoring separated or tiny edge overlaps', () => {
    const findings = findHorizontalZFightCandidates([
      surface('exact-a', { minX: 0, maxX: 2, minZ: 0, maxZ: 2 }),
      surface('exact-b', { minX: 1, maxX: 3, minZ: 1, maxZ: 3 }),
      surface('near-a', { minX: 4, maxX: 6, minZ: 0, maxZ: 2 }, 0.003),
      surface('near-b', { minX: 5, maxX: 7, minZ: 1, maxZ: 3 }, 0.007),
      surface('separated', { minX: 10, maxX: 12, minZ: 10, maxZ: 12 }),
      surface('edge-touch', { minX: 2, maxX: 2.001, minZ: 0, maxZ: 2 }),
    ]);

    expect(findings.map((finding) => [finding.a.id, finding.b.id])).toEqual([
      ['exact-a', 'exact-b'],
      ['near-a', 'near-b'],
    ]);
  });

  it('has no production coplanar horizontal decorative or floor-surface overlaps', () => {
    const findings = withoutAllowedProductionFindings(
      findHorizontalZFightCandidates(collectProductionHorizontalSurfaces())
    );
    expect(findings.map(formatZFightFinding)).toEqual([]);
  });

  it('does not overlap the reported studio z-fighting coordinate', () => {
    const reportedPoint = { x: 24.94, y: 0, z: 10.36, floorId: 'ground' };
    const findings = withoutAllowedProductionFindings(
      findHorizontalZFightCandidates(collectProductionHorizontalSurfaces())
    ).filter(
      (finding) =>
        finding.a.floorId === reportedPoint.floorId &&
        Math.abs(finding.a.y - reportedPoint.y) <= 0.05 &&
        boundsContainPoint(finding.overlapBounds, reportedPoint)
    );

    expect(findings.map(formatZFightFinding)).toEqual([]);
  });
});
