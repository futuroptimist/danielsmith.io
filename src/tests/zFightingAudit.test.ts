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
import type { FloorFurnishingDefinition } from '../scene/structures/lowerFloorFurnishings';

import {
  findHorizontalZFightingCandidates,
  formatZFightingFindings,
  zFightFindingContainsPoint,
} from './helpers/zFightingAudit';
import type { HorizontalSurfaceAuditRecord } from './helpers/zFightingAudit';

const REPORTED_POINT = { x: 24.94, y: 0.025, z: 10.36, floorId: 'ground' };
const REPORTED_POINT_Y_TOLERANCE = 0.001;

const PRODUCTION_Z_FIGHT_ALLOWLIST = [
  {
    sourceIds: [
      'upper.upperLanding.floor.main',
      'upper.upperLanding.floor.stairEdgePiece',
    ],
    expectedOverlap: { minX: 9.3, maxX: 15.5, minZ: -32, maxZ: -31.8 },
    overlapTolerance: 0.001,
    expectedYDelta: 0,
    yDeltaTolerance: 0.001,
    reason: 'Narrow upper stair edge strip bridges the visible landing lip.',
    expectedYOffsetOrStrategy:
      'Coplanar structural floor strip generated as the same material.',
    safeBecause:
      'The strip is a 0.1-source-unit seam filler at the landing boundary and does not cover the reported ground-floor studio point.',
  },
] as const;

// Floor definitions are authored in source plan units, while generated furnishing
// footprints already report rendered world-space bounds. Normalize both paths
// explicitly before comparing overlap area so the audit cannot mix spaces.
const sourceFloorBoundsToWorldBounds = (
  bounds: HorizontalSurfaceAuditRecord['bounds']
) => ({
  minX: bounds.minX * FLOOR_PLAN_SCALE,
  maxX: bounds.maxX * FLOOR_PLAN_SCALE,
  minZ: bounds.minZ * FLOOR_PLAN_SCALE,
  maxZ: bounds.maxZ * FLOOR_PLAN_SCALE,
});

const generatedFootprintBoundsToWorldBounds = (
  bounds: HorizontalSurfaceAuditRecord['bounds']
) => ({ ...bounds });

const decorativeSurfaceY = (
  definition: Pick<
    FloorFurnishingDefinition<string, string>,
    'position' | 'visual'
  >,
  floorId: string
): number =>
  (definition.position.y ?? getFloorTopElevation(floorId)) +
  (definition.visual?.decorativeHeight ?? 0.035);

const definitionById = <
  Definition extends FloorFurnishingDefinition<string, string>,
>(
  definitions: readonly Definition[]
): ReadonlyMap<string, Definition> =>
  new Map(definitions.map((definition) => [definition.id, definition]));

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
        bounds: sourceFloorBoundsToWorldBounds(surface.bounds),
      }))
    );

    const lowerDefinitions = definitionById(DEFAULT_LOWER_FLOOR_FURNISHINGS);
    const lowerFurnishings = createLowerFloorFurnishings({
      definitions: DEFAULT_LOWER_FLOOR_FURNISHINGS,
    }).decorativeFootprints.map((footprint) => {
      const definition = lowerDefinitions.get(footprint.furnishingId);

      return {
        sourceId: `ground.furnishings.${footprint.category}.${footprint.furnishingId}.decorative_footprint`,
        objectName: footprint.id,
        floorId: 'ground',
        category: 'decorative-horizontal-surface',
        purpose: 'floor-decor',
        y: definition
          ? decorativeSurfaceY(definition, 'ground')
          : getFloorTopElevation('ground') + 0.035,
        bounds: generatedFootprintBoundsToWorldBounds(footprint.bounds),
      };
    });

    const upperDefinitions = definitionById(DEFAULT_UPPER_FLOOR_FURNISHINGS);
    const upperFurnishings = createUpperFloorFurnishings({
      definitions: DEFAULT_UPPER_FLOOR_FURNISHINGS,
      baseElevation: getFloorTopElevation('upper'),
    }).decorativeFootprints.map((footprint) => {
      const definition = upperDefinitions.get(footprint.furnishingId);

      return {
        sourceId: `upper.furnishings.${footprint.category}.${footprint.furnishingId}.decorative_footprint`,
        objectName: footprint.id,
        floorId: 'upper',
        category: 'decorative-horizontal-surface',
        purpose: 'floor-decor',
        y: definition
          ? decorativeSurfaceY(definition, 'upper')
          : getFloorTopElevation('upper') + 0.035,
        bounds: generatedFootprintBoundsToWorldBounds(footprint.bounds),
      };
    });

    return [...floorSurfaces, ...lowerFurnishings, ...upperFurnishings];
  };

