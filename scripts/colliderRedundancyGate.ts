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
  maxNodes: number;
  timeoutMs: number;
  baseUrl?: string;
  failOnAnonymous: boolean;
};

export type ColliderRedundancyFinding = {
  severity: 'failure' | 'warning';
  collider: RuntimeColliderMetadata;
  classification: 'exact-duplicate' | 'fully-contained' | 'anonymous-generated';
  evidence: string;
  dominatingColliders: RuntimeColliderMetadata[];
  remediation: string;
};

export type ColliderRedundancyGateReport = {
  ok: boolean;
  summary: {
    inspectedColliders: number;
    failures: number;
    warnings: number;
    maxNodes: number;
    tolerance: number;
  };
  findings: ColliderRedundancyFinding[];
};

const INTENTIONAL_NON_REDUNDANT_INTENTS = new Set([
  'secondary-backstop',
  'visual-only-by-policy',
]);

const DEFAULT_OPTIONS: ColliderRedundancyGateOptions = {
  json: false,
  tolerance: 0.05,
  maxNodes: 3_000,
  timeoutMs: 120_000,
  failOnAnonymous: false,
};

const readValue = (args: readonly string[], index: number, flag: string) => {
  const value = args[index + 1];
  if (!value || value.startsWith('--'))
    throw new Error(`${flag} requires a value.`);
  return value;
};

