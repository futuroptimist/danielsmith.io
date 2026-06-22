import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { auditColliderGeometry } from './colliderGeometryAudit';
import {
  findColliderMatches,
  formatOptional,
  type ColliderInspectQuery,
} from './colliderInspect';
import {
  collectRuntimePageData,
  type RuntimeColliderMetadata,
} from './colliderRuntimeCollector';

export type ReachabilityClassification =
  | 'directly-load-bearing'
  | 'dominated'
  | 'outside-reachable-navmesh'
  | 'visual-only-by-policy'
  | 'secondary-backstop'
  | 'ambiguous';

type Point = { x: number; z: number; floorId?: string };
type ApproachResult = {
  direction: string;
  target: Point;
  reachable: boolean;
  firstBlockers: string[];
};

export type ColliderReachabilityAuditReport = {
  candidate?: RuntimeColliderMetadata;
  sourcePolicy?: { sourceId: string; collision: 'none'; rationale: string };
  classification: ReachabilityClassification;
  limits: {
    gridResolution: number;
    maximumExploredNodes: number;
    testedStarts: Point[];
    testedApproachSamples: Point[];
  };
  approaches: ApproachResult[];
  dominatingColliders: Array<{ id: string; sourceId?: string; name: string }>;
  geometryClassification?: string;
  note: string;
};

export type ColliderReachabilityAuditOptions = {
  query: ColliderInspectQuery;
  json: boolean;
  gridResolution: number;
  maxNodes: number;
};

const VISUAL_ONLY_POLICIES = new Map([
  [
    'ground.livingRoom.mediaWall.futuroptimist',
    'Wall-mounted media component intentionally has no floor-level interaction footprint.',
  ],
]);

const round = (value: number) => Number(value.toFixed(3));

