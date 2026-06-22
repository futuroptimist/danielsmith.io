import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  findColliderMatches,
  formatOptional,
  type ColliderInspectQuery,
} from './colliderInspect';
import {
  collectRuntimeColliders,
  type RuntimeColliderMetadata,
} from './colliderRuntimeCollector';
import {
  areRectanglesAdjacent,
  containsRectangle,
  estimateUnionCoverage,
  rectangleArea,
  rectangleIntersection,
  rectangleSeparationDistance,
  rectanglesEqual,
} from './rectangleGeometry';

export type ColliderGeometryAuditOptions = {
  query: ColliderInspectQuery;
  json: boolean;
  tolerance: number;
  samples: number;
};

type RelatedColliderEvidence = {
  collider: RuntimeColliderMetadata;
  labels: string[];
  intersectionArea: number;
  candidateCoveragePercent: number;
  otherCoveragePercent: number;
  separationDistance: number;
};

export type ColliderGeometryAuditReport = {
  candidate: RuntimeColliderMetadata;
  candidateArea: number;
  filters: {
    floor: string;
    category: string;
    tolerance: number;
    samplesPerAxis: number;
  };
  evidence: RelatedColliderEvidence[];
  unionCoverage: {
    coveredSamples: number;
    totalSamples: number;
    coveragePercent: number;
    uncoveredSamples: { x: number; z: number }[];
  };
  classification: string;
  note: string;
};

const round = (value: number) => Number(value.toFixed(3));
const percent = (ratio: number) => round(ratio * 100);
const NOTE =
  'Geometry overlap is supporting evidence only; this tool never proves safe deletion.';

const floorsCanOverlap = (left: string, right: string): boolean =>
  left === right || left === 'all' || right === 'all';

const sameReviewGroup = (
  candidate: RuntimeColliderMetadata,
  other: RuntimeColliderMetadata
): boolean =>
  candidate.id !== other.id &&
  floorsCanOverlap(candidate.floor, other.floor) &&
  candidate.category === other.category;

export const parseColliderGeometryAuditArgs = (
  args: readonly string[]
): ColliderGeometryAuditOptions => {
  let query: ColliderInspectQuery | undefined;
  let json = false;
  let tolerance = 0.05;
  let samples = 16;

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
      continue;
    }
    if (arg === '--tolerance' || arg === '--samples') {
      const value = Number(readValue(index, arg));
      if (!Number.isFinite(value) || value <= 0)
        throw new Error(`${arg} must be positive.`);
      if (arg === '--tolerance') tolerance = value;
      if (arg === '--samples') samples = Math.floor(value);
      index += 1;
      continue;
    }
    if (arg === '--id' || arg === '--source-id' || arg === '--name') {
      if (query)
        throw new Error('Provide exactly one of --id, --source-id, or --name.');
      query = {
        kind: arg.slice(2) as ColliderInspectQuery['kind'],
        value: readValue(index, arg),
      };
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!query)
    throw new Error('Provide exactly one of --id, --source-id, or --name.');
  return { query, json, tolerance, samples };
};

const classify = (
  evidence: readonly RelatedColliderEvidence[],
  coveragePercent: number
): string => {
  if (evidence.some((item) => item.labels.includes('exact duplicate')))
    return 'exact duplicate';
  if (
    evidence.some((item) => item.labels.includes('candidate fully contained'))
  )
    return 'fully contained';
  if (coveragePercent >= 95) return 'highly overlapped';
  if (coveragePercent > 0) return 'partially covered';
  if (evidence.some((item) => item.labels.includes('edge adjacent')))
    return 'ambiguous';
  return 'isolated';
};

