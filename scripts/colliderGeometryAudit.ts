import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  areRectanglesAdjacent,
  containsRectangle,
  estimateUnionCoverage,
  getIntersection,
  getRectangleArea,
  getRectangleDistance,
  rectanglesEqual,
} from './colliderGeometry';
import {
  findColliderMatches,
  formatInspectionRecords,
  toInspectionRecords,
  type ColliderInspectQuery,
} from './colliderInspect';
import {
  collectRuntimeColliders,
  type RuntimeColliderMetadata,
} from './colliderRuntimeCollector';

type GeometryAuditOptions = {
  query: ColliderInspectQuery;
  tolerance: number;
  samples: number;
  json: boolean;
};

type AuditPeer = RuntimeColliderMetadata & {
  label: string;
  intersectionArea: number;
  candidateCoveragePercent: number;
  peerCoveragePercent: number;
  distance: number;
};

export type GeometryAuditReport = {
  candidate: RuntimeColliderMetadata;
  note: string;
  tolerance: number;
  samples: number;
  consideredColliderCount: number;
  exactDuplicates: AuditPeer[];
  candidateContainedBy: AuditPeer[];
  containsCandidate: AuditPeer[];
  overlaps: AuditPeer[];
  adjacent: AuditPeer[];
  unionCoverage: ReturnType<typeof estimateUnionCoverage>;
  labels: string[];
};

const round = (value: number): number => Number(value.toFixed(3));
const DEFAULT_TOLERANCE = 0.05;
const DEFAULT_SAMPLES = 16;

const floorsCanOverlap = (left: string, right: string): boolean =>
  left === right || left === 'all' || right === 'all';

const sameSourceFamily = (
  candidate: RuntimeColliderMetadata,
  peer: RuntimeColliderMetadata
): boolean =>
  !candidate.sourceType ||
  !peer.sourceType ||
  candidate.sourceType === peer.sourceType;

const sameEvidenceScope = (
  candidate: RuntimeColliderMetadata,
  peer: RuntimeColliderMetadata
): boolean =>
  floorsCanOverlap(candidate.floor, peer.floor) &&
  candidate.category === peer.category &&
  sameSourceFamily(candidate, peer);

const byRelevance = (left: AuditPeer, right: AuditPeer): number =>
  right.candidateCoveragePercent - left.candidateCoveragePercent ||
  right.intersectionArea - left.intersectionArea ||
  left.id.localeCompare(right.id);

const toAuditPeer = (
  candidate: RuntimeColliderMetadata,
  peer: RuntimeColliderMetadata,
  tolerance: number
): AuditPeer => {
  const intersection = getIntersection(candidate.bounds, peer.bounds);
  const intersectionArea = getRectangleArea(
    intersection ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 }
  );
  const candidateArea = getRectangleArea(candidate.bounds);
  const peerArea = getRectangleArea(peer.bounds);
  const candidateCoveragePercent =
    candidateArea === 0 ? 0 : (intersectionArea / candidateArea) * 100;
  const peerCoveragePercent =
    peerArea === 0 ? 0 : (intersectionArea / peerArea) * 100;
  let label = 'ambiguous';
  if (rectanglesEqual(candidate.bounds, peer.bounds)) {
    label = 'exact duplicate';
  } else if (containsRectangle(peer.bounds, candidate.bounds, tolerance)) {
    label = 'fully contained';
  } else if (candidateCoveragePercent >= 80 || peerCoveragePercent >= 80) {
    label = 'highly overlapped';
  } else if (intersectionArea > 0) {
    label = 'partially covered';
  } else if (areRectanglesAdjacent(candidate.bounds, peer.bounds, tolerance)) {
    label = 'isolated adjacency';
  }
  return {
    ...peer,
    label,
    intersectionArea: round(intersectionArea),
    candidateCoveragePercent: round(candidateCoveragePercent),
    peerCoveragePercent: round(peerCoveragePercent),
    distance: round(getRectangleDistance(candidate.bounds, peer.bounds)),
  };
};

export const parseGeometryAuditArgs = (
  args: readonly string[]
): GeometryAuditOptions => {
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
  return { query, tolerance, samples, json };
};

