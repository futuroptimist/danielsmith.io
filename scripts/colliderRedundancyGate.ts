import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { floorsCanOverlap, formatOptional } from './colliderInspect';
import {
  collectRuntimeColliders,
  type RuntimeColliderMetadata,
} from './colliderRuntimeCollector';
import { containsRectangle, rectanglesEqual } from './rectangleGeometry';

export type ColliderRedundancyGateOptions = {
  json: boolean;
  tolerance: number;
  timeoutMs: number;
  maxNodes: number;
  baseUrl?: string;
  failOnAnonymous: boolean;
};

export type ColliderRedundancyFindingKind =
  | 'exact-duplicate'
  | 'fully-contained';
export type ColliderRedundancySeverity = 'failure' | 'warning';

export type ColliderRedundancyFinding = {
  severity: ColliderRedundancySeverity;
  kind: ColliderRedundancyFindingKind | 'anonymous-collider';
  candidate: RuntimeColliderMetadata;
  evidence: RuntimeColliderMetadata[];
  message: string;
  remediation: string;
};

export type ColliderRedundancyGateReport = {
  passed: boolean;
  limits: {
    tolerance: number;
    timeoutMs: number;
    maxNodes: number;
    inspectedColliders: number;
    failOnAnonymous: boolean;
  };
  failures: ColliderRedundancyFinding[];
  warnings: ColliderRedundancyFinding[];
};

const INTENTIONAL_INTENTS = new Set([
  'secondary-backstop',
  'visual-only-by-policy',
  'physical-boundary',
]);

export const parseColliderRedundancyGateArgs = (
  args: readonly string[]
): ColliderRedundancyGateOptions => {
  let json = false;
  let tolerance = 0.05;
  let timeoutMs = 120_000;
  let maxNodes = 3_000;
  let baseUrl: string | undefined;
  let failOnAnonymous = false;
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
  return { json, tolerance, timeoutMs, maxNodes, baseUrl, failOnAnonymous };
};

const sameReviewGroup = (
  left: RuntimeColliderMetadata,
  right: RuntimeColliderMetadata
) =>
  left.id !== right.id &&
  floorsCanOverlap(left.floor, right.floor) &&
  left.category === right.category;

const hasSource = (collider: RuntimeColliderMetadata) =>
  Boolean(collider.sourceId);

const isIntentionalException = (collider: RuntimeColliderMetadata) =>
  Boolean(collider.intent && INTENTIONAL_INTENTS.has(collider.intent));

const byId = (left: RuntimeColliderMetadata, right: RuntimeColliderMetadata) =>
  left.id.localeCompare(right.id);

const summarize = (collider: RuntimeColliderMetadata) =>
  `${collider.id} ${collider.name} (${formatOptional(collider.sourceId)})`;

const exactDuplicateKey = (collider: RuntimeColliderMetadata) =>
  [
    collider.floor,
    collider.category,
    collider.sourceId ?? '',
    collider.bounds.minX,
    collider.bounds.maxX,
    collider.bounds.minZ,
    collider.bounds.maxZ,
  ].join('|');

