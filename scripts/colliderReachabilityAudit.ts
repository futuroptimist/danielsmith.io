import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';

import { FUTUROPTIMIST_MEDIA_WALL_POLICY } from '../src/scene/level/mediaWallPolicy';
import { UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES } from '../src/scene/level/upperStairwellLandingSegments';

import { auditColliderGeometry } from './colliderGeometryAudit';
import {
  findColliderMatches,
  formatOptional,
  type ColliderInspectQuery,
} from './colliderInspect';
import {
  type RuntimeColliderMetadata,
  withRuntimePage,
} from './colliderRuntimeCollector';

export type ReachabilityClassification =
  | 'directly-load-bearing'
  | 'dominated'
  | 'outside-reachable-navmesh'
  | 'visual-only-by-policy'
  | 'secondary-backstop'
  | 'ambiguous';

export type ColliderReachabilityAuditOptions = {
  query: ColliderInspectQuery;
  json: boolean;
  gridResolution: number;
  maxExploredNodes: number;
  timeoutMs: number;
  baseUrl?: string;
};

type ApproachDirection = 'north' | 'south' | 'east' | 'west';

type RuntimeApproachResult = {
  direction: ApproachDirection;
  sample: { x: number; z: number; floorId: string };
  status: 'candidate-first' | 'blocked-by-other' | 'unreachable' | 'ambiguous';
  start?: { x: number; z: number; floorId: string };
  blockers: string[];
  blockerSourceIds: string[];
  exploredNodes: number;
  pathLength: number;
  message?: string;
};

export type ReachabilityAggregationInput = {
  candidate: Pick<RuntimeColliderMetadata, 'id' | 'sourceId' | 'intent'>;
  approaches: readonly Pick<RuntimeApproachResult, 'status' | 'blockers'>[];
  visualOnlyRationale?: string;
};

export type ColliderReachabilityAuditReport = {
  candidate?: RuntimeColliderMetadata;
  sourcePolicy?: { sourceId: string; collision: 'none'; rationale: string };
  classification: ReachabilityClassification;
  limits: {
    gridResolution: number;
    maximumExploredNodes: number;
    testedStarts: number;
    testedApproachSamples: number;
  };
  approaches: RuntimeApproachResult[];
  dominatingColliders: Array<
    Pick<RuntimeColliderMetadata, 'id' | 'sourceId' | 'name'>
  >;
  staticEvidence?: ReturnType<typeof auditColliderGeometry>[number];
  note: string;
};

const SOURCE_COLLISION_POLICIES = [
  FUTUROPTIMIST_MEDIA_WALL_POLICY,
  ...UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES,
];

const VISUAL_ONLY_POLICIES = SOURCE_COLLISION_POLICIES.flatMap((policy) =>
  policy.collision.collision === 'none'
    ? [
        {
          sourceId: policy.sourceId,
          collision: policy.collision.collision,
          rationale: policy.collision.rationale,
        },
      ]
    : []
);

export const parseColliderReachabilityAuditArgs = (
  args: readonly string[]
): ColliderReachabilityAuditOptions => {
  let query: ColliderInspectQuery | undefined;
  let json = false;
  let gridResolution = 0.55;
  let maxExploredNodes = 1400;
  let timeoutMs = 120_000;
  let baseUrl: string | undefined;
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
    } else if (arg === '--id' || arg === '--source-id' || arg === '--name') {
      if (query)
        throw new Error('Provide exactly one of --id, --source-id, or --name.');
      query = {
        kind: arg.slice(2) as ColliderInspectQuery['kind'],
        value: readValue(index, arg),
      };
      index += 1;
    } else if (
      arg === '--grid-resolution' ||
      arg === '--max-nodes' ||
      arg === '--timeout-ms'
    ) {
      const value = Number(readValue(index, arg));
      if (!Number.isFinite(value) || value <= 0)
        throw new Error(`${arg} must be positive.`);
      if (arg === '--grid-resolution') gridResolution = value;
      if (arg === '--max-nodes') maxExploredNodes = Math.floor(value);
      if (arg === '--timeout-ms') timeoutMs = Math.floor(value);
      index += 1;
    } else if (arg === '--base-url') {
      baseUrl = readValue(index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!query)
    throw new Error('Provide exactly one of --id, --source-id, or --name.');
  return { query, json, gridResolution, maxExploredNodes, timeoutMs, baseUrl };
};

