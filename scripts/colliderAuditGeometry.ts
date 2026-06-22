import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  findColliderMatches,
  formatBounds,
  formatOptional,
  getDimensions,
  type ColliderInspectQuery,
} from './colliderInspect';
import {
  collectRuntimeColliders,
  type RuntimeColliderMetadata,
} from './colliderRuntimeCollector';
import {
  normalizeRect,
  rectArea,
  rectContains,
  rectDistance,
  rectIntersection,
  rectsAdjacentWithin,
  rectsEqual,
  roundMetric,
  sampleGridUnionCoverage,
} from './rectGeometry';

export type ColliderGeometryAuditOptions = {
  query: ColliderInspectQuery;
  json: boolean;
  tolerance: number;
  samples: number;
};

export type ColliderOverlapEvidence = {
  collider: RuntimeColliderMetadata;
  intersectionArea: number;
  candidateCoveragePercent: number;
  otherCoveragePercent: number;
  labels: string[];
};

export type ColliderGeometryAuditRecord = {
  candidate: RuntimeColliderMetadata & {
    normalizedBounds: RuntimeColliderMetadata['bounds'];
    dimensions: { width: number; depth: number; area: number };
  };
  comparedColliderCount: number;
  labels: string[];
  exactDuplicates: RuntimeColliderMetadata[];
  candidateContainedBy: RuntimeColliderMetadata[];
  containedByCandidate: RuntimeColliderMetadata[];
  overlaps: ColliderOverlapEvidence[];
  unionCoverage: ReturnType<typeof sampleGridUnionCoverage> & {
    coveragePercent: number;
  };
  adjacent: { collider: RuntimeColliderMetadata; distance: number }[];
  note: string;
};

const SUPPORTING_EVIDENCE_NOTE =
  'Geometry overlap is supporting evidence only; this audit never proves a collider is safe to delete.';

const DEFAULT_TOLERANCE = 0.05;
const DEFAULT_SAMPLES = 10;

const floorsCanCompare = (left: string, right: string): boolean =>
  left === right || left === 'all' || right === 'all';

const shouldCompare = (
  candidate: RuntimeColliderMetadata,
  other: RuntimeColliderMetadata
): boolean =>
  candidate.id !== other.id &&
  floorsCanCompare(candidate.floor, other.floor) &&
  candidate.category === other.category;

const byRelevance = (
  left: ColliderOverlapEvidence,
  right: ColliderOverlapEvidence
): number =>
  right.candidateCoveragePercent - left.candidateCoveragePercent ||
  right.intersectionArea - left.intersectionArea ||
  left.collider.id.localeCompare(right.collider.id);

const byIdentity = (
  left: RuntimeColliderMetadata,
  right: RuntimeColliderMetadata
): number =>
  left.id.localeCompare(right.id) || left.name.localeCompare(right.name);

const classify = (
  exactDuplicates: readonly RuntimeColliderMetadata[],
  candidateContainedBy: readonly RuntimeColliderMetadata[],
  overlaps: readonly ColliderOverlapEvidence[],
  coveragePercent: number,
  adjacentCount: number
): string[] => {
  const labels = new Set<string>();
  if (exactDuplicates.length > 0) labels.add('exact duplicate');
  if (candidateContainedBy.length > 0) labels.add('fully contained');
  if (overlaps.some((overlap) => overlap.candidateCoveragePercent >= 80)) {
    labels.add('highly overlapped');
  }
  if (coveragePercent > 0 && coveragePercent < 80)
    labels.add('partially covered');
  if (coveragePercent === 0 && adjacentCount === 0 && overlaps.length === 0)
    labels.add('isolated');
  if (labels.size === 0) labels.add('ambiguous');
  return [...labels];
};