export const evaluateColliderRedundancy = (
  colliders: readonly RuntimeColliderMetadata[],
  options: Pick<
    ColliderRedundancyGateOptions,
    'tolerance' | 'maxNodes' | 'timeoutMs' | 'failOnAnonymous'
  >
): ColliderRedundancyGateReport => {
  const inspected = colliders.slice(0, options.maxNodes);
  const findings: ColliderRedundancyFinding[] = [];
  for (const collider of inspected) {
    if (!hasSource(collider)) {
      findings.push({
        severity: options.failOnAnonymous ? 'failure' : 'warning',
        kind: 'anonymous-collider',
        candidate: collider,
        evidence: [],
        message:
          'Active collider is missing source metadata, so redundancy cannot be proven safely.',
        remediation:
          'Add sourceId/purpose metadata or rerun with --fail-on-anonymous for strict provenance enforcement.',
      });
    }
  }

  const duplicateGroups = new Map<string, RuntimeColliderMetadata[]>();
  for (const collider of inspected.filter(hasSource)) {
    const key = exactDuplicateKey(collider);
    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), collider]);
  }
  for (const group of duplicateGroups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(byId);
    const keeper = sorted[0];
    for (const candidate of sorted.slice(1)) {
      if (isIntentionalException(candidate)) continue;
      findings.push({
        severity: 'failure',
        kind: 'exact-duplicate',
        candidate,
        evidence: [keeper],
        message: `Exact duplicate of source-backed collider ${summarize(keeper)}.`,
        remediation:
          'Remove the duplicate collider or mark it with intentional secondary/backstop policy metadata.',
      });
    }
  }

  for (const candidate of inspected.filter(
    (collider) => hasSource(collider) && !isIntentionalException(collider)
  )) {
    const dominators = inspected
      .filter(
        (other) =>
          sameReviewGroup(candidate, other) &&
          hasSource(other) &&
          candidate.sourceId !== other.sourceId &&
          rectanglesEqual(candidate.bounds, other.bounds, options.tolerance) ===
            false &&
          containsRectangle(other.bounds, candidate.bounds, options.tolerance)
      )
      .sort(byId);
    if (dominators.length === 0) continue;
    findings.push({
      severity: 'failure',
      kind: 'fully-contained',
      candidate,
      evidence: dominators,
      message: `Fully contained by source-backed collider(s): ${dominators.map(summarize).join('; ')}.`,
      remediation:
        'Remove the contained collider, source-back a narrower purpose, or mark it as an intentional secondary/backstop.',
    });
  }

  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  return {
    passed: failures.length === 0,
    limits: {
      tolerance: options.tolerance,
      timeoutMs: options.timeoutMs,
      maxNodes: options.maxNodes,
      inspectedColliders: inspected.length,
      failOnAnonymous: options.failOnAnonymous,
    },
    failures,
    warnings,
  };
};

const formatFinding = (finding: ColliderRedundancyFinding) =>
  [
    `- ${finding.severity.toUpperCase()} ${finding.kind}: ${finding.candidate.id} ${finding.candidate.name}`,
    `  source ID: ${formatOptional(finding.candidate.sourceId)}`,
    `  classification: ${finding.kind}`,
    `  evidence: ${finding.evidence.length > 0 ? finding.evidence.map(summarize).join('; ') : finding.message}`,
    `  remediation: ${finding.remediation}`,
  ].join('\n');

export const formatColliderRedundancyGateReport = (
  report: ColliderRedundancyGateReport
) =>
  [
    report.passed
      ? 'Collider redundancy gate passed: no high-confidence redundant colliders found.'
      : 'Collider redundancy gate failed: high-confidence redundant colliders found.',
    `Inspected ${report.limits.inspectedColliders}/${report.limits.maxNodes} active colliders with tolerance ${report.limits.tolerance}.`,
    report.failures.length > 0
      ? '\nFailures:\n' + report.failures.map(formatFinding).join('\n')
      : '\nFailures: none',
    report.warnings.length > 0
      ? '\nWarnings:\n' + report.warnings.map(formatFinding).join('\n')
      : '\nWarnings: none',
    '\nConservative policy: ambiguous, isolated, outside-navmesh, and anonymous provenance cases are warnings unless an explicit strict flag is enabled.',
  ].join('\n');

export const runColliderRedundancyGateCli = async (args: readonly string[]) => {
  const options = parseColliderRedundancyGateArgs(args);
  const colliders = await collectRuntimeColliders({
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
  });
  const report = evaluateColliderRedundancy(colliders, options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${formatColliderRedundancyGateReport(report)}\n`
  );
  if (!report.passed) process.exitCode = 1;
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
      process.stderr.write(`Unable to inspect runtime colliders: ${message}\n`);
      process.exitCode = 1;
    }
  );
}
