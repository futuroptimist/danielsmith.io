import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { floorsCanOverlap, formatOptional } from './colliderInspect';
import {
  collectRuntimeColliders,
  type RuntimeColliderMetadata,
} from './colliderRuntimeCollector';
import {
  containsRectangle,
  rectangleArea,
  rectanglesEqual,
} from './rectangleGeometry';

export type ColliderRedundancyGateOptions = {
  json: boolean;
  tolerance: number;
  timeoutMs: number;
  maxNodes: number;
  failOnAnonymous: boolean;
  baseUrl?: string;
};

export type RedundancyClassification =
  | 'exact-duplicate'
  | 'fully-contained-source-backed'
  | 'anonymous-generated';

export type RedundancySeverity = 'failure' | 'warning';

export type ColliderRedundancyFinding = {
  severity: RedundancySeverity;
  classification: RedundancyClassification;
  candidate: RuntimeColliderMetadata;
  evidence: Array<
    Pick<
      RuntimeColliderMetadata,
      'id' | 'name' | 'sourceId' | 'intent' | 'role'
    >
  >;
  message: string;
  remediation: string;
};

export type ColliderRedundancyGateReport = {
  status: 'passed' | 'failed';
  totals: {
    inspectedColliders: number;
    failures: number;
    warnings: number;
  };
  options: Omit<ColliderRedundancyGateOptions, 'json'>;
  findings: ColliderRedundancyFinding[];
};

const INTENTIONAL_INTENTS = new Set([
  'secondary-backstop',
  'visual-only-by-policy',
]);
const INTENTIONAL_ROLES = new Set([
  'secondary-backstop',
  'visual-only-by-policy',
]);
const GENERIC_BLOCKERS = new Set(['groundCollider']);

const hasSourceMetadata = (collider: RuntimeColliderMetadata): boolean =>
  typeof collider.sourceId === 'string' && collider.sourceId.length > 0;

const isGeneratedId = (collider: RuntimeColliderMetadata): boolean =>
  collider.debugId !== undefined && collider.debugId !== collider.id;

const isIntentionalException = (collider: RuntimeColliderMetadata): boolean =>
  INTENTIONAL_INTENTS.has(collider.intent ?? '') ||
  INTENTIONAL_ROLES.has(collider.role ?? '');

const samePolicyGroup = (
  left: RuntimeColliderMetadata,
  right: RuntimeColliderMetadata
): boolean =>
  left.id !== right.id &&
  floorsCanOverlap(left.floor, right.floor) &&
  left.category === right.category;

const stableColliderKey = (collider: RuntimeColliderMetadata): string =>
  [collider.id, collider.sourceId ?? '', collider.name].join('\0');

const toEvidence = (collider: RuntimeColliderMetadata) => ({
  id: collider.id,
  name: collider.name,
  sourceId: collider.sourceId,
  intent: collider.intent,
  role: collider.role,
});

const findExactDuplicateFailures = (
  colliders: readonly RuntimeColliderMetadata[],
  tolerance: number
): ColliderRedundancyFinding[] => {
  const findings: ColliderRedundancyFinding[] = [];
  const sorted = [...colliders].sort((left, right) =>
    stableColliderKey(left).localeCompare(stableColliderKey(right))
  );

  for (let index = 0; index < sorted.length; index += 1) {
    const candidate = sorted[index];
    if (!hasSourceMetadata(candidate) || isIntentionalException(candidate))
      continue;
    const duplicates = sorted.filter(
      (other) =>
        stableColliderKey(other) > stableColliderKey(candidate) &&
        samePolicyGroup(candidate, other) &&
        hasSourceMetadata(other) &&
        !isIntentionalException(other) &&
        rectanglesEqual(candidate.bounds, other.bounds, tolerance)
    );
    if (duplicates.length === 0) continue;
    findings.push({
      severity: 'failure',
      classification: 'exact-duplicate',
      candidate,
      evidence: duplicates.map(toEvidence),
      message:
        'Active source-backed collider has exact duplicate bounds on the same floor/category.',
      remediation:
        'Remove the duplicate collider or mark the intentional secondary/backstop policy in source metadata.',
    });
  }
  return findings;
};

const findContainedFailures = (
  colliders: readonly RuntimeColliderMetadata[],
  tolerance: number
): ColliderRedundancyFinding[] =>
  colliders.flatMap((candidate) => {
    if (!hasSourceMetadata(candidate) || isIntentionalException(candidate))
      return [];
    const candidateArea = rectangleArea(candidate.bounds);
    if (candidateArea <= 0) return [];
    const dominators = colliders.filter(
      (other) =>
        samePolicyGroup(candidate, other) &&
        hasSourceMetadata(other) &&
        other.sourceId !== candidate.sourceId &&
        !isIntentionalException(other) &&
        !GENERIC_BLOCKERS.has(other.id) &&
        rectangleArea(other.bounds) > candidateArea + tolerance &&
        containsRectangle(other.bounds, candidate.bounds, tolerance)
    );
    if (dominators.length === 0) return [];
    return [
      {
        severity: 'failure' as const,
        classification: 'fully-contained-source-backed' as const,
        candidate,
        evidence: dominators.map(toEvidence),
        message:
          'Source-backed collider is fully contained by larger source-backed collider(s).',
        remediation:
          'Remove the contained collider, add missing source metadata to explain it, or mark it as an intentional secondary/backstop policy.',
      },
    ];
  });