export const parseColliderGeometryAuditArgs = (
  args: readonly string[]
): ColliderGeometryAuditOptions => {
  let query: ColliderInspectQuery | undefined;
  let json = false;
  let tolerance = DEFAULT_TOLERANCE;
  let samples = DEFAULT_SAMPLES;

  const readValue = (index: number, flag: string): string => {
    const value = args[index + 1];
    if (!value || value.startsWith('--'))
      throw new Error(`${flag} requires a value.`);
    return value;
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      json = true;
    } else if (arg === '--id' || arg === '--source-id' || arg === '--name') {
      if (query)
        throw new Error('Provide exactly one of --id, --source-id, or --name.');
      query = {
        kind: arg.slice(2) as ColliderInspectQuery['kind'],
        value: readValue(index, arg),
      };
      index += 1;
    } else if (arg === '--tolerance') {
      tolerance = Number(readValue(index, arg));
      index += 1;
    } else if (arg === '--samples') {
      samples = Number(readValue(index, arg));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!query)
    throw new Error('Provide exactly one of --id, --source-id, or --name.');
  if (!Number.isFinite(tolerance) || tolerance < 0)
    throw new Error('--tolerance must be >= 0.');
  if (!Number.isInteger(samples) || samples < 1)
    throw new Error('--samples must be a positive integer.');
  return { query, json, tolerance, samples };
};

export const auditColliderGeometry = (
  colliders: readonly RuntimeColliderMetadata[],
  options: ColliderGeometryAuditOptions
): ColliderGeometryAuditRecord[] => {
  const matches = findColliderMatches(colliders, options.query);
  if (matches.length === 0)
    throw new Error(
      `No collider matched ${options.query.kind} "${options.query.value}".`
    );
  if (options.query.kind !== 'source-id' && matches.length > 1) {
    throw new Error(
      `Ambiguous collider ${options.query.kind} "${options.query.value}" matched ${matches.length} records.`
    );
  }

  return matches.map((candidate) => {
    const comparable = colliders.filter((other) =>
      shouldCompare(candidate, other)
    );
    const candidateArea = rectArea(candidate.bounds);
    const exactDuplicates = comparable
      .filter((other) =>
        rectsEqual(candidate.bounds, other.bounds, options.tolerance)
      )
      .sort(byIdentity);
    const candidateContainedBy = comparable
      .filter((other) =>
        rectContains(other.bounds, candidate.bounds, options.tolerance)
      )
      .sort(byIdentity);
    const containedByCandidate = comparable
      .filter((other) =>
        rectContains(candidate.bounds, other.bounds, options.tolerance)
      )
      .sort(byIdentity);
    const overlaps = comparable
      .map((other) => {
        const intersection = rectIntersection(candidate.bounds, other.bounds);
        if (!intersection) return undefined;
        const intersectionArea = roundMetric(rectArea(intersection));
        const otherArea = rectArea(other.bounds);
        const candidateCoveragePercent = roundMetric(
          (intersectionArea / candidateArea) * 100
        );
        const otherCoveragePercent = roundMetric(
          (intersectionArea / otherArea) * 100
        );
        const labels: string[] = [];
        if (rectsEqual(candidate.bounds, other.bounds, options.tolerance))
          labels.push('exact duplicate');
        if (rectContains(other.bounds, candidate.bounds, options.tolerance))
          labels.push('candidate contained');
        if (rectContains(candidate.bounds, other.bounds, options.tolerance))
          labels.push('contains other');
        if (candidateCoveragePercent >= 80) labels.push('highly overlapped');
        if (labels.length === 0) labels.push('partial overlap');
        return {
          collider: other,
          intersectionArea,
          candidateCoveragePercent,
          otherCoveragePercent,
          labels,
        };
      })
      .filter((overlap): overlap is ColliderOverlapEvidence => Boolean(overlap))
      .sort(byRelevance);
    const unionCoverage = sampleGridUnionCoverage(
      candidate.bounds,
      comparable.map((other) => other.bounds),
      options.samples
    );
    const coveragePercent = roundMetric(unionCoverage.coverageRatio * 100);
    const adjacent = comparable
      .filter(
        (other) =>
          !rectIntersection(candidate.bounds, other.bounds) &&
          rectsAdjacentWithin(candidate.bounds, other.bounds, options.tolerance)
      )
      .map((other) => ({
        collider: other,
        distance: roundMetric(rectDistance(candidate.bounds, other.bounds)),
      }))
      .sort(
        (left, right) =>
          left.distance - right.distance ||
          left.collider.id.localeCompare(right.collider.id)
      );

    return {
      candidate: {
        ...candidate,
        normalizedBounds: normalizeRect(candidate.bounds),
        dimensions: getDimensions(candidate.bounds),
      },
      comparedColliderCount: comparable.length,
      labels: classify(
        exactDuplicates,
        candidateContainedBy,
        overlaps,
        coveragePercent,
        adjacent.length
      ),
      exactDuplicates,
      candidateContainedBy,
      containedByCandidate,
      overlaps,
      unionCoverage: { ...unionCoverage, coveragePercent },
      adjacent,
      note: SUPPORTING_EVIDENCE_NOTE,
    };
  });
};

