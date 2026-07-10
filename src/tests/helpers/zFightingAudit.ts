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
  readonly expectedOverlap: Bounds2D;
  readonly overlapTolerance: number;
  readonly expectedYDelta: number;
  readonly yDeltaTolerance: number;
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

const withinTolerance = (
  actual: number,
  expected: number,
  tolerance: number
): boolean => Math.abs(actual - expected) <= tolerance;

const boundsWithinTolerance = (
  actual: Bounds2D,
  expected: Bounds2D,
  tolerance: number
): boolean =>
  withinTolerance(actual.minX, expected.minX, tolerance) &&
  withinTolerance(actual.maxX, expected.maxX, tolerance) &&
  withinTolerance(actual.minZ, expected.minZ, tolerance) &&
  withinTolerance(actual.maxZ, expected.maxZ, tolerance);

const isAllowlistedFinding = (
  finding: ZFightingAuditFinding,
  allowlist: readonly ZFightingAllowlistEntry[]
): boolean =>
  allowlist.some(
    (entry) =>
      allowlistKey(entry.sourceIds[0], entry.sourceIds[1]) ===
        allowlistKey(finding.a.sourceId, finding.b.sourceId) &&
      boundsWithinTolerance(
        finding.overlap,
        entry.expectedOverlap,
        entry.overlapTolerance
      ) &&
      withinTolerance(
        finding.yDelta,
        entry.expectedYDelta,
        entry.yDeltaTolerance
      )
  );

export const findHorizontalZFightingCandidates = (
  records: readonly HorizontalSurfaceAuditRecord[],
  options: ZFightingAuditOptions = {}
): ZFightingAuditFinding[] => {
  const yTolerance = options.yTolerance ?? DEFAULT_Y_TOLERANCE;
  const minOverlapArea = options.minOverlapArea ?? DEFAULT_MIN_OVERLAP_AREA;
  const edgeTolerance = options.edgeTolerance ?? DEFAULT_EDGE_TOLERANCE;
  const allowlist = options.allowlist ?? [];
  const findings: ZFightingAuditFinding[] = [];

  records.forEach((a, index) => {
    records.slice(index + 1).forEach((b) => {
      if (a.floorId !== b.floorId) return;
      if (Math.abs(a.y - b.y) > yTolerance) return;

      const overlap = overlapBounds(a.bounds, b.bounds, edgeTolerance);
      if (!overlap) return;

      const overlapArea = area(overlap);
      if (overlapArea < minOverlapArea) return;

      const finding = {
        a,
        b,
        overlap,
        overlapArea,
        yDelta: Math.abs(a.y - b.y),
      };
      if (isAllowlistedFinding(finding, allowlist)) return;

      findings.push(finding);
    });
  });

  return findings;
};

export const zFightFindingContainsPoint = (
  finding: ZFightingAuditFinding,
  point: { x: number; y?: number; z: number; floorId?: string },
  yTolerance = DEFAULT_Y_TOLERANCE
): boolean =>
  (!point.floorId || finding.a.floorId === point.floorId) &&
  (point.y === undefined ||
    Math.abs(finding.a.y - point.y) <= yTolerance ||
    Math.abs(finding.b.y - point.y) <= yTolerance) &&
  point.x >= finding.overlap.minX &&
  point.x <= finding.overlap.maxX &&
  point.z >= finding.overlap.minZ &&
  point.z <= finding.overlap.maxZ;

const formatUnknown = (value: string | undefined): string => value ?? 'unknown';

const formatSurface = (surface: HorizontalSurfaceAuditRecord): string =>
  `source=${surface.sourceId}; object=${formatUnknown(surface.objectName)}; ` +
  `floor=${surface.floorId}; category=${surface.category}; ` +
  `material=${formatUnknown(surface.material)}; purpose=${formatUnknown(surface.purpose)}; ` +
  `y=${surface.y.toFixed(3)}; bounds=(${formatBounds(surface.bounds)})`;

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
        `a: ${formatSurface(finding.a)} | b: ${formatSurface(finding.b)} | ` +
        `overlap=(${formatBounds(finding.overlap)}); ` +
        `overlapArea=${finding.overlapArea.toFixed(3)}; ` +
        `yDelta=${finding.yDelta.toFixed(3)}`
    )
    .join('\n');