export const classifyReachabilityEvidence = ({
  candidate,
  approaches,
  visualOnlyRationale,
}: ReachabilityAggregationInput): ReachabilityClassification => {
  if (visualOnlyRationale) return 'visual-only-by-policy';
  if (candidate.intent === 'secondary-backstop') return 'secondary-backstop';
  if (approaches.some((approach) => approach.status === 'candidate-first')) {
    return 'directly-load-bearing';
  }
  const reachable = approaches.filter(
    (approach) => approach.status === 'blocked-by-other'
  );
  if (reachable.length > 0 && reachable.length === approaches.length)
    return 'dominated';
  if (
    approaches.length > 0 &&
    approaches.every((approach) => approach.status === 'unreachable')
  ) {
    return 'outside-reachable-navmesh';
  }
  return 'ambiguous';
};

const runRuntimeApproaches = async (
  page: Page,
  candidate: RuntimeColliderMetadata,
  options: ColliderReachabilityAuditOptions
): Promise<{ approaches: RuntimeApproachResult[]; testedStarts: number }> => {
  await page.evaluate(() => {
    (globalThis as typeof globalThis & { __name?: <T>(value: T) => T }).__name =
      (value) => value;
  });
  return page.evaluate(
    ({ candidate: nextCandidate, gridResolution, maxExploredNodes }) => {
      type FloorId = 'ground' | 'upper';
      type World = {
        canOccupyPosition(target: {
          x: number;
          z: number;
          floorId?: FloorId;
        }): boolean;
        movePlayerTo(target: { x: number; z: number; floorId?: FloorId }): void;
        stepPlayerForTest(step: { dx: number; dz: number }): {
          movedX: boolean;
          movedZ: boolean;
          blockedBy?: string[];
        };
        getPlayerPosition(): { x: number; y: number; z: number };
      };
      type DebugApi = {
        getBlockingCollidersAt(target: {
          x: number;
          z: number;
          floorId?: FloorId;
        }): Array<{
          id: string;
          sourceId?: string;
        }>;
      };
      const portfolio = (
        window as typeof window & {
          portfolio?: { world?: World; debugColliders?: DebugApi };
        }
      ).portfolio;
      const world = portfolio?.world;
      const debug = portfolio?.debugColliders;
      if (!world || !debug)
        throw new Error('World/debug collider APIs unavailable.');
      const floorId = (
        nextCandidate.floor === 'upper' ? 'upper' : 'ground'
      ) as FloorId;
      const playerRadius = 0.75;
      const radius = playerRadius;
      const center = {
        x: (nextCandidate.bounds.minX + nextCandidate.bounds.maxX) / 2,
        z: (nextCandidate.bounds.minZ + nextCandidate.bounds.maxZ) / 2,
      };
      const samples = [
        {
          direction: 'north',
          x: center.x,
          z: nextCandidate.bounds.maxZ + radius,
        },
        {
          direction: 'south',
          x: center.x,
          z: nextCandidate.bounds.minZ - radius,
        },
        {
          direction: 'east',
          x: nextCandidate.bounds.maxX + radius,
          z: center.z,
        },
        {
          direction: 'west',
          x: nextCandidate.bounds.minX - radius,
          z: center.z,
        },
      ] as const;
      const startCandidates = [
        world.getPlayerPosition(),
        { x: 0, z: 0 },
        { x: -5, z: -6 },
        { x: 6, z: -7 },
        { x: 0, z: -14 },
        { x: 0, z: -23 },
        { x: 12.4, z: -25.2 },
      ];
      for (let x = center.x - 10; x <= center.x + 10; x += gridResolution * 2) {
        for (
          let z = center.z - 10;
          z <= center.z + 10;
          z += gridResolution * 2
        ) {
          const candidateStart = {
            x: Number(x.toFixed(3)),
            z: Number(z.toFixed(3)),
            floorId,
          };
          if (world.canOccupyPosition(candidateStart)) {
            startCandidates.push(candidateStart);
          }
        }
      }
      const starts = startCandidates
        .map((start) => ({ x: start.x, z: start.z, floorId }))
        .filter(
          (start, index, all) =>
            world.canOccupyPosition(start) &&
            all.findIndex(
              (other) => Math.hypot(other.x - start.x, other.z - start.z) < 0.1
            ) === index
        );
      const key = (x: number, z: number) =>
        `${Math.round(x / gridResolution)},${Math.round(z / gridResolution)}`;
      const snap = (value: number) =>
        Math.round(value / gridResolution) * gridResolution;
      const findPath = (
        start: { x: number; z: number },
        goal: { x: number; z: number }
      ) => {
        const startNode = { x: snap(start.x), z: snap(start.z) };
        const goalKey = key(goal.x, goal.z);
        const queue = [startNode];
        const parents = new Map<string, string>();
        const nodes = new Map([[key(startNode.x, startNode.z), startNode]]);
        parents.set(key(startNode.x, startNode.z), '');
        for (
          let cursor = 0;
          cursor < queue.length && cursor < maxExploredNodes;
          cursor += 1
        ) {
          const node = queue[cursor];
          if (
            key(node.x, node.z) === goalKey ||
            Math.hypot(node.x - goal.x, node.z - goal.z) <= gridResolution
          ) {
            const path = [{ x: goal.x, z: goal.z }];
            let walkKey = key(node.x, node.z);
            while (walkKey && parents.get(walkKey) !== '') {
              const item = nodes.get(walkKey)!;
              path.push(item);
              walkKey = parents.get(walkKey)!;
            }
            return { path: path.reverse(), exploredNodes: cursor + 1 };
          }
          for (const [dx, dz] of [
            [gridResolution, 0],
            [-gridResolution, 0],
            [0, gridResolution],
            [0, -gridResolution],
          ]) {
            const next = {
              x: Number((node.x + dx).toFixed(3)),
              z: Number((node.z + dz).toFixed(3)),
              floorId,
            };
            const nextKey = key(next.x, next.z);
            if (parents.has(nextKey) || !world.canOccupyPosition(next))
              continue;
            parents.set(nextKey, key(node.x, node.z));
            nodes.set(nextKey, next);
            queue.push(next);
          }
        }
        return {
          path: [] as Array<{ x: number; z: number }>,
          exploredNodes: Math.min(queue.length, maxExploredNodes),
        };
      };
      const confirm = (
        start: { x: number; z: number; floorId: FloorId },
        path: Array<{ x: number; z: number }>
      ) => {
        world.movePlayerTo(start);
        const waypoints = [...path, center];
        for (const waypoint of waypoints) {
          for (let step = 0; step < 220; step += 1) {
            const position = world.getPlayerPosition();
            const remainingX = waypoint.x - position.x;
            const remainingZ = waypoint.z - position.z;
            if (Math.hypot(remainingX, remainingZ) < 0.03) break;
            const length = Math.max(0.001, Math.hypot(remainingX, remainingZ));
            const amount = Math.min(0.16, length);
            const dx = (remainingX / length) * amount;
            const dz = (remainingZ / length) * amount;
            const result = world.stepPlayerForTest({ dx, dz });
            const blocked = result.blockedBy ?? [];
            if (blocked.length > 0 || (!result.movedX && !result.movedZ)) {
              const afterStep = world.getPlayerPosition();
              const probe =
                result.movedX || result.movedZ
                  ? { x: afterStep.x + dx, z: afterStep.z + dz, floorId }
                  : { x: position.x + dx, z: position.z + dz, floorId };
              const atPoint = debug.getBlockingCollidersAt(probe);
              return {
                blockers: blocked,
                blockerSourceIds: atPoint
                  .map((item) => item.sourceId)
                  .filter(Boolean) as string[],
              };
            }
          }
        }
        return { blockers: [] as string[], blockerSourceIds: [] as string[] };
      };
      const approaches = samples.map((sample) => {
        const occupied = world.canOccupyPosition({
          x: sample.x,
          z: sample.z,
          floorId,
        });
        if (!occupied) {
          const blockers = debug.getBlockingCollidersAt({
            x: sample.x,
            z: sample.z,
            floorId,
          });
          return {
            direction: sample.direction,
            sample: {
              x: Number(sample.x.toFixed(3)),
              z: Number(sample.z.toFixed(3)),
              floorId,
            },
            status:
              blockers.length === 0
                ? 'unreachable'
                : blockers.some((blocker) => blocker.id === nextCandidate.id)
                  ? 'candidate-first'
                  : 'blocked-by-other',
            blockers: blockers.map((blocker) => blocker.id),
            blockerSourceIds: blockers
              .map((blocker) => blocker.sourceId)
              .filter(Boolean) as string[],
            exploredNodes: 0,
            pathLength: 0,
          };
        }
        let best: RuntimeApproachResult | undefined;
        for (const start of starts) {
          const found = findPath(start, sample);
          if (found.path.length === 0) {
            best = best ?? {
              direction: sample.direction,
              sample: {
                x: Number(sample.x.toFixed(3)),
                z: Number(sample.z.toFixed(3)),
                floorId,
              },
              status: 'unreachable',
              start,
              blockers: [],
              blockerSourceIds: [],
              exploredNodes: found.exploredNodes,
              pathLength: 0,
            };
            continue;
          }
          const blocked = confirm(start, found.path);
          const candidateRefs = [
            nextCandidate.id,
            nextCandidate.name,
            nextCandidate.sourceId,
          ].filter(Boolean);
          const status =
            blocked.blockers.some((blocker) =>
              candidateRefs.includes(blocker)
            ) || blocked.blockerSourceIds.includes(nextCandidate.sourceId ?? '')
              ? 'candidate-first'
              : blocked.blockers.length > 0
                ? 'blocked-by-other'
                : 'ambiguous';
          best = {
            direction: sample.direction,
            sample: {
              x: Number(sample.x.toFixed(3)),
              z: Number(sample.z.toFixed(3)),
              floorId,
            },
            status,
            start,
            blockers: blocked.blockers,
            blockerSourceIds: blocked.blockerSourceIds,
            exploredNodes: found.exploredNodes,
            pathLength: found.path.length,
          };
          if (status === 'candidate-first' || status === 'blocked-by-other')
            break;
        }
        return (
          best ?? {
            direction: sample.direction,
            sample: {
              x: Number(sample.x.toFixed(3)),
              z: Number(sample.z.toFixed(3)),
              floorId,
            },
            status: 'unreachable',
            blockers: [],
            blockerSourceIds: [],
            exploredNodes: 0,
            pathLength: 0,
          }
        );
      });
      return { approaches, testedStarts: starts.length };
    },
    {
      candidate,
      gridResolution: options.gridResolution,
      maxExploredNodes: options.maxExploredNodes,
    }
  );
};

