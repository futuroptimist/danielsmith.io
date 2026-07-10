import type { Bounds2D } from './schema';

export interface HorizontalSurfaceAuditRecord {
  id: string;
  sourceId: string;
  floorId: string;
  category: string;
  bounds: Bounds2D;
  y: number;
  meshName?: string;
  material?: string;
  purpose?: string;
}

export interface ZFightAuditOptions {
  yTolerance?: number;
  edgeTolerance?: number;
  minimumOverlapArea?: number;
  categories?: readonly string[];
}

export interface ZFightFinding {
  a: HorizontalSurfaceAuditRecord;
  b: HorizontalSurfaceAuditRecord;
  overlapBounds: Bounds2D;
  overlapArea: number;
  yDelta: number;
}

const DEFAULT_Y_TOLERANCE = 0.01;
const DEFAULT_EDGE_TOLERANCE = 1e-5;
const DEFAULT_MINIMUM_OVERLAP_AREA = 0.0025;

const getOverlap = (
  a: Bounds2D,
  b: Bounds2D,
  edgeTolerance: number
): Bounds2D | undefined => {
  const minX = Math.max(a.minX, b.minX);
  const maxX = Math.min(a.maxX, b.maxX);
  const minZ = Math.max(a.minZ, b.minZ);
  const maxZ = Math.min(a.maxZ, b.maxZ);
  if (maxX - minX <= edgeTolerance || maxZ - minZ <= edgeTolerance) {
    return undefined;
  }
  return { minX, maxX, minZ, maxZ };
};

export const boundsContainPoint = (
  bounds: Bounds2D,
  point: { x: number; z: number },
  tolerance = 0
): boolean =>
  point.x >= bounds.minX - tolerance &&
  point.x <= bounds.maxX + tolerance &&
  point.z >= bounds.minZ - tolerance &&
  point.z <= bounds.maxZ + tolerance;

export function findHorizontalZFightCandidates(
  records: readonly HorizontalSurfaceAuditRecord[],
  options: ZFightAuditOptions = {}
): ZFightFinding[] {
  const yTolerance = options.yTolerance ?? DEFAULT_Y_TOLERANCE;
  const edgeTolerance = options.edgeTolerance ?? DEFAULT_EDGE_TOLERANCE;
  const minimumOverlapArea =
    options.minimumOverlapArea ?? DEFAULT_MINIMUM_OVERLAP_AREA;
  const categories = options.categories
    ? new Set(options.categories)
    : undefined;
  const candidates = categories
    ? records.filter((record) => categories.has(record.category))
    : [...records];
  const findings: ZFightFinding[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      if (a.floorId !== b.floorId) continue;
      const yDelta = Math.abs(a.y - b.y);
      if (yDelta > yTolerance) continue;
      const overlapBounds = getOverlap(a.bounds, b.bounds, edgeTolerance);
      if (!overlapBounds) continue;
      const overlapArea =
        (overlapBounds.maxX - overlapBounds.minX) *
        (overlapBounds.maxZ - overlapBounds.minZ);
      if (overlapArea < minimumOverlapArea) continue;
      findings.push({ a, b, overlapBounds, overlapArea, yDelta });
    }
  }

  return findings;
}

export const formatZFightFinding = (finding: ZFightFinding): string => {
  const bounds = finding.overlapBounds;
  return [
    `${finding.a.sourceId} (${finding.a.id}, ${finding.a.category}, y=${finding.a.y})`,
    `${finding.b.sourceId} (${finding.b.id}, ${finding.b.category}, y=${finding.b.y})`,
    `overlap=[x:${bounds.minX.toFixed(3)}..${bounds.maxX.toFixed(3)}, z:${bounds.minZ.toFixed(3)}..${bounds.maxZ.toFixed(3)}]`,
    `area=${finding.overlapArea.toFixed(4)}`,
  ].join(' vs ');
};
