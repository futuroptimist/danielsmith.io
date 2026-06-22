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
};

export type ColliderRedundancyClassification =
  | 'exact-duplicate'
  | 'fully-contained'
  | 'anonymous-generated';

export type ColliderRedundancyDiagnostic = {
  severity: 'failure' | 'warning';
  classification: ColliderRedundancyClassification;
  candidate: RuntimeColliderMetadata;
  evidence: Array<{
    collider: RuntimeColliderMetadata;
    reason: string;
  }>;
  message: string;
  remediation: string;
};

export type ColliderRedundancyGateReport = {
  ok: boolean;
  limits: {
    tolerance: number;
    timeoutMs: number;
    maxNodes: number;
    failOnAnonymous: boolean;
    inspectedColliders: number;
    truncated: boolean;
  };
  failures: ColliderRedundancyDiagnostic[];
  warnings: ColliderRedundancyDiagnostic[];
  note: string;
};

const NOTE =
  'Conservative CI gate: ambiguous, isolated, anonymous, and source-less cases warn only unless explicitly configured otherwise.';
const MAX_FORMATTED_WARNINGS = 12;

const INTENTIONAL_INTENTS = new Set([
  'secondary-backstop',
  'visual-only-by-policy',
  'physical-boundary',
]);

const hasSource = (collider: Pick<RuntimeColliderMetadata, 'sourceId'>) =>
  typeof collider.sourceId === 'string' && collider.sourceId.length > 0;

const isGeneratedOrAnonymous = (collider: RuntimeColliderMetadata): boolean =>
  !hasSource(collider) || !collider.debugId || collider.debugId !== collider.id;

const isIntentionalException = (collider: RuntimeColliderMetadata): boolean =>
  Boolean(collider.intent && INTENTIONAL_INTENTS.has(collider.intent));

const sameHighConfidenceReviewGroup = (
  candidate: RuntimeColliderMetadata,
  other: RuntimeColliderMetadata
): boolean =>
  candidate.id !== other.id &&
  floorsCanOverlap(candidate.floor, other.floor) &&
  candidate.category === other.category &&
  hasSource(candidate) &&
  hasSource(other) &&
  !isIntentionalException(candidate) &&
  !isIntentionalException(other);

const sameSourceSemantics = (
  candidate: RuntimeColliderMetadata,
  other: RuntimeColliderMetadata
): boolean =>
  candidate.floor === other.floor &&
  candidate.category === other.category &&
  candidate.sourceId === other.sourceId;

const byCandidateId = (
  left: ColliderRedundancyDiagnostic,
  right: ColliderRedundancyDiagnostic
) =>
  left.candidate.id.localeCompare(right.candidate.id) ||
  left.classification.localeCompare(right.classification);

const makeDuplicateDiagnostic = (
  candidate: RuntimeColliderMetadata,
  duplicates: RuntimeColliderMetadata[]
): ColliderRedundancyDiagnostic => ({
  severity: 'failure',
  classification: 'exact-duplicate',
  candidate,
  evidence: duplicates.map((collider) => ({
    collider,
    reason: 'same source-backed floor/category/sourceId and equivalent bounds',
  })),
  message: `Collider ${candidate.id} duplicates another active source-backed collider.`,
  remediation:
    'Remove the duplicate collider, or mark one source as an intentional secondary/backstop policy if it really needs to remain.',
});

const makeContainedDiagnostic = (
  candidate: RuntimeColliderMetadata,
  containers: RuntimeColliderMetadata[]
): ColliderRedundancyDiagnostic => ({
  severity: 'failure',
  classification: 'fully-contained',
  candidate,
  evidence: containers.map((collider) => ({
    collider,
    reason:
      'candidate bounds are fully contained by this source-backed collider',
  })),
  message: `Collider ${candidate.id} is fully contained by source-backed collider evidence.`,
  remediation:
    'Remove the contained collider, or mark it with intentional secondary/backstop source metadata if it is load-bearing by design.',
});

const makeAnonymousDiagnostic = (
  collider: RuntimeColliderMetadata,
  failOnAnonymous: boolean
): ColliderRedundancyDiagnostic => ({
  severity: failOnAnonymous ? 'failure' : 'warning',
  classification: 'anonymous-generated',
  candidate: collider,
  evidence: [],
  message: `Collider ${collider.id} is missing source provenance or uses a generated runtime ID.`,
  remediation:
    'Add stable sourceId/debugId metadata before using CI to make redundancy decisions about this collider.',
});