describe('horizontal z-fighting audit helper', () => {
  const base = {
    floorId: 'ground',
    category: 'fixture',
    y: 0,
    bounds: { minX: 0, maxX: 2, minZ: 0, maxZ: 2 },
  };

  it('only suppresses allowlisted pairs when their geometry matches expectations', () => {
    const allowedPair = [
      { ...base, sourceId: 'fixture.allowed.a' },
      {
        ...base,
        sourceId: 'fixture.allowed.b',
        y: 0.001,
        bounds: { minX: 1, maxX: 3, minZ: 1, maxZ: 3 },
      },
    ];

    const allowlist = [
      {
        sourceIds: ['fixture.allowed.a', 'fixture.allowed.b'],
        expectedOverlap: { minX: 1, maxX: 2, minZ: 1, maxZ: 2 },
        overlapTolerance: 0.001,
        expectedYDelta: 0.001,
        yDeltaTolerance: 0.001,
        reason: 'Fixture validates geometry-specific allowlist matching.',
        expectedYOffsetOrStrategy: 'Near-coplanar fixture record.',
        safeBecause: 'The overlap bounds and y delta are pinned.',
      },
    ] as const;

    expect(
      formatZFightingFindings(
        findHorizontalZFightingCandidates(allowedPair, { allowlist })
      )
    ).toBe('');

    const driftedFindings = findHorizontalZFightingCandidates(
      [
        allowedPair[0],
        {
          ...allowedPair[1],
          bounds: { minX: 0.9, maxX: 3, minZ: 1, maxZ: 3 },
        },
      ],
      { allowlist }
    );

    expect(formatZFightingFindings(driftedFindings)).toContain(
      'source=fixture.allowed.a'
    );
  });

  it('detects exact and near-coplanar overlap while ignoring separated or tiny contacts', () => {
    const findings = findHorizontalZFightingCandidates(
      [
        { ...base, sourceId: 'fixture.exact.a' },
        {
          ...base,
          sourceId: 'fixture.exact.b',
          bounds: { minX: -1, maxX: 1, minZ: 1, maxZ: 3 },
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
          bounds: { minX: 2, maxX: 3, minZ: 0, maxZ: 2 },
        },
        {
          ...base,
          sourceId: 'fixture.tiny',
          bounds: { minX: -1, maxX: 0.2, minZ: 0, maxZ: 0.04 },
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
  const productionFindings = findHorizontalZFightingCandidates(
    collectProductionHorizontalSurfaces(),
    {
      allowlist: PRODUCTION_Z_FIGHT_ALLOWLIST,
    }
  );

  it('has no coplanar overlapping floor, landing, rug, or decorative horizontal surfaces', () => {
    expect(formatZFightingFindings(productionFindings)).toBe('');
  });

  it('does not contain a z-fighting candidate at the reported studio outside-stairs point', () => {
    const reportedPointFindings = productionFindings.filter((finding) =>
      zFightFindingContainsPoint(
        finding,
        REPORTED_POINT,
        REPORTED_POINT_Y_TOLERANCE
      )
    );

    expect(formatZFightingFindings(reportedPointFindings)).toBe('');
  });
});
