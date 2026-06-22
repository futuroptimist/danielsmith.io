import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { FLOOR_PLAN_LEVELS } from '../src/assets/floorPlan';
import { FUTUROPTIMIST_MEDIA_WALL_POLICY } from '../src/scene/level/mediaWallPolicy';
import { UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES } from '../src/scene/level/upperStairwellLandingSegments';

import { auditColliderGeometry } from './colliderGeometryAudit';
import {
  findColliderMatches,
  formatOptional,
  type ColliderInspectQuery,
} from './colliderInspect';
import {
  collectRuntimeCollidersWithPage,
  type RuntimeColliderMetadata,
} from './colliderRuntimeCollector';

type FloorId = 'ground' | 'upper';
type Point = { x: number; z: number; floorId: FloorId };
type ReachabilityClassification =
  | 'directly-load-bearing'
  | 'dominated'
  | 'outside-reachable-navmesh'
  | 'visual-only-by-policy'
  | 'secondary-backstop'
  | 'ambiguous';

type Attempt = {
  direction: 'north' | 'south' | 'east' | 'west';
  target: Point;
  reachable: boolean;
  confirmed: boolean;
  firstBlockers: string[];
};

export type ReachabilityAggregationInput = {
  candidate?: RuntimeColliderMetadata;
  sourcePolicy?: {
    collision: 'none' | 'active';
    intent?: string;
    rationale?: string;
  };
  attempts: readonly Attempt[];
  exploredNodes: number;
  nodeLimitHit: boolean;
};

export type ColliderReachabilityReport = {
  candidate?: RuntimeColliderMetadata;
  sourceId?: string;
  classification: ReachabilityClassification;
  attempts: Attempt[];
  dominatingColliders: Array<{
    id: string;
    sourceId?: string;
    directions: string[];
  }>;
  limits: {
    gridResolution: number;
    maxExploredNodes: number;
    testedStarts: number;
    testedApproachSamples: number;
  };
  staticEvidence?: string;
  note: string;
};

type Options = {
  query: ColliderInspectQuery;
  json: boolean;
  gridResolution: number;
  maxExploredNodes: number;
};

const PLAYER_RADIUS = 0.35;
const STEP_SIZE = 0.18;
const NOTE =
  'Reachability is bounded evidence for review; screenshots and maintainer judgment may override ambiguous results.';

const noCollisionPolicies = [
  FUTUROPTIMIST_MEDIA_WALL_POLICY,
  ...UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES,
].filter((policy) => policy.collision.collision === 'none');

const sourcePolicyFor = (sourceId: string) =>
  noCollisionPolicies.find((policy) => policy.sourceId === sourceId)?.collision;