export const auditColliderReachability = async (
  options: ColliderReachabilityAuditOptions
): Promise<ColliderReachabilityAuditReport[]> => {
  if (options.query.kind === 'source-id') {
    const visualOnly = VISUAL_ONLY_POLICIES.find(
      (policy) => policy.sourceId === options.query.value
    );
    if (visualOnly) {
      return [
        {
          sourcePolicy: visualOnly,
          classification: 'visual-only-by-policy',
          limits: {
            gridResolution: options.gridResolution,
            maximumExploredNodes: options.maxExploredNodes,
            testedStarts: 0,
            testedApproachSamples: 0,
          },
          approaches: [],
          dominatingColliders: [],
          note: 'Source policy intentionally emits no runtime collider; no fake collider was sampled.',
        },
      ];
    }
  }

  const baseUrl = options.baseUrl ?? process.env.PLAYWRIGHT_BASE_URL;
  return withRuntimePage(
    { baseUrl, timeoutMs: options.timeoutMs },
    async (page) => {
      await page.waitForFunction(
        () => {
          const api = (
            window as typeof window & {
              portfolio?: { debugColliders?: { getColliders(): unknown[] } };
            }
          ).portfolio?.debugColliders;
          return Boolean(api && api.getColliders().length > 0);
        },
        undefined,
        { timeout: options.timeoutMs }
      );
      const colliders = await page.evaluate(() => {
        const api = (
          window as typeof window & {
            portfolio?: {
              debugColliders?: { getColliders(): RuntimeColliderMetadata[] };
            };
          }
        ).portfolio?.debugColliders;
        if (!api)
          throw new Error('window.portfolio.debugColliders is unavailable.');
        return api.getColliders();
      });
      const matches = findColliderMatches(colliders, options.query);
      if (matches.length === 0)
        throw new Error(
          `No collider matched ${options.query.kind} "${options.query.value}".`
        );
      if (options.query.kind !== 'source-id' && matches.length > 1)
        throw new Error(
          `Ambiguous collider ${options.query.kind} "${options.query.value}" matched ${
            matches.length
          } records: ${matches.map((match) => match.id).join(', ')}.`
        );
      const reports: ColliderReachabilityAuditReport[] = [];
      for (const candidate of matches) {
        const runtime = await runRuntimeApproaches(page, candidate, options);
        const classification = classifyReachabilityEvidence({
          candidate,
          approaches: runtime.approaches,
        });
        const blockerRefs = new Set(
          runtime.approaches
            .flatMap((approach) => [
              ...approach.blockers,
              ...approach.blockerSourceIds,
            ])
            .filter(
              (id) =>
                id !== candidate.id &&
                id !== candidate.sourceId &&
                id !== candidate.name
            )
        );
        reports.push({
          candidate,
          classification,
          limits: {
            gridResolution: options.gridResolution,
            maximumExploredNodes: options.maxExploredNodes,
            testedStarts: runtime.testedStarts,
            testedApproachSamples: runtime.approaches.length,
          },
          approaches: runtime.approaches,
          dominatingColliders: colliders
            .filter(
              (collider) =>
                blockerRefs.has(collider.id) ||
                blockerRefs.has(collider.name) ||
                blockerRefs.has(collider.sourceId ?? '')
            )
            .map(({ id, sourceId, name }) => ({ id, sourceId, name })),
          staticEvidence: auditColliderGeometry(colliders, {
            query: { kind: 'id', value: candidate.id },
            json: true,
            tolerance: 0.05,
            samples: 16,
          })[0],
          note: 'Opt-in evidence only. Screenshots and maintainer judgment may override ambiguous results.',
        });
      }
      return reports;
    }
  );
};

