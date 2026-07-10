import type { Bounds2D } from './schema';

export interface HorizontalSurfaceAuditEntry {
  readonly sourceId: string;
  readonly meshName?: string;
  readonly floorId: string;
  readonly category?: string;
  readonly material?: string;
  readonly purpose?: string;
  readonly y: number;
  readonly bounds: Bounds2D;
}

export interface ZFightAuditOptions {
  readonly yTolerance?: number;
  readonly edgeTolerance?: number;
  readonly minimumOverlapArea?: number;
  readonly includeCategories?: readonly string[];
}

export interface ZFightAuditFinding {
  readonly a: HorizontalSurfaceAuditEntry;
  readonly b: HorizontalSurfaceAuditEntry;
  readonly overlapBounds: Bounds2D;
  readonly overlapArea: number;
  readonly yDelta: number;
}

const DEFAULT_Y_TOLERANCE = 0.001;
const DEFAULT_EDGE_TOLERANCE = 0.0001;
const DEFAULT_MINIMUM_OVERLAP_AREA = 0.01;

const overlapsCategory = (
  surface: HorizontalSurfaceAuditEntry,
  categories?: readonly string[]
): boolean => !categories || categories.includes(surface.category ?? '');

export const formatZFightFinding = (finding: ZFightAuditFinding): string => {
  const formatBounds = (bounds: Bounds2D) =>
    `x ${bounds.minX.toFixed(3)}..${bounds.maxX.toFixed(3)}, z ${bounds.minZ.toFixed(
      3
    )}..${bounds.maxZ.toFixed(3)}`;
  const formatSurface = (surface: HorizontalSurfaceAuditEntry) =>
    `${surface.sourceId} (${surface.meshName ?? 'unnamed'}, floor=${surface.floorId}, ` +
    `category=${surface.category ?? 'unknown'}, purpose=${surface.purpose ?? 'unknown'}, ` +
    `y=${surface.y.toFixed(4)}, bounds=${formatBounds(surface.bounds)})`;

  return `${formatSurface(finding.a)} overlaps ${formatSurface(
    finding.b
  )}; overlap=${formatBounds(finding.overlapBounds)}, area=${finding.overlapArea.toFixed(4)}`;
};

export const formatZFightFindings = (
  findings: readonly ZFightAuditFinding[]
): string => findings.map(formatZFightFinding).join('\n');

export function findHorizontalZFightCandidates(
  surfaces: readonly HorizontalSurfaceAuditEntry[],
  options: ZFightAuditOptions = {}
): ZFightAuditFinding[] {
  const yTolerance = options.yTolerance ?? DEFAULT_Y_TOLERANCE;
  const edgeTolerance = options.edgeTolerance ?? DEFAULT_EDGE_TOLERANCE;
  const minimumOverlapArea =
    options.minimumOverlapArea ?? DEFAULT_MINIMUM_OVERLAP_AREA;
  const candidates = surfaces.filter((surface) =>
    overlapsCategory(surface, options.includeCategories)
  );
  const findings: ZFightAuditFinding[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    for (
      let nextIndex = index + 1;
      nextIndex < candidates.length;
      nextIndex += 1
    ) {
      const a = candidates[index];
      const b = candidates[nextIndex];
      if (a.floorId !== b.floorId) continue;
      const yDelta = Math.abs(a.y - b.y);
      if (yDelta > yTolerance) continue;

      const overlapBounds = {
        minX: Math.max(a.bounds.minX, b.bounds.minX),
        maxX: Math.min(a.bounds.maxX, b.bounds.maxX),
        minZ: Math.max(a.bounds.minZ, b.bounds.minZ),
        maxZ: Math.min(a.bounds.maxZ, b.bounds.maxZ),
      };
      const width = overlapBounds.maxX - overlapBounds.minX;
      const depth = overlapBounds.maxZ - overlapBounds.minZ;
      if (width <= edgeTolerance || depth <= edgeTolerance) continue;
      const overlapArea = width * depth;
      if (overlapArea < minimumOverlapArea) continue;
      findings.push({ a, b, overlapBounds, overlapArea, yDelta });
    }
  }

  return findings;
}

export const findingOverlapsPoint = (
  finding: ZFightAuditFinding,
  point: { x: number; y: number; z: number; floorId: string },
  yTolerance = DEFAULT_Y_TOLERANCE
): boolean =>
  finding.a.floorId === point.floorId &&
  Math.abs(finding.a.y - point.y) <= yTolerance &&
  Math.abs(finding.b.y - point.y) <= yTolerance &&
  point.x >= finding.overlapBounds.minX &&
  point.x <= finding.overlapBounds.maxX &&
  point.z >= finding.overlapBounds.minZ &&
  point.z <= finding.overlapBounds.maxZ;