export const parseColliderReachabilityAuditArgs = (
  args: readonly string[]
): Options => {
  let query: ColliderInspectQuery | undefined;
  let json = false;
  let gridResolution = 0.5;
  let maxExploredNodes = 5_000;
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
    if (arg === '--grid-resolution' || arg === '--max-explored-nodes') {
      const value = Number(readValue(index, arg));
      if (!Number.isFinite(value) || value <= 0)
        throw new Error(`${arg} must be positive.`);
      if (arg === '--grid-resolution') gridResolution = value;
      else maxExploredNodes = Math.floor(value);
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
  return { query, json, gridResolution, maxExploredNodes };
};

const blockerIdentity = (collider: RuntimeColliderMetadata) =>
  new Set([collider.id, collider.name]);

export const classifyReachabilityEvidence = (
  input: ReachabilityAggregationInput
): ReachabilityClassification => {
  if (input.sourcePolicy?.collision === 'none') return 'visual-only-by-policy';
  if (input.candidate?.intent === 'secondary-backstop')
    return 'secondary-backstop';
  const candidateNames = input.candidate
    ? blockerIdentity(input.candidate)
    : new Set<string>();
  if (
    input.attempts.some((attempt) =>
      attempt.firstBlockers.some((id) => candidateNames.has(id))
    )
  ) {
    return 'directly-load-bearing';
  }
  const reachable = input.attempts.filter((attempt) => attempt.reachable);
  if (reachable.length === 0)
    return input.nodeLimitHit ? 'ambiguous' : 'outside-reachable-navmesh';
  if (reachable.every((attempt) => attempt.firstBlockers.length > 0))
    return 'dominated';
  return 'ambiguous';
};

const approachSamples = (candidate: RuntimeColliderMetadata): Attempt[] => {
  const { bounds, floor } = candidate;
  const floorId = floor === 'upper' ? 'upper' : 'ground';
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midZ = (bounds.minZ + bounds.maxZ) / 2;
  const offset = PLAYER_RADIUS + 0.08;
  return [
    {
      direction: 'north',
      target: { x: midX, z: bounds.maxZ + offset, floorId },
      reachable: false,
      confirmed: false,
      firstBlockers: [],
    },
    {
      direction: 'south',
      target: { x: midX, z: bounds.minZ - offset, floorId },
      reachable: false,
      confirmed: false,
      firstBlockers: [],
    },
    {
      direction: 'east',
      target: { x: bounds.maxX + offset, z: midZ, floorId },
      reachable: false,
      confirmed: false,
      firstBlockers: [],
    },
    {
      direction: 'west',
      target: { x: bounds.minX - offset, z: midZ, floorId },
      reachable: false,
      confirmed: false,
      firstBlockers: [],
    },
  ];
};

const roomCenterStarts = (): Point[] =>
  FLOOR_PLAN_LEVELS.flatMap((level) =>
    level.plan.rooms.map((room) => ({
      x: (room.bounds.minX + room.bounds.maxX) / 2,
      z: (room.bounds.minZ + room.bounds.maxZ) / 2,
      floorId: level.id as FloorId,
    }))
  );

const findGridPath = async (
  page: import('@playwright/test').Page,
  starts: readonly Point[],
  target: Point,
  resolution: number,
  maxNodes: number
) => {
  return page.evaluate(
    ({
      starts: nextStarts,
      target: nextTarget,
      resolution: nextResolution,
      maxNodes: limit,
    }) => {
      const world = window.portfolio!.world!;
      const queue: Array<{ point: Point; path: Point[] }> = nextStarts
        .filter((start) => start.floorId === nextTarget.floorId)
        .filter((start) => world.canOccupyPosition(start))
        .map((point) => ({ point, path: [point] }));
      const makeKey = (point: Point) =>
        `${point.floorId}:${point.x.toFixed(2)}:${point.z.toFixed(2)}`;
      const seen = new Set(queue.map((item) => makeKey(item.point)));
      let explored = 0;
      while (queue.length > 0 && explored < limit) {
        const current = queue.shift()!;
        explored += 1;
        if (
          Math.hypot(
            current.point.x - nextTarget.x,
            current.point.z - nextTarget.z
          ) <= nextResolution
        ) {
          return {
            path: [...current.path, nextTarget],
            explored,
            limitHit: false,
          };
        }
        for (const [dx, dz] of [
          [nextResolution, 0],
          [-nextResolution, 0],
          [0, nextResolution],
          [0, -nextResolution],
        ]) {
          const next = {
            x: current.point.x + dx,
            z: current.point.z + dz,
            floorId: nextTarget.floorId,
          };
          const nextKey = makeKey(next);
          if (seen.has(nextKey)) continue;
          seen.add(nextKey);
          if (world.canOccupyPosition(next)) {
            queue.push({ point: next, path: [...current.path, next] });
          }
        }
      }
      return { path: undefined, explored, limitHit: queue.length > 0 };
    },
    { starts, target, resolution, maxNodes }
  );
};

const confirmPath = async (
  page: import('@playwright/test').Page,
  path: readonly Point[]
) =>
  page.evaluate(
    ({ path: nextPath, stepSize }) => {
      const world = window.portfolio!.world!;
      const first = nextPath[0];
      world.movePlayerTo(first);
      for (const waypoint of nextPath.slice(1)) {
        for (let index = 0; index < 420; index += 1) {
          const pos = world.getPlayerPosition();
          const remainingX = waypoint.x - pos.x;
          const remainingZ = waypoint.z - pos.z;
          if (Math.abs(remainingX) < 0.04 && Math.abs(remainingZ) < 0.04) break;
          const dx = Math.max(-stepSize, Math.min(stepSize, remainingX));
          const dz = Math.max(-stepSize, Math.min(stepSize, remainingZ));
          const result = world.stepPlayerForTest({ dx, dz });
          if ((dx !== 0 && !result.movedX) || (dz !== 0 && !result.movedZ)) {
            return { confirmed: false, firstBlockers: result.blockedBy ?? [] };
          }
        }
      }
      return { confirmed: true, firstBlockers: [] };
    },
    { path, stepSize: STEP_SIZE }
  );

const summarizeDominators = (
  attempts: readonly Attempt[],
  colliders: readonly RuntimeColliderMetadata[]
) => {
  const byName = new Map(
    colliders.flatMap((collider) =>
      [...blockerIdentity(collider)].map((id) => [id, collider] as const)
    )
  );
  const directions = new Map<string, Set<string>>();
  attempts.forEach((attempt) => {
    attempt.firstBlockers.forEach((blocker) => {
      const collider = byName.get(blocker);
      if (!collider) return;
      const entry = directions.get(collider.id) ?? new Set<string>();
      entry.add(attempt.direction);
      directions.set(collider.id, entry);
    });
  });
  return [...directions].map(([id, dirs]) => {
    const collider = colliders.find((item) => item.id === id)!;
    return { id, sourceId: collider.sourceId, directions: [...dirs].sort() };
  });
};

export const runReachabilityAudit = async (
  options: Options
): Promise<ColliderReachabilityReport[]> => {
  const visualPolicy =
    options.query.kind === 'source-id'
      ? sourcePolicyFor(options.query.value)
      : undefined;
  if (visualPolicy?.collision === 'none') {
    return [
      {
        sourceId: options.query.value,
        classification: 'visual-only-by-policy',
        attempts: [],
        dominatingColliders: [],
        limits: {
          gridResolution: options.gridResolution,
          maxExploredNodes: options.maxExploredNodes,
          testedStarts: 0,
          testedApproachSamples: 0,
        },
        note: visualPolicy.rationale,
      },
    ];
  }

  return collectRuntimeCollidersWithPage(async (page, colliders) => {
    const matches = findColliderMatches(colliders, options.query);
    if (matches.length === 0)
      throw new Error(
        `No collider matched ${options.query.kind} "${options.query.value}".`
      );
    if (options.query.kind !== 'source-id' && matches.length > 1)
      throw new Error(
        `Ambiguous collider ${options.query.kind} "${options.query.value}" matched ${matches.length} records: ${matches.map((match) => match.id).join(', ')}.`
      );
    const starts = roomCenterStarts();
    const reports: ColliderReachabilityReport[] = [];
    for (const candidate of matches) {
      const attempts = approachSamples(candidate);
      let exploredNodes = 0;
      let nodeLimitHit = false;
      for (const attempt of attempts) {
        const pathResult = await findGridPath(
          page,
          starts,
          attempt.target,
          options.gridResolution,
          options.maxExploredNodes
        );
        exploredNodes += pathResult.explored;
        nodeLimitHit ||= pathResult.limitHit;
        if (!pathResult.path) continue;
        attempt.reachable = true;
        const confirmation = await confirmPath(page, pathResult.path);
        attempt.confirmed = confirmation.confirmed;
        attempt.firstBlockers = confirmation.firstBlockers;
      }
      const classification = classifyReachabilityEvidence({
        candidate,
        attempts,
        exploredNodes,
        nodeLimitHit,
      });
      const [geometry] = auditColliderGeometry(colliders, {
        query: { kind: 'id', value: candidate.id },
        json: true,
        tolerance: 0.05,
        samples: 12,
      });
      reports.push({
        candidate,
        classification,
        attempts,
        dominatingColliders: summarizeDominators(attempts, colliders),
        limits: {
          gridResolution: options.gridResolution,
          maxExploredNodes: options.maxExploredNodes,
          testedStarts: starts.length,
          testedApproachSamples: attempts.length,
        },
        staticEvidence: geometry.classification,
        note: NOTE,
      });
    }
    return reports;
  });
};

const formatReport = (report: ColliderReachabilityReport) =>
  [
    `Candidate ${report.candidate?.id ?? report.sourceId}`,
    `  runtime name: ${formatOptional(report.candidate?.name)}`,
    `  source ID: ${formatOptional(report.candidate?.sourceId ?? report.sourceId)}`,
    `  classification: ${report.classification}`,
    `  static geometry evidence: ${formatOptional(report.staticEvidence)}`,
    `  limits: grid ${report.limits.gridResolution}, max nodes ${report.limits.maxExploredNodes}, starts ${report.limits.testedStarts}, approaches ${report.limits.testedApproachSamples}`,
    '  attempts:',
    report.attempts.length
      ? report.attempts
          .map(
            (attempt) =>
              `    - ${attempt.direction}: reachable=${attempt.reachable}, confirmed=${attempt.confirmed}, first blockers=${attempt.firstBlockers.join(', ') || 'none'}`
          )
          .join('\n')
      : '    - none',
    '  dominating colliders:',
    report.dominatingColliders.length
      ? report.dominatingColliders
          .map(
            (item) =>
              `    - ${item.id} source=${formatOptional(item.sourceId)} directions=${item.directions.join(',')}`
          )
          .join('\n')
      : '    - none',
    `  note: ${report.note}`,
  ].join('\n');

export const runColliderReachabilityAuditCli = async (
  args: readonly string[]
) => {
  const options = parseColliderReachabilityAuditArgs(args);
  const reports = await runReachabilityAudit(options);
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