export const parseColliderReachabilityAuditArgs = (
  args: readonly string[]
): ColliderReachabilityAuditOptions => {
  let query: ColliderInspectQuery | undefined;
  let json = false;
  let gridResolution = 0.5;
  let maxNodes = 1_800;
  const readValue = (index: number, flag: string) => {
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
    if (arg === '--grid-resolution' || arg === '--max-nodes') {
      const value = Number(readValue(index, arg));
      if (!Number.isFinite(value) || value <= 0)
        throw new Error(`${arg} must be positive.`);
      if (arg === '--grid-resolution') gridResolution = value;
      else maxNodes = Math.floor(value);
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
  return { query, json, gridResolution, maxNodes };
};

export const classifyReachabilityEvidence = (
  candidate: RuntimeColliderMetadata | undefined,
  approaches: readonly ApproachResult[],
  visualOnly?: { sourceId: string; rationale: string }
): Pick<
  ColliderReachabilityAuditReport,
  'classification' | 'dominatingColliders'
> => {
  if (visualOnly)
    return { classification: 'visual-only-by-policy', dominatingColliders: [] };
  if (candidate?.intent === 'secondary-backstop') {
    return { classification: 'secondary-backstop', dominatingColliders: [] };
  }
  const reachable = approaches.filter((approach) => approach.reachable);
  if (
    reachable.some((approach) =>
      approach.firstBlockers.includes(candidate?.name ?? '')
    )
  ) {
    return { classification: 'directly-load-bearing', dominatingColliders: [] };
  }
  if (reachable.length === 0)
    return {
      classification: 'outside-reachable-navmesh',
      dominatingColliders: [],
    };
  const blockers = new Set(
    reachable.flatMap((approach) => approach.firstBlockers)
  );
  blockers.delete(candidate?.name ?? '');
  if (
    blockers.size > 0 &&
    reachable.every((approach) => approach.firstBlockers.length > 0)
  ) {
    return { classification: 'dominated', dominatingColliders: [] };
  }
  return { classification: 'ambiguous', dominatingColliders: [] };
};

const collectReachability = async (
  candidate: RuntimeColliderMetadata,
  options: ColliderReachabilityAuditOptions
): Promise<ApproachResult[]> =>
  collectRuntimePageData(async (page) =>
    page.evaluate(
      ({ candidate: nextCandidate, gridResolution, maxNodes }) => {
        type FloorId = 'ground' | 'upper';
        type World = {
          canOccupyPosition(target: {
            x: number;
            z: number;
            floorId?: FloorId;
          }): boolean;
          movePlayerTo(target: {
            x: number;
            z: number;
            floorId?: FloorId;
          }): void;
          stepPlayerForTest(step: { dx: number; dz: number }): {
            movedX: boolean;
            movedZ: boolean;
            blockedBy?: string[];
          };
        };
        const world = (window as Window & { portfolio?: { world?: World } })
          .portfolio?.world;
        if (!world)
          throw new Error('World API unavailable for reachability audit.');
        const floorId = nextCandidate.floor === 'upper' ? 'upper' : 'ground';
        const starts = [
          { x: 0, z: 0, floorId },
          { x: -3, z: 0, floorId },
          { x: 3, z: 0, floorId },
          { x: 0, z: -3, floorId },
          { x: 0, z: 3, floorId },
          { x: 0, z: 6, floorId },
          { x: 0, z: 18, floorId },
          { x: 0, z: 24, floorId },
        ].filter((point) => world.canOccupyPosition(point));
        const b = nextCandidate.bounds;
        const offset = 0.42;
        const approaches = [
          {
            direction: 'west',
            target: { x: b.minX - offset, z: (b.minZ + b.maxZ) / 2, floorId },
          },
          {
            direction: 'east',
            target: { x: b.maxX + offset, z: (b.minZ + b.maxZ) / 2, floorId },
          },
          {
            direction: 'north',
            target: { x: (b.minX + b.maxX) / 2, z: b.minZ - offset, floorId },
          },
          {
            direction: 'south',
            target: { x: (b.minX + b.maxX) / 2, z: b.maxZ + offset, floorId },
          },
        ];
        const key = (point: { x: number; z: number }) =>
          `${Math.round(point.x / gridResolution)},${Math.round(point.z / gridResolution)}`;
        const trace = (
          start: { x: number; z: number; floorId: FloorId },
          target: { x: number; z: number; floorId: FloorId }
        ) => {
          const queue = [start];
          const seen = new Set([key(start)]);
          const parent = new Map<
            string,
            { x: number; z: number; floorId: FloorId }
          >();
          for (
            let head = 0;
            head < queue.length && seen.size < maxNodes;
            head += 1
          ) {
            const current = queue[head];
            if (
              Math.hypot(current.x - target.x, current.z - target.z) <=
              gridResolution
            ) {
              const path = [target, current];
              let cursor = current;
              while (parent.has(key(cursor))) {
                cursor = parent.get(key(cursor))!;
                path.push(cursor);
              }
              return path.reverse();
            }
            for (const [dx, dz] of [
              [gridResolution, 0],
              [-gridResolution, 0],
              [0, gridResolution],
              [0, -gridResolution],
            ]) {
              const next = { x: current.x + dx, z: current.z + dz, floorId };
              const nextKey = key(next);
              if (seen.has(nextKey) || !world.canOccupyPosition(next)) continue;
              seen.add(nextKey);
              parent.set(nextKey, current);
              queue.push(next);
            }
          }
          return null;
        };
        return approaches.map((approach) => {
          for (const start of starts) {
            const path = trace(start, approach.target);
            if (!path) continue;
            world.movePlayerTo(start);
            let blockers: string[] = [];
            for (const point of path.slice(1)) {
              const pos = path[path.indexOf(point) - 1];
              const result = world.stepPlayerForTest({
                dx: point.x - pos.x,
                dz: point.z - pos.z,
              });
              blockers = result.blockedBy ?? [];
              if (blockers.length > 0)
                return {
                  ...approach,
                  reachable: true,
                  firstBlockers: blockers,
                };
            }
            const center = {
              x: (b.minX + b.maxX) / 2,
              z: (b.minZ + b.maxZ) / 2,
            };
            const result = world.stepPlayerForTest({
              dx: Math.max(-0.3, Math.min(0.3, center.x - approach.target.x)),
              dz: Math.max(-0.3, Math.min(0.3, center.z - approach.target.z)),
            });
            return {
              ...approach,
              reachable: true,
              firstBlockers: result.blockedBy ?? [],
            };
          }
          return { ...approach, reachable: false, firstBlockers: [] };
        });
      },
      {
        candidate,
        gridResolution: options.gridResolution,
        maxNodes: options.maxNodes,
      }
    )
  );

export const auditColliderReachability = async (
  colliders: readonly RuntimeColliderMetadata[],
  options: ColliderReachabilityAuditOptions
): Promise<ColliderReachabilityAuditReport[]> => {
  const visualRationale =
    options.query.kind === 'source-id'
      ? VISUAL_ONLY_POLICIES.get(options.query.value)
      : undefined;
  const matches = findColliderMatches(colliders, options.query);
  if (matches.length === 0 && visualRationale) {
    return [
      {
        sourcePolicy: {
          sourceId: options.query.value,
          collision: 'none',
          rationale: visualRationale,
        },
        classification: 'visual-only-by-policy',
        limits: {
          gridResolution: options.gridResolution,
          maximumExploredNodes: options.maxNodes,
          testedStarts: [],
          testedApproachSamples: [],
        },
        approaches: [],
        dominatingColliders: [],
        note: 'Source policy intentionally emits no runtime collider.',
      },
    ];
  }
  if (matches.length === 0)
    throw new Error(
      `No collider matched ${options.query.kind} "${options.query.value}".`
    );
  if (options.query.kind !== 'source-id' && matches.length > 1) {
    throw new Error(
      `Ambiguous collider ${options.query.kind} "${options.query.value}" matched ${matches.length} records: ${matches.map((match) => match.id).join(', ')}.`
    );
  }
  const geometry = auditColliderGeometry(colliders, {
    ...options,
    tolerance: 0.05,
    samples: 12,
  });
  return Promise.all(
    matches.map(async (candidate, index) => {
      const approaches = await collectReachability(candidate, options);
      const starts = [
        { x: 0, z: 0, floorId: candidate.floor },
        { x: -3, z: 0, floorId: candidate.floor },
        { x: 3, z: 0, floorId: candidate.floor },
        { x: 0, z: -3, floorId: candidate.floor },
        { x: 0, z: 3, floorId: candidate.floor },
        { x: 0, z: 6, floorId: candidate.floor },
        { x: 0, z: 18, floorId: candidate.floor },
        { x: 0, z: 24, floorId: candidate.floor },
      ];
      const classification = classifyReachabilityEvidence(
        candidate,
        approaches
      );
      const blockerNames = new Set(
        approaches.flatMap((approach) => approach.firstBlockers)
      );
      blockerNames.delete(candidate.name);
      const dominatingColliders = [...blockerNames]
        .map((name) => colliders.find((collider) => collider.name === name))
        .filter((collider): collider is RuntimeColliderMetadata =>
          Boolean(collider)
        )
        .map((collider) => ({
          id: collider.id,
          sourceId: collider.sourceId,
          name: collider.name,
        }));
      return {
        candidate,
        classification: classification.classification,
        limits: {
          gridResolution: options.gridResolution,
          maximumExploredNodes: options.maxNodes,
          testedStarts: starts,
          testedApproachSamples: approaches.map((approach) => approach.target),
        },
        approaches: approaches.map((approach) => ({
          ...approach,
          target: {
            ...approach.target,
            x: round(approach.target.x),
            z: round(approach.target.z),
          },
        })),
        dominatingColliders:
          classification.classification === 'dominated'
            ? dominatingColliders
            : [],
        geometryClassification: geometry[index]?.classification,
        note: 'Opt-in evidence only; screenshots and maintainer judgment may override ambiguity.',
      };
    })
  );
};

export const formatColliderReachabilityAuditReports = (
  reports: readonly ColliderReachabilityAuditReport[]
): string =>
  reports
    .map((report) =>
      [
        report.candidate
          ? `Candidate ${report.candidate.id}`
          : `Source policy ${report.sourcePolicy?.sourceId}`,
        `  runtime name: ${formatOptional(report.candidate?.name)}`,
        `  source ID: ${formatOptional(report.candidate?.sourceId ?? report.sourcePolicy?.sourceId)}`,
        `  classification: ${report.classification}`,
        `  geometry evidence: ${formatOptional(report.geometryClassification)}`,
        `  limits: grid ${report.limits.gridResolution}, max nodes ${report.limits.maximumExploredNodes}, starts ${report.limits.testedStarts.length}, approaches ${report.limits.testedApproachSamples.length}`,
        report.sourcePolicy
          ? `  rationale: ${report.sourcePolicy.rationale}`
          : undefined,
        'Approaches:',
        report.approaches.length > 0
          ? report.approaches
              .map(
                (approach) =>
                  `  - ${approach.direction}: ${approach.reachable ? 'reachable' : 'unreached'}, first blockers: ${approach.firstBlockers.join(', ') || 'none'}`
              )
              .join('\n')
          : '  - none',
        'Dominating colliders:',
        report.dominatingColliders.length > 0
          ? report.dominatingColliders
              .map(
                (collider) =>
                  `  - ${collider.id} ${collider.name} (${formatOptional(collider.sourceId)})`
              )
              .join('\n')
          : '  - none',
        `  note: ${report.note}`,
      ]
        .filter((line): line is string => typeof line === 'string')
        .join('\n')
    )
    .join('\n\n');

export const runColliderReachabilityAuditCli = async (
  args: readonly string[]
) => {
  const options = parseColliderReachabilityAuditArgs(args);
  const visualRationale =
    options.query.kind === 'source-id'
      ? VISUAL_ONLY_POLICIES.get(options.query.value)
      : undefined;
  if (visualRationale) {
    const reports = await auditColliderReachability([], options);
    process.stdout.write(
      options.json
        ? `${JSON.stringify(reports, null, 2)}\n`
        : `${formatColliderReachabilityAuditReports(reports)}\n`
    );
    return;
  }
  const colliders = await collectRuntimePageData(async (page) =>
    page.evaluate(() => {
      const api = (
        window as Window & {
          portfolio?: {
            debugColliders?: { getColliders(): RuntimeColliderMetadata[] };
          };
        }
      ).portfolio?.debugColliders;
      if (!api)
        throw new Error('window.portfolio.debugColliders is unavailable.');
      return api.getColliders();
    })
  );
  const reports = await auditColliderReachability(colliders, options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(reports, null, 2)}\n`
      : `${formatColliderReachabilityAuditReports(reports)}\n`
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
  runColliderReachabilityAuditCli(process.argv.slice(2)).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  );
}