export const parseColliderRedundancyGateArgs = (
  args: readonly string[]
): ColliderRedundancyGateOptions => {
  let json = false;
  let tolerance = 0.05;
  let timeoutMs = 120_000;
  let maxNodes = 3_000;
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
    else if (
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
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { json, tolerance, timeoutMs, maxNodes, failOnAnonymous };
};

export const evaluateColliderRedundancy = (
  colliders: readonly RuntimeColliderMetadata[],
  options: ColliderRedundancyGateOptions
): ColliderRedundancyGateReport => {
  const inspected = colliders.slice(0, options.maxNodes);
  const failures: ColliderRedundancyDiagnostic[] = [];
  const warnings: ColliderRedundancyDiagnostic[] = [];

  for (const candidate of inspected) {
    if (isGeneratedOrAnonymous(candidate)) {
      const diagnostic = makeAnonymousDiagnostic(
        candidate,
        options.failOnAnonymous
      );
      (diagnostic.severity === 'failure' ? failures : warnings).push(
        diagnostic
      );
    }

    const comparable = inspected.filter((other) =>
      sameHighConfidenceReviewGroup(candidate, other)
    );
    const duplicates = comparable.filter(
      (other) =>
        candidate.id.localeCompare(other.id) < 0 &&
        sameSourceSemantics(candidate, other) &&
        rectanglesEqual(candidate.bounds, other.bounds, options.tolerance)
    );
    if (duplicates.length > 0)
      failures.push(makeDuplicateDiagnostic(candidate, duplicates));

    const containers = comparable.filter(
      (other) =>
        !sameSourceSemantics(candidate, other) &&
        rectangleArea(other.bounds) > rectangleArea(candidate.bounds) &&
        containsRectangle(other.bounds, candidate.bounds, options.tolerance)
    );
    if (containers.length > 0)
      failures.push(makeContainedDiagnostic(candidate, containers));
  }

  failures.sort(byCandidateId);
  warnings.sort(byCandidateId);
  return {
    ok: failures.length === 0,
    limits: {
      tolerance: options.tolerance,
      timeoutMs: options.timeoutMs,
      maxNodes: options.maxNodes,
      failOnAnonymous: options.failOnAnonymous,
      inspectedColliders: inspected.length,
      truncated: colliders.length > inspected.length,
    },
    failures,
    warnings,
    note: NOTE,
  };
};

const formatCollider = (collider: RuntimeColliderMetadata) =>
  `${collider.id} ${collider.name} (sourceId: ${formatOptional(collider.sourceId)}, intent: ${formatOptional(collider.intent)})`;

const formatDiagnostic = (diagnostic: ColliderRedundancyDiagnostic): string =>
  [
    `${diagnostic.severity.toUpperCase()}: ${diagnostic.classification}`,
    `  candidate: ${formatCollider(diagnostic.candidate)}`,
    `  classification: ${diagnostic.classification}`,
    `  message: ${diagnostic.message}`,
    '  evidence:',
    diagnostic.evidence.length > 0
      ? diagnostic.evidence
          .map(
            (item) => `    - ${formatCollider(item.collider)}; ${item.reason}`
          )
          .join('\n')
      : '    - none',
    `  suggested remediation: ${diagnostic.remediation}`,
  ].join('\n');

export const formatColliderRedundancyGateReport = (
  report: ColliderRedundancyGateReport
): string =>
  [
    report.ok
      ? 'Collider redundancy gate passed.'
      : 'Collider redundancy gate failed.',
    `Inspected ${report.limits.inspectedColliders} collider(s) with tolerance ${report.limits.tolerance}, timeout ${report.limits.timeoutMs}ms, max nodes ${report.limits.maxNodes}.`,
    report.limits.truncated
      ? 'WARNING: Collider list was truncated by --max-nodes; increase the limit for full coverage.'
      : undefined,
    `Failures: ${report.failures.length}`,
    report.failures.map(formatDiagnostic).join('\n\n'),
    `Warnings: ${report.warnings.length}`,
    report.warnings
      .slice(0, MAX_FORMATTED_WARNINGS)
      .map(formatDiagnostic)
      .join('\n\n'),
    report.warnings.length > MAX_FORMATTED_WARNINGS
      ? `... ${report.warnings.length - MAX_FORMATTED_WARNINGS} additional warning(s) omitted from text output; rerun with --json for full diagnostics.`
      : undefined,
    `Note: ${report.note}`,
  ]
    .filter((part) => part !== undefined && part !== '')
    .join('\n\n');

export const runColliderRedundancyGateCli = async (args: readonly string[]) => {
  const options = parseColliderRedundancyGateArgs(args);
  let colliders: RuntimeColliderMetadata[];
  try {
    colliders = await collectRuntimeColliders({ timeoutMs: options.timeoutMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to inspect runtime colliders within ${options.timeoutMs}ms: ${message}`
    );
  }
  const report = evaluateColliderRedundancy(colliders, options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${formatColliderRedundancyGateReport(report)}\n`
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
      process.exitCode = 1;
    }
  );
}