const formatReport = (report: ColliderReachabilityAuditReport) => {
  const subject = report.candidate
    ? `Candidate ${report.candidate.id}\n  runtime name: ${report.candidate.name}\n  source ID: ${formatOptional(report.candidate.sourceId)}`
    : `Source policy ${report.sourcePolicy?.sourceId}`;
  return [
    subject,
    `  classification: ${report.classification}`,
    `  limits: grid ${report.limits.gridResolution}, max nodes ${report.limits.maximumExploredNodes}, starts ${report.limits.testedStarts}, approaches ${report.limits.testedApproachSamples}`,
    `  note: ${report.note}`,
    report.sourcePolicy
      ? `  rationale: ${report.sourcePolicy.rationale}`
      : undefined,
    'Approaches:',
    report.approaches.length > 0
      ? report.approaches
          .map(
            (approach) =>
              `  - ${approach.direction}: ${approach.status}; blockers ${approach.blockers.join(', ') || 'none'}; source IDs ${approach.blockerSourceIds.join(', ') || 'n/a'}; path nodes ${approach.pathLength}; explored ${approach.exploredNodes}`
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
  ]
    .filter(Boolean)
    .join('\n');
};

export const runColliderReachabilityAuditCli = async (
  args: readonly string[]
) => {
  const options = parseColliderReachabilityAuditArgs(args);
  const reports = await auditColliderReachability(options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(reports, null, 2)}\n`
      : `${reports.map(formatReport).join('\n\n')}\n`
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