const listIds = (colliders: readonly RuntimeColliderMetadata[]) =>
  colliders.length === 0
    ? 'none'
    : colliders
        .map((collider) => `${collider.id} (${collider.name})`)
        .join(', ');

export const formatGeometryAuditRecords = (
  records: readonly ColliderGeometryAuditRecord[]
): string =>
  records
    .map((record) =>
      [
        `Collider geometry audit for ${record.candidate.id}`,
        `  runtime name: ${record.candidate.name}`,
        `  source ID: ${formatOptional(record.candidate.sourceId)}`,
        `  source type: ${formatOptional(record.candidate.sourceType)}`,
        `  purpose: ${formatOptional(record.candidate.purpose)}`,
        `  floor/category: ${record.candidate.floor}/${record.candidate.category}`,
        `  normalized bounds: ${formatBounds(record.candidate.normalizedBounds)}`,
        `  dimensions: width ${record.candidate.dimensions.width}, depth ${record.candidate.dimensions.depth}, area ${record.candidate.dimensions.area}`,
        `  evidence labels: ${record.labels.join(', ')}`,
        `  compared active same-floor/category colliders: ${record.comparedColliderCount}`,
        `  exact duplicates: ${listIds(record.exactDuplicates)}`,
        `  candidate contained by: ${listIds(record.candidateContainedBy)}`,
        `  colliders contained by candidate: ${listIds(record.containedByCandidate)}`,
        '  pairwise overlaps:',
        ...(record.overlaps.length === 0
          ? ['    none']
          : record.overlaps.map(
              (overlap) =>
                `    ${overlap.collider.id} (${overlap.collider.name}): area ${overlap.intersectionArea}, candidate ${overlap.candidateCoveragePercent}%, other ${overlap.otherCoveragePercent}% [${overlap.labels.join(', ')}]`
            )),
        `  union coverage estimate: ${record.unionCoverage.coveragePercent}% (${record.unionCoverage.coveredSamples}/${record.unionCoverage.totalSamples} samples covered)`,
        `  uncovered sample count: ${record.unionCoverage.uncoveredSamples.length}`,
        `  first uncovered samples: ${
          record.unionCoverage.uncoveredSamples
            .slice(0, 8)
            .map((sample) => `(${sample.x}, ${sample.z})`)
            .join(', ') || 'none'
        }`,
        '  edge adjacency:',
        ...(record.adjacent.length === 0
          ? ['    none']
          : record.adjacent.map(
              (adjacent) =>
                `    ${adjacent.collider.id} (${adjacent.collider.name}): distance ${adjacent.distance}`
            )),
        `  note: ${record.note}`,
      ].join('\n')
    )
    .join('\n\n');

export const runColliderGeometryAuditCli = async (args: readonly string[]) => {
  const options = parseColliderGeometryAuditArgs(args);
  const colliders = await collectRuntimeColliders();
  const records = auditColliderGeometry(colliders, options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(records, null, 2)}\n`
      : `${formatGeometryAuditRecords(records)}\n`
  );
};

const isDirectExecution = () => {
  const invokedPath = process.argv[1];
  return Boolean(
    invokedPath &&
      path.resolve(invokedPath) === path.resolve(fileURLToPath(import.meta.url))
  );
};

if (isDirectExecution()) {
  runColliderGeometryAuditCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