export const auditColliderGeometry = (
  colliders: readonly RuntimeColliderMetadata[],
  options: ColliderGeometryAuditOptions
): ColliderGeometryAuditReport[] => {
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
    const candidateArea = rectangleArea(candidate.bounds);
    const others = colliders.filter((other) =>
      sameReviewGroup(candidate, other)
    );
    const evidence = others
      .map((other): RelatedColliderEvidence | undefined => {
        const intersection = rectangleIntersection(
          candidate.bounds,
          other.bounds
        );
        const intersectionArea = intersection?.area ?? 0;
        const labels: string[] = [];
        if (rectanglesEqual(candidate.bounds, other.bounds, options.tolerance))
          labels.push('exact duplicate');
        if (
          containsRectangle(other.bounds, candidate.bounds, options.tolerance)
        )
          labels.push('candidate fully contained');
        if (
          containsRectangle(candidate.bounds, other.bounds, options.tolerance)
        )
          labels.push('contains other collider');
        if (intersectionArea > 0)
          labels.push(
            intersectionArea / candidateArea >= 0.8
              ? 'highly overlapped'
              : 'partially covered'
          );
        if (
          areRectanglesAdjacent(
            candidate.bounds,
            other.bounds,
            options.tolerance
          )
        )
          labels.push('edge adjacent');
        if (labels.length === 0) return undefined;
        return {
          collider: other,
          labels,
          intersectionArea: round(intersectionArea),
          candidateCoveragePercent:
            candidateArea > 0 ? percent(intersectionArea / candidateArea) : 0,
          otherCoveragePercent: percent(
            intersectionArea / rectangleArea(other.bounds)
          ),
          separationDistance: round(
            rectangleSeparationDistance(candidate.bounds, other.bounds)
          ),
        };
      })
      .filter((item): item is RelatedColliderEvidence => Boolean(item))
      .sort(
        (left, right) =>
          right.candidateCoveragePercent - left.candidateCoveragePercent ||
          left.separationDistance - right.separationDistance ||
          left.collider.id.localeCompare(right.collider.id)
      );

    const coverage = estimateUnionCoverage(
      candidate.bounds,
      others.map((other) => other.bounds),
      options.samples
    );
    const coveragePercent = percent(coverage.coverageRatio);
    return {
      candidate,
      candidateArea: round(candidateArea),
      filters: {
        floor: candidate.floor,
        category: candidate.category,
        tolerance: options.tolerance,
        samplesPerAxis: options.samples,
      },
      evidence,
      unionCoverage: {
        coveredSamples: coverage.coveredSamples,
        totalSamples: coverage.totalSamples,
        coveragePercent,
        uncoveredSamples: coverage.uncoveredSamples
          .slice(0, 12)
          .map((sample) => ({ x: round(sample.x), z: round(sample.z) })),
      },
      classification: classify(evidence, coveragePercent),
      note: NOTE,
    };
  });
};

const formatEvidence = (evidence: RelatedColliderEvidence): string =>
  [
    `  - ${evidence.collider.id} ${evidence.collider.name}`,
    `    labels: ${evidence.labels.join(', ')}`,
    `    source ID: ${formatOptional(evidence.collider.sourceId)}`,
    `    intersection area: ${evidence.intersectionArea}`,
    `    candidate coverage: ${evidence.candidateCoveragePercent}%`,
    `    other coverage: ${evidence.otherCoveragePercent}%`,
    `    separation distance: ${evidence.separationDistance}`,
  ].join('\n');

export const formatColliderGeometryAuditReports = (
  reports: readonly ColliderGeometryAuditReport[]
): string =>
  reports
    .map((report) =>
      [
        `Candidate ${report.candidate.id}`,
        `  runtime name: ${report.candidate.name}`,
        `  source ID: ${formatOptional(report.candidate.sourceId)}`,
        `  floor/category filter: ${report.filters.floor}/${report.filters.category}`,
        `  bounds: x ${report.candidate.bounds.minX}..${report.candidate.bounds.maxX}, z ${report.candidate.bounds.minZ}..${report.candidate.bounds.maxZ}`,
        `  area: ${report.candidateArea}`,
        `  classification: ${report.classification}`,
        `  note: ${report.note}`,
        'Evidence:',
        report.evidence.length > 0
          ? report.evidence.map(formatEvidence).join('\n')
          : '  - none',
        'Union coverage estimate:',
        `  samples: ${report.unionCoverage.coveredSamples}/${report.unionCoverage.totalSamples}`,
        `  candidate coverage: ${report.unionCoverage.coveragePercent}%`,
        `  uncovered sample points: ${report.unionCoverage.uncoveredSamples.length > 0 ? JSON.stringify(report.unionCoverage.uncoveredSamples) : 'none in sample grid'}`,
      ].join('\n')
    )
    .join('\n\n');

export const runColliderGeometryAuditCli = async (args: readonly string[]) => {
  const options = parseColliderGeometryAuditArgs(args);
  const colliders = await collectRuntimeColliders();
  const reports = auditColliderGeometry(colliders, options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(reports, null, 2)}\n`
      : `${formatColliderGeometryAuditReports(reports)}\n`
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