const parsePositiveNumber = (
  args: readonly string[],
  index: number,
  flag: string
) => {
  const value = Number(readValue(args, index, flag));
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${flag} must be positive.`);
  return value;
};

const parsePositiveInteger = (
  args: readonly string[],
  index: number,
  flag: string
) => {
  const rawValue = readValue(args, index, flag);
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`${flag} must be a positive integer.`);
  return value;
};

export const parseColliderRedundancyGateArgs = (
  args: readonly string[]
): ColliderRedundancyGateOptions => {
  const options = { ...DEFAULT_OPTIONS };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--fail-on-anonymous') {
      options.failOnAnonymous = true;
    } else if (
      arg === '--tolerance' ||
      arg === '--max-nodes' ||
      arg === '--timeout-ms'
    ) {
      if (arg === '--tolerance') {
        options.tolerance = parsePositiveNumber(args, index, arg);
      }
      if (arg === '--max-nodes') {
        options.maxNodes = parsePositiveInteger(args, index, arg);
      }
      if (arg === '--timeout-ms') {
        options.timeoutMs = parsePositiveInteger(args, index, arg);
      }
      index += 1;
    } else if (arg === '--base-url') {
      options.baseUrl = readValue(args, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
};

const isSourceBacked = (collider: RuntimeColliderMetadata): boolean =>
  typeof collider.sourceId === 'string' && collider.sourceId.length > 0;

const GENERATED_RUNTIME_NAME_PATTERN = /^(ground|static|upper)-collider-\d+$/;

const hasSourceBackedStableName = (
  collider: RuntimeColliderMetadata
): boolean =>
  isSourceBacked(collider) &&
  !GENERATED_RUNTIME_NAME_PATTERN.test(collider.name);

const hasExplicitRuntimeIdentity = (
  collider: RuntimeColliderMetadata
): boolean =>
  collider.debugId === collider.id || hasSourceBackedStableName(collider);

const isConcreteSourceBacked = (collider: RuntimeColliderMetadata): boolean =>
  isSourceBacked(collider) && hasExplicitRuntimeIdentity(collider);

const isAnonymousGenerated = (collider: RuntimeColliderMetadata): boolean =>
  !isSourceBacked(collider) || !hasExplicitRuntimeIdentity(collider);

const isIntentionalException = (collider: RuntimeColliderMetadata): boolean =>
  INTENTIONAL_NON_REDUNDANT_INTENTS.has(collider.intent ?? '');

const sameReviewGroup = (
  candidate: RuntimeColliderMetadata,
  other: RuntimeColliderMetadata
): boolean =>
  candidate.id !== other.id &&
  floorsCanOverlap(candidate.floor, other.floor) &&
  candidate.category === other.category;

const sameSourceSemantics = (
  left: RuntimeColliderMetadata,
  right: RuntimeColliderMetadata
): boolean => {
  if (left.sourceId && right.sourceId) return left.sourceId === right.sourceId;
  return (
    left.sourceType === right.sourceType &&
    left.intent === right.intent &&
    left.role === right.role &&
    left.purpose === right.purpose
  );
};

const byStableIdentity = (
  left: RuntimeColliderMetadata,
  right: RuntimeColliderMetadata
): number =>
  left.id.localeCompare(right.id) ||
  left.name.localeCompare(right.name) ||
  (left.sourceId ?? '').localeCompare(right.sourceId ?? '');

export const evaluateColliderRedundancy = (
  colliders: readonly RuntimeColliderMetadata[],
  options: Pick<
    ColliderRedundancyGateOptions,
    'tolerance' | 'maxNodes' | 'failOnAnonymous'
  >
): ColliderRedundancyGateReport => {
  const inspected = colliders.slice(0, options.maxNodes).sort(byStableIdentity);
  const findings: ColliderRedundancyFinding[] = [];

  for (const candidate of inspected) {
    if (isAnonymousGenerated(candidate)) {
      findings.push({
        severity: options.failOnAnonymous ? 'failure' : 'warning',
        collider: candidate,
        classification: 'anonymous-generated',
        evidence:
          'Collider is missing source metadata or still uses a generated runtime identity.',
        dominatingColliders: [],
        remediation:
          'Add sourceId metadata and a stable source-backed debug name or debugId so future audits can distinguish intentional colliders from generated runtime records.',
      });
    }

    if (!isConcreteSourceBacked(candidate) || isIntentionalException(candidate))
      continue;
    const others = inspected.filter(
      (other) =>
        sameReviewGroup(candidate, other) &&
        isConcreteSourceBacked(other) &&
        !isIntentionalException(other)
    );
    const exactDuplicates = others.filter(
      (other) =>
        rectanglesEqual(candidate.bounds, other.bounds, options.tolerance) &&
        sameSourceSemantics(candidate, other)
    );
    const canonical = [candidate, ...exactDuplicates].sort(byStableIdentity)[0];
    if (exactDuplicates.length > 0 && canonical.id !== candidate.id) {
      findings.push({
        severity: 'failure',
        collider: candidate,
        classification: 'exact-duplicate',
        evidence:
          'Active explicit source-backed collider has equivalent floor/category/source semantics and identical bounds to another explicit active collider.',
        dominatingColliders: exactDuplicates,
        remediation:
          'Remove the duplicate collider, merge the source policy, or mark an intentional secondary/backstop collider with explicit metadata.',
      });
      continue;
    }

    const containers = others.filter(
      (other) =>
        !rectanglesEqual(candidate.bounds, other.bounds, options.tolerance) &&
        containsRectangle(other.bounds, candidate.bounds, options.tolerance)
    );
    if (containers.length > 0) {
      findings.push({
        severity: 'failure',
        collider: candidate,
        classification: 'fully-contained',
        evidence:
          'Active explicit source-backed collider is fully contained by explicit source-backed collider(s) in the same floor/category review group.',
        dominatingColliders: containers,
        remediation:
          'Remove the contained collider, document why it is a secondary/backstop collider, or add missing source metadata to clarify intent.',
      });
    }
  }

  const failures = findings.filter(
    (finding) => finding.severity === 'failure'
  ).length;
  const warnings = findings.length - failures;
  return {
    ok: failures === 0,
    summary: {
      inspectedColliders: inspected.length,
      failures,
      warnings,
      maxNodes: options.maxNodes,
      tolerance: options.tolerance,
    },
    findings,
  };
};

const formatCollider = (collider: RuntimeColliderMetadata): string =>
  `${collider.id} ${collider.name} (${formatOptional(collider.sourceId)})`;

export const formatColliderRedundancyGateReport = (
  report: ColliderRedundancyGateReport
): string => {
  const lines = [
    report.ok
      ? 'Collider redundancy gate passed.'
      : 'Collider redundancy gate failed: high-confidence redundant colliders found.',
    `Inspected ${report.summary.inspectedColliders}/${report.summary.maxNodes} colliders with tolerance ${report.summary.tolerance}.`,
    `Failures: ${report.summary.failures}; warnings: ${report.summary.warnings}.`,
  ];
  if (report.findings.length === 0) return `${lines.join('\n')}\n`;
  const textFindings = report.ok
    ? report.findings.slice(0, 20)
    : report.findings.filter((finding) => finding.severity === 'failure');
  lines.push('', report.ok ? 'Warnings (first 20):' : 'Failures:');
  for (const finding of textFindings) {
    lines.push(
      `- [${finding.severity}] ${finding.classification}: ${formatCollider(finding.collider)}`,
      `  evidence: ${finding.evidence}`,
      `  dominating colliders: ${finding.dominatingColliders.map(formatCollider).join('; ') || 'none'}`,
      `  remediation: ${finding.remediation}`
    );
  }
  if (report.ok && report.findings.length > textFindings.length) {
    lines.push(
      `- ${report.findings.length - textFindings.length} additional warning(s) omitted from text output; rerun with --json for complete diagnostics.`
    );
  }
  return `${lines.join('\n')}\n`;
};

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
    throw new Error(`Unable to inspect runtime colliders: ${message}`, {
      cause: error,
    });
  }
  const report = evaluateColliderRedundancy(colliders, options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : formatColliderRedundancyGateReport(report)
  );
  if (!report.ok) process.exitCode = 1;
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
      if (message.startsWith('Unable to inspect runtime colliders:')) {
        process.stderr.write(
          'Run with --timeout-ms to allow a slower local Vite startup, or --base-url to inspect an already-running preview.\n'
        );
      }
      process.exitCode = 1;
    }
  );
}