const findAnonymousWarnings = (
  colliders: readonly RuntimeColliderMetadata[],
  failOnAnonymous: boolean
): ColliderRedundancyFinding[] =>
  colliders
    .filter(
      (collider) => !hasSourceMetadata(collider) || isGeneratedId(collider)
    )
    .map((candidate) => ({
      severity: failOnAnonymous ? ('failure' as const) : ('warning' as const),
      classification: 'anonymous-generated' as const,
      candidate,
      evidence: [],
      message:
        'Collider is anonymous or uses a generated runtime ID, so redundancy is not high-confidence.',
      remediation:
        'Add sourceId/debugId provenance, or rerun with --fail-on-anonymous when enforcing a stricter migration.',
    }));

export const evaluateColliderRedundancy = (
  colliders: readonly RuntimeColliderMetadata[],
  options: Pick<ColliderRedundancyGateOptions, 'tolerance' | 'failOnAnonymous'>
): ColliderRedundancyFinding[] => [
  ...findExactDuplicateFailures(colliders, options.tolerance),
  ...findContainedFailures(colliders, options.tolerance),
  ...findAnonymousWarnings(colliders, options.failOnAnonymous),
];

export const parseColliderRedundancyGateArgs = (
  args: readonly string[]
): ColliderRedundancyGateOptions => {
  let json = false;
  let tolerance = 0.01;
  let timeoutMs = 120_000;
  let maxNodes = 3_000;
  let failOnAnonymous = false;
  let baseUrl: string | undefined;
  const readValue = (index: number, flag: string) => {
    const value = args[index + 1];
    if (!value || value.startsWith('--'))
      throw new Error(`${flag} requires a value.`);
    return value;
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') json = true;
    else if (arg === '--fail-on-anonymous') failOnAnonymous = true;
    else if (arg === '--base-url') {
      baseUrl = readValue(index, arg);
      index += 1;
    } else if (
      arg === '--tolerance' ||
      arg === '--timeout-ms' ||
      arg === '--max-nodes'
    ) {
      const value = Number(readValue(index, arg));
      if (!Number.isFinite(value) || value <= 0)
        throw new Error(`${arg} must be positive.`);
      if (arg === '--tolerance') tolerance = value;
      if (arg === '--timeout-ms') timeoutMs = Math.floor(value);
      if (arg === '--max-nodes') maxNodes = Math.floor(value);
      index += 1;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return { json, tolerance, timeoutMs, maxNodes, failOnAnonymous, baseUrl };
};

const buildReport = (
  colliders: readonly RuntimeColliderMetadata[],
  findings: readonly ColliderRedundancyFinding[],
  options: ColliderRedundancyGateOptions
): ColliderRedundancyGateReport => {
  const failures = findings.filter(
    (finding) => finding.severity === 'failure'
  ).length;
  const warnings = findings.filter(
    (finding) => finding.severity === 'warning'
  ).length;
  return {
    status: failures > 0 ? 'failed' : 'passed',
    totals: { inspectedColliders: colliders.length, failures, warnings },
    options: {
      tolerance: options.tolerance,
      timeoutMs: options.timeoutMs,
      maxNodes: options.maxNodes,
      failOnAnonymous: options.failOnAnonymous,
      baseUrl: options.baseUrl,
    },
    findings: [...findings],
  };
};

const formatFinding = (finding: ColliderRedundancyFinding): string =>
  [
    `${finding.severity === 'failure' ? 'FAIL' : 'WARN'} ${finding.candidate.id} ${finding.candidate.name}`,
    `  source ID: ${formatOptional(finding.candidate.sourceId)}`,
    `  classification: ${finding.classification}`,
    `  evidence: ${
      finding.evidence.length > 0
        ? finding.evidence
            .map(
              (item) =>
                `${item.id} ${item.name} (${formatOptional(item.sourceId)})`
            )
            .join('; ')
        : 'none'
    }`,
    `  message: ${finding.message}`,
    `  remediation: ${finding.remediation}`,
  ].join('\n');

export const formatColliderRedundancyGateReport = (
  report: ColliderRedundancyGateReport
): string =>
  [
    `Collider redundancy gate ${report.status.toUpperCase()}`,
    `Inspected ${report.totals.inspectedColliders} colliders; failures ${report.totals.failures}; warnings ${report.totals.warnings}.`,
    'Conservative policy: ambiguous, isolated, outside-navmesh, anonymous, or source-less colliders are warnings only unless --fail-on-anonymous is set.',
    report.findings.length > 0
      ? report.findings.map(formatFinding).join('\n\n')
      : 'No high-confidence redundant colliders found.',
  ].join('\n');

export const runColliderRedundancyGateCli = async (args: readonly string[]) => {
  const options = parseColliderRedundancyGateArgs(args);
  let colliders: RuntimeColliderMetadata[];
  try {
    colliders = await collectRuntimeColliders({
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to inspect runtime colliders within ${options.timeoutMs}ms: ${message}`
    );
  }
  if (colliders.length > options.maxNodes) {
    throw new Error(
      `Runtime returned ${colliders.length} colliders, exceeding --max-nodes ${options.maxNodes}. Increase the bound intentionally if needed.`
    );
  }
  const findings = evaluateColliderRedundancy(colliders, options);
  const report = buildReport(colliders, findings, options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${formatColliderRedundancyGateReport(report)}\n`
  );
  if (report.status === 'failed') process.exitCode = 1;
};

const isDirectExecution = () => {
  const invokedPath = process.argv[1];
  return Boolean(
    invokedPath &&
      path.resolve(invokedPath) === path.resolve(fileURLToPath(import.meta.url))
  );
};

if (isDirectExecution()) {
  runColliderRedundancyGateCli(process.argv.slice(2)).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  );
}
