import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  DEFAULT_LOWER_FLOOR_FURNISHINGS,
  DEFAULT_UPPER_FLOOR_FURNISHINGS,
  type FloorFurnishingDefinition,
} from '../structures/lowerFloorFurnishings';

import { getFloorTopElevation } from './floorElevations';
import { PORTFOLIO_LEVEL } from './portfolioLevel';
import type { Bounds2D, LevelDefinition } from './schema';

export interface HorizontalSurfaceAuditRecord {
  readonly id: string;
  readonly sourceId: string;
  readonly meshName?: string;
  readonly floorId: string;
  readonly category: string;
  readonly material?: string;
  readonly purpose?: string;
  readonly y: number;
  readonly bounds: Bounds2D;
}

export interface ZFightAuditFinding {
  readonly a: HorizontalSurfaceAuditRecord;
  readonly b: HorizontalSurfaceAuditRecord;
  readonly overlapBounds: Bounds2D;
  readonly overlapArea: number;
}

export interface ZFightAuditOptions {
  readonly yTolerance?: number;
  readonly edgeTolerance?: number;
  readonly minimumOverlapArea?: number;
  readonly includeCategories?: readonly string[];
}

const DEFAULT_Y_TOLERANCE = 0.01;
const DEFAULT_EDGE_TOLERANCE = 0.001;
const DEFAULT_MINIMUM_OVERLAP_AREA = 0.02;
const DEFAULT_DECORATIVE_HEIGHT = 0.035;

const scaleBounds = (bounds: Bounds2D): Bounds2D => ({
  minX: bounds.minX * FLOOR_PLAN_SCALE,
  maxX: bounds.maxX * FLOOR_PLAN_SCALE,
  minZ: bounds.minZ * FLOOR_PLAN_SCALE,
  maxZ: bounds.maxZ * FLOOR_PLAN_SCALE,
});

const boundsForFootprint = (
  definition: FloorFurnishingDefinition<string, string>
): Bounds2D => {
  if (definition.decorativeBounds) return definition.decorativeBounds;
  const footprint = definition.decorativeFootprint;
  if (!footprint)
    throw new Error(`Missing decorative footprint for ${definition.id}.`);
  const cos = Math.abs(Math.cos(definition.orientationRadians));
  const sin = Math.abs(Math.sin(definition.orientationRadians));
  const width = footprint.width * cos + footprint.depth * sin;
  const depth = footprint.width * sin + footprint.depth * cos;
  return {
    minX: definition.position.x - width / 2,
    maxX: definition.position.x + width / 2,
    minZ: definition.position.z - depth / 2,
    maxZ: definition.position.z + depth / 2,
  };
};

const collectDecorativeSurfaces = (
  floorId: 'ground' | 'upper',
  definitions: readonly FloorFurnishingDefinition<string, string>[]
): HorizontalSurfaceAuditRecord[] =>
  definitions
    .filter((definition) => definition.decorativeFootprint)
    .map((definition) => {
      const height =
        definition.visual?.decorativeHeight ?? DEFAULT_DECORATIVE_HEIGHT;
      return {
        id: `decorative:${floorId}:${definition.id}`,
        sourceId: `${floorId}.furnishings.${definition.category}.${definition.id}.decorative_footprint`,
        meshName: `Furnishing:${definition.id}:decorativeFootprint`,
        floorId,
        category: 'decorative-horizontal',
        material: definition.kind,
        purpose: definition.category,
        y: (definition.position.y ?? getFloorTopElevation(floorId)) + height,
        bounds: boundsForFootprint(definition),
      };
    });

export const collectProductionHorizontalSurfaces = (
  level: LevelDefinition = PORTFOLIO_LEVEL
): HorizontalSurfaceAuditRecord[] => [
  ...level.floors.flatMap((floor) =>
    floor.floorSurfaces.map((surface) => ({
      id: `floor:${surface.floorId}:${surface.id}`,
      sourceId: surface.sourceId,
      meshName: `${surface.roomId ?? surface.id} Floor`,
      floorId: surface.floorId,
      category: 'floor-surface',
      purpose: surface.purpose,
      y: surface.elevation ?? getFloorTopElevation(surface.floorId),
      bounds: scaleBounds(surface.bounds),
    }))
  ),
  ...collectDecorativeSurfaces('ground', DEFAULT_LOWER_FLOOR_FURNISHINGS),
  ...collectDecorativeSurfaces('upper', DEFAULT_UPPER_FLOOR_FURNISHINGS),
];

export const findHorizontalZFightCandidates = (
  surfaces: readonly HorizontalSurfaceAuditRecord[],
  options: ZFightAuditOptions = {}
): ZFightAuditFinding[] => {
  const yTolerance = options.yTolerance ?? DEFAULT_Y_TOLERANCE;
  const edgeTolerance = options.edgeTolerance ?? DEFAULT_EDGE_TOLERANCE;
  const minimumOverlapArea =
    options.minimumOverlapArea ?? DEFAULT_MINIMUM_OVERLAP_AREA;
  const includeCategories = options.includeCategories
    ? new Set(options.includeCategories)
    : undefined;
  const filtered = includeCategories
    ? surfaces.filter((surface) => includeCategories.has(surface.category))
    : [...surfaces];
  const findings: ZFightAuditFinding[] = [];

  for (let i = 0; i < filtered.length; i += 1) {
    for (let j = i + 1; j < filtered.length; j += 1) {
      const a = filtered[i];
      const b = filtered[j];
      if (a.floorId !== b.floorId || Math.abs(a.y - b.y) > yTolerance) continue;
      const overlapBounds = {
        minX: Math.max(a.bounds.minX, b.bounds.minX),
        maxX: Math.min(a.bounds.maxX, b.bounds.maxX),
        minZ: Math.max(a.bounds.minZ, b.bounds.minZ),
        maxZ: Math.min(a.bounds.maxZ, b.bounds.maxZ),
      };
      const overlapWidth =
        overlapBounds.maxX - overlapBounds.minX - edgeTolerance;
      const overlapDepth =
        overlapBounds.maxZ - overlapBounds.minZ - edgeTolerance;
      const overlapArea = Math.max(0, overlapWidth) * Math.max(0, overlapDepth);
      if (overlapArea >= minimumOverlapArea)
        findings.push({ a, b, overlapBounds, overlapArea });
    }
  }

  return findings;
};

export const formatZFightFindings = (
  findings: readonly ZFightAuditFinding[]
): string =>
  findings
    .map(
      ({ a, b, overlapBounds, overlapArea }) =>
        `${a.sourceId} (${a.meshName ?? a.id}, ${a.category}, y=${a.y.toFixed(3)}, ` +
        `bounds=[${a.bounds.minX.toFixed(2)},${a.bounds.maxX.toFixed(2)}]x` +
        `[${a.bounds.minZ.toFixed(2)},${a.bounds.maxZ.toFixed(2)}]) overlaps ` +
        `${b.sourceId} (${b.meshName ?? b.id}, ${b.category}, y=${b.y.toFixed(3)}, ` +
        `bounds=[${b.bounds.minX.toFixed(2)},${b.bounds.maxX.toFixed(2)}]x` +
        `[${b.bounds.minZ.toFixed(2)},${b.bounds.maxZ.toFixed(2)}]) at ` +
        `[${overlapBounds.minX.toFixed(2)},${overlapBounds.maxX.toFixed(2)}]x` +
        `[${overlapBounds.minZ.toFixed(2)},${overlapBounds.maxZ.toFixed(2)}] ` +
        `area=${overlapArea.toFixed(3)}`
    )
    .join('\n');
