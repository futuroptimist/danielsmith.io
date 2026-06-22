import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  estimateUnionCoverage,
  rectangleArea,
  rectangleContains,
  rectangleDistance,
  rectangleIntersection,
  rectanglesAreAdjacent,
  type Rectangle,
} from './colliderGeometry';
import {
  findColliderMatches,
  type ColliderInspectQuery,
} from './colliderInspect';
import {
  collectRuntimeColliders,
  type RuntimeColliderMetadata,
} from './colliderRuntimeCollector';

export type ColliderGeometryAuditOptions = {
  query: ColliderInspectQuery;
  json: boolean;
  tolerance: number;
  samples: number;
};

type PairwiseEvidence = {
  collider: RuntimeColliderMetadata;
  labels: string[];
  intersectionArea: number;
  candidateCoverage: number;
  otherCoverage: number;
  distance: number;
};

export type ColliderGeometryAuditRecord = {
  candidate: RuntimeColliderMetadata;
  disclaimer: string;
  filters: {
    floor: string;
    category: string;
    tolerance: number;
    samplesPerAxis: number;
  };
  exactDuplicates: RuntimeColliderMetadata[];
  containedBy: RuntimeColliderMetadata[];
  contains: RuntimeColliderMetadata[];
  pairwiseOverlaps: PairwiseEvidence[];
  adjacent: PairwiseEvidence[];
  unionCoverage: ReturnType<typeof estimateUnionCoverage>;
  label: string;
};

const DISCLAIMER =
  'Geometry overlap is supporting evidence only; this audit never proves a collider is safe to delete.';

const roundPercent = (value: number): number =>
  Number((value * 100).toFixed(2));

const sameBounds = (left: Rectangle, right: Rectangle): boolean =>
  left.minX === right.minX &&
  left.maxX === right.maxX &&
  left.minZ === right.minZ &&
  left.maxZ === right.maxZ;

const sameComparableScope = (
  candidate: RuntimeColliderMetadata,
  other: RuntimeColliderMetadata
): boolean =>
  candidate.id !== other.id &&
  candidate.floor === other.floor &&
  candidate.category === other.category;

const byRelevance = (left: PairwiseEvidence, right: PairwiseEvidence): number =>
  right.candidateCoverage - left.candidateCoverage ||
  right.otherCoverage - left.otherCoverage ||
  left.distance - right.distance ||
  left.collider.id.localeCompare(right.collider.id);

const classify = (
  record: Omit<ColliderGeometryAuditRecord, 'label'>
): string => {
  if (record.exactDuplicates.length > 0) {
    return 'exact duplicate';
  }
  if (record.containedBy.length > 0 || record.contains.length > 0) {
    return 'fully contained';
  }
  if (record.unionCoverage.coverageRatio >= 0.95) {
    return 'highly overlapped';
  }
  if (record.unionCoverage.coverageRatio > 0) {
    return 'partially covered';
  }
  if (record.adjacent.length === 0) {
    return 'isolated';
  }
  return 'ambiguous';
};

export const parseColliderGeometryAuditArgs = (
  args: readonly string[]
): ColliderGeometryAuditOptions => {
  let query: ColliderInspectQuery | undefined;
  let json = false;
  let tolerance = 0.05;
  let samples = 20;

  const readValue = (index: number, flag: string): string => {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${flag} requires a value.`);
    }
    return value;
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--id' || arg === '--source-id' || arg === '--name') {
      if (query) {
        throw new Error('Provide exactly one of --id, --source-id, or --name.');
      }
      const value = readValue(index, arg);
      index += 1;
      query = { kind: arg.slice(2) as ColliderInspectQuery['kind'], value };
      continue;
    }
    if (arg === '--tolerance' || arg === '--samples') {
      const value = Number(readValue(index, arg));
      index += 1;
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${arg} requires a positive number.`);
      }
      if (arg === '--tolerance') {
        tolerance = value;
      } else {
        samples = Math.floor(value);
      }
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!query) {
    throw new Error('Provide exactly one of --id, --source-id, or --name.');
  }

  return { query, json, tolerance, samples };
};

const findAuditCandidates = (
  colliders: readonly RuntimeColliderMetadata[],
  query: ColliderInspectQuery
): RuntimeColliderMetadata[] => {
  const matches = findColliderMatches(colliders, query);
  if (matches.length === 0) {
    throw new Error(`No collider matched ${query.kind} "${query.value}".`);
  }
  if (query.kind !== 'source-id' && matches.length > 1) {
    throw new Error(
      `Ambiguous collider ${query.kind} "${query.value}" matched ${matches.length} records: ${matches
        .map((match) => match.id)
        .join(', ')}.`
    );
  }
  return matches;
};

