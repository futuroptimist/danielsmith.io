import type { Bounds2D } from '../../scene/level/schema';

export interface HorizontalSurfaceAuditRecord {
  readonly sourceId: string;
  readonly objectName?: string;
  readonly floorId: string;
  readonly category: string;
  readonly material?: string;
  readonly purpose?: string;
  readonly y: number;
  readonly bounds: Bounds2D;
}

export interface ZFightingAuditOptions {
  readonly yTolerance?: number;
  readonly minOverlapArea?: number;
  readonly edgeTolerance?: number;
  readonly allowlist?: readonly ZFightingAllowlistEntry[];
}

export interface ZFightingAllowlistEntry {
  readonly sourceIds: readonly [string, string];
  readonly reason: string;
  readonly expectedYOffsetOrStrategy: string;
  readonly safeBecause: string;
}

export interface ZFightingAuditFinding {
  readonly a: HorizontalSurfaceAuditRecord;
  readonly b: HorizontalSurfaceAuditRecord;
  readonly overlap: Bounds2D;
  readonly overlapArea: number;
  readonly yDelta: number;
}

const DEFAULT_Y_TOLERANCE = 0.005;
const DEFAULT_MIN_OVERLAP_AREA = 0.01;
const DEFAULT_EDGE_TOLERANCE = 0.001;

const overlapBounds = (
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

const area = (bounds: Bounds2D): number =>
  Math.max(0, bounds.maxX - bounds.minX) *
  Math.max(0, bounds.maxZ - bounds.minZ);

const allowlistKey = (left: string, right: string): string =>
  [left, right].sort().join('::');

export const findHorizontalZFightingCandidates = (
  records: readonly HorizontalSurfaceAuditRecord[],
  options: ZFightingAuditOptions = {}
): ZFightingAuditFinding[] => {
  const yTolerance = options.yTolerance ?? DEFAULT_Y_TOLERANCE;
  const minOverlapArea = options.minOverlapArea ?? DEFAULT_MIN_OVERLAP_AREA;
  const edgeTolerance = options.edgeTolerance ?? DEFAULT_EDGE_TOLERANCE;
  const allowed = new Set(
    (options.allowlist ?? []).map((entry) =>
      allowlistKey(entry.sourceIds[0], entry.sourceIds[1])
    )
  );
  const findings: ZFightingAuditFinding[] = [];

  records.forEach((a, index) => {
    records.slice(index + 1).forEach((b) => {
      if (a.floorId !== b.floorId) return;
      if (Math.abs(a.y - b.y) > yTolerance) return;
      if (allowed.has(allowlistKey(a.sourceId, b.sourceId))) return;

      const overlap = overlapBounds(a.bounds, b.bounds, edgeTolerance);
      if (!overlap) return;

      const overlapArea = area(overlap);
      if (overlapArea < minOverlapArea) return;

      findings.push({
        a,
        b,
        overlap,
        overlapArea,
        yDelta: Math.abs(a.y - b.y),
      });
    });
  });

  return findings;
};

export const zFightFindingContainsPoint = (
  finding: ZFightingAuditFinding,
  point: { x: number; z: number; floorId?: string }
): boolean =>
  (!point.floorId || finding.a.floorId === point.floorId) &&
  point.x >= finding.overlap.minX &&
  point.x <= finding.overlap.maxX &&
  point.z >= finding.overlap.minZ &&
  point.z <= finding.overlap.maxZ;

const formatBounds = (bounds: Bounds2D): string =>
  `x ${bounds.minX.toFixed(2)}..${bounds.maxX.toFixed(2)}, z ${bounds.minZ.toFixed(
    2
  )}..${bounds.maxZ.toFixed(2)}`;

export const formatZFightingFindings = (
  findings: readonly ZFightingAuditFinding[]
): string =>
  findings
    .map(
      (finding) =>
        `${finding.a.sourceId} (${finding.a.objectName ?? finding.a.category}) vs ${
          finding.b.sourceId
        } (${finding.b.objectName ?? finding.b.category}) on ${finding.a.floorId}; ` +
        `y=${finding.a.y.toFixed(3)}/${finding.b.y.toFixed(3)}; ` +
        `overlap ${formatBounds(finding.overlap)} area=${finding.overlapArea.toFixed(3)}`
    )
    .join('\n');