export const auditColliderGeometry = (
  colliders: readonly RuntimeColliderMetadata[],
  options: Omit<GeometryAuditOptions, 'json'>
): GeometryAuditReport => {
  const matches = findColliderMatches(colliders, options.query);
  if (matches.length !== 1) {
    throw new Error(
      `Geometry audit requires one candidate; matched ${matches.length}.`
    );
  }
  const candidate = matches[0];
  const peers = colliders.filter(
    (peer) => peer.id !== candidate.id && sameEvidenceScope(candidate, peer)
  );
  const auditPeers = peers.map((peer) =>
    toAuditPeer(candidate, peer, options.tolerance)
  );
  const exactDuplicates = auditPeers.filter((peer) =>
    rectanglesEqual(candidate.bounds, peer.bounds)
  );
  const candidateContainedBy = auditPeers.filter((peer) =>
    containsRectangle(peer.bounds, candidate.bounds, options.tolerance)
  );
  const containsCandidate = auditPeers.filter((peer) =>
    containsRectangle(candidate.bounds, peer.bounds, options.tolerance)
  );
  const overlaps = auditPeers
    .filter((peer) => peer.intersectionArea > 0)
    .sort(byRelevance);
  const adjacent = auditPeers
    .filter(
      (peer) =>
        peer.intersectionArea === 0 &&
        areRectanglesAdjacent(candidate.bounds, peer.bounds, options.tolerance)
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const unionCoverage = estimateUnionCoverage(
    candidate.bounds,
    peers.map((peer) => peer.bounds),
    options.samples
  );
  const labels = new Set<string>();
  if (exactDuplicates.length) labels.add('exact duplicate');
  if (candidateContainedBy.length || containsCandidate.length)
    labels.add('fully contained');
  if (overlaps.some((peer) => peer.candidateCoveragePercent >= 80))
    labels.add('highly overlapped');
  if (overlaps.some((peer) => peer.candidateCoveragePercent < 80))
    labels.add('partially covered');
  if (!overlaps.length && !adjacent.length) labels.add('isolated');
  if (!labels.size) labels.add('ambiguous');

  return {
    candidate,
    note: 'Geometry overlap is supporting evidence only; this tool never declares safe deletion.',
    tolerance: options.tolerance,
    samples: options.samples,
    consideredColliderCount: peers.length,
    exactDuplicates,
    candidateContainedBy,
    containsCandidate,
    overlaps,
    adjacent,
    unionCoverage,
    labels: [...labels],
  };
};

const formatPeer = (peer: AuditPeer): string =>
  `  - ${peer.id} ${peer.name} (${peer.label}): intersection ${peer.intersectionArea}, candidate ${peer.candidateCoveragePercent}%, other ${peer.peerCoveragePercent}%`;

export const formatGeometryAuditReport = (
  report: GeometryAuditReport
): string =>
  [
    formatInspectionRecords(
      toInspectionRecords([report.candidate], [report.candidate])
    ),
    '',
    `Note: ${report.note}`,
    `Evidence labels: ${report.labels.join(', ')}`,
    `Filtered evidence scope: floor ${report.candidate.floor}, category ${report.candidate.category}`,
    `Considered active colliders: ${report.consideredColliderCount}`,
    `Union coverage: ${report.unionCoverage.coveragePercent}% (${report.unionCoverage.coveredSamples}/${report.unionCoverage.totalSamples} samples covered)`,
    `Uncovered sample preview: ${
      report.unionCoverage.uncoveredSamples
        .slice(0, 8)
        .map((sample) => `(${sample.x}, ${sample.z})`)
        .join(', ') || 'none'
    }`,
    'Exact duplicates:',
    ...(report.exactDuplicates.length
      ? report.exactDuplicates.map(formatPeer)
      : ['  - none']),
    'Candidate contained by:',
    ...(report.candidateContainedBy.length
      ? report.candidateContainedBy.map(formatPeer)
      : ['  - none']),
    'Other colliders contained by candidate:',
    ...(report.containsCandidate.length
      ? report.containsCandidate.map(formatPeer)
      : ['  - none']),
    'Pairwise overlaps:',
    ...(report.overlaps.length
      ? report.overlaps.map(formatPeer)
      : ['  - none']),
    'Edge adjacency:',
    ...(report.adjacent.length
      ? report.adjacent.map(formatPeer)
      : ['  - none']),
  ].join('\n');

export const runColliderGeometryAuditCli = async (args: readonly string[]) => {
  const options = parseGeometryAuditArgs(args);
  const colliders = await collectRuntimeColliders();
  const report = auditColliderGeometry(colliders, options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${formatGeometryAuditReport(report)}\n`
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