export const auditColliderGeometry = (
  colliders: readonly RuntimeColliderMetadata[],
  options: ColliderGeometryAuditOptions
): ColliderGeometryAuditRecord[] =>
  findAuditCandidates(colliders, options.query).map((candidate) => {
    const candidateArea = rectangleArea(candidate.bounds);
    const comparable = colliders.filter((other) =>
      sameComparableScope(candidate, other)
    );
    const pairwise = comparable
      .map<PairwiseEvidence | undefined>((other) => {
        const intersection = rectangleIntersection(
          candidate.bounds,
          other.bounds
        );
        const intersectionArea = intersection ? rectangleArea(intersection) : 0;
        const otherArea = rectangleArea(other.bounds);
        const labels: string[] = [];
        if (sameBounds(candidate.bounds, other.bounds))
          labels.push('exact duplicate');
        if (rectangleContains(other.bounds, candidate.bounds))
          labels.push('candidate contained');
        if (rectangleContains(candidate.bounds, other.bounds))
          labels.push('contains other');
        if (intersectionArea > 0) labels.push('overlap');
        if (
          rectanglesAreAdjacent(
            candidate.bounds,
            other.bounds,
            options.tolerance
          )
        ) {
          labels.push('edge adjacency');
        }
        if (labels.length === 0) return undefined;
        return {
          collider: other,
          labels,
          intersectionArea,
          candidateCoverage:
            candidateArea > 0 ? intersectionArea / candidateArea : 0,
          otherCoverage: otherArea > 0 ? intersectionArea / otherArea : 0,
          distance: rectangleDistance(candidate.bounds, other.bounds),
        };
      })
      .filter((item): item is PairwiseEvidence => Boolean(item))
      .sort(byRelevance);

    const baseRecord = {
      candidate,
      disclaimer: DISCLAIMER,
      filters: {
        floor: candidate.floor,
        category: candidate.category,
        tolerance: options.tolerance,
        samplesPerAxis: options.samples,
      },
      exactDuplicates: comparable.filter((other) =>
        sameBounds(candidate.bounds, other.bounds)
      ),
      containedBy: comparable.filter((other) =>
        rectangleContains(other.bounds, candidate.bounds)
      ),
      contains: comparable.filter((other) =>
        rectangleContains(candidate.bounds, other.bounds)
      ),
      pairwiseOverlaps: pairwise.filter((item) => item.intersectionArea > 0),
      adjacent: pairwise.filter((item) =>
        item.labels.includes('edge adjacency')
      ),
      unionCoverage: estimateUnionCoverage(
        candidate.bounds,
        comparable.map((other) => other.bounds),
        options.samples
      ),
    };
    return { ...baseRecord, label: classify(baseRecord) };
  });

const formatCollider = (collider: RuntimeColliderMetadata): string =>
  `${collider.id} ${collider.name} (${collider.sourceId ?? 'no source'})`;

const formatPair = (item: PairwiseEvidence): string =>
  `  - ${formatCollider(item.collider)}: ${item.labels.join(', ')}; intersection area ${item.intersectionArea.toFixed(3)}; candidate ${roundPercent(item.candidateCoverage)}%; other ${roundPercent(item.otherCoverage)}%; distance ${item.distance.toFixed(3)}`;

export const formatGeometryAuditRecords = (
  records: readonly ColliderGeometryAuditRecord[]
): string =>
  records
    .map((record) => {
      const uncoveredPreview = record.unionCoverage.uncoveredSamples.slice(
        0,
        8
      );
      return [
        `Collider ${record.candidate.id}`,
        `  runtime name: ${record.candidate.name}`,
        `  source ID: ${record.candidate.sourceId ?? 'n/a'}`,
        `  source type: ${record.candidate.sourceType ?? 'n/a'}`,
        `  intent: ${record.candidate.intent ?? 'n/a'}`,
        `  role: ${record.candidate.role ?? 'n/a'}`,
        `  purpose: ${record.candidate.purpose ?? 'n/a'}`,
        `  floor/category filter: ${record.filters.floor}/${record.filters.category}`,
        `  evidence label: ${record.label}`,
        `  note: ${record.disclaimer}`,
        `Exact duplicates: ${record.exactDuplicates.length}`,
        ...record.exactDuplicates.map(
          (collider) => `  - ${formatCollider(collider)}`
        ),
        `Full containment:`,
        `  candidate contained by: ${record.containedBy.length}`,
        ...record.containedBy.map(
          (collider) => `  - ${formatCollider(collider)}`
        ),
        `  candidate contains: ${record.contains.length}`,
        ...record.contains.map((collider) => `  - ${formatCollider(collider)}`),
        `Pairwise overlaps: ${record.pairwiseOverlaps.length}`,
        ...record.pairwiseOverlaps.map(formatPair),
        `Union coverage estimate: ${roundPercent(record.unionCoverage.coverageRatio)}% (${record.unionCoverage.coveredSamples}/${record.unionCoverage.totalSamples} deterministic samples)`,
        `  uncovered sample count: ${record.unionCoverage.uncoveredSamples.length}`,
        ...uncoveredPreview.map((sample) => `  - x ${sample.x}, z ${sample.z}`),
        record.unionCoverage.uncoveredSamples.length > uncoveredPreview.length
          ? `  - ...${record.unionCoverage.uncoveredSamples.length - uncoveredPreview.length} more`
          : undefined,
        `Edge adjacency within ${record.filters.tolerance}: ${record.adjacent.length}`,
        ...record.adjacent.map(formatPair),
      ]
        .filter((line): line is string => Boolean(line))
        .join('\n');
    })
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
