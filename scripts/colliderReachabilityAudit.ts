import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';

import { FUTUROPTIMIST_MEDIA_WALL_POLICY } from '../src/scene/level/mediaWallPolicy';

import { auditColliderGeometry } from './colliderGeometryAudit';
import {
  findColliderMatches,
  formatOptional,
  type ColliderInspectQuery,
} from './colliderInspect';
import {
  withRuntimeColliderPage,
  type RuntimeColliderMetadata,
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
  maxStepsPerPath: number;
};

type ApproachDirection = 'north' | 'south' | 'east' | 'west';

type RuntimeApproachResult = {
  direction: ApproachDirection;
  target: { x: number; z: number; floorId: string };
  startName?: string;
  reachedApproach: boolean;
  firstBlockers: string[];
  note?: string;
};

export type ColliderReachabilityAuditReport = {
  candidate?: RuntimeColliderMetadata;
  sourcePolicy?: {
    sourceId: string;
    collision: 'none';
    rationale: string;
  };
  classification: ReachabilityClassification;
  limits: {
    gridResolution: number;
    maximumExploredNodes: number;
    maxStepsPerPath: number;
    testedStarts: string[];
    testedApproachSamples: number;
  };
  approaches: RuntimeApproachResult[];
  dominatingColliders: Array<
    Pick<RuntimeColliderMetadata, 'id' | 'sourceId' | 'name'>
  >;
  staticEvidence?: ReturnType<typeof auditColliderGeometry>[number];
  note: string;
};

type SourceNoCollisionPolicy = {
  sourceId: string;
  collision: 'none';
  rationale: string;
};

const SOURCE_NO_COLLISION_POLICIES: SourceNoCollisionPolicy[] = [
  {
    sourceId: FUTUROPTIMIST_MEDIA_WALL_POLICY.sourceId,
    collision: 'none',
    rationale: FUTUROPTIMIST_MEDIA_WALL_POLICY.collision.rationale,
  },
];

const DEFAULT_OPTIONS = {
  gridResolution: 0.75,
  maxExploredNodes: 96,
  maxStepsPerPath: 220,
};

const STARTS = [
  { name: 'current-spawn', x: 0, z: 0, floorId: 'ground' },
  { name: 'living-room-center', x: -2.5, z: -11.5, floorId: 'ground' },
  { name: 'studio-center', x: 7.2, z: -10.8, floorId: 'ground' },
  { name: 'backyard-center', x: 0, z: 7.5, floorId: 'ground' },
  { name: 'upper-landing', x: 0, z: -1.4, floorId: 'upper' },
  { name: 'upper-loft-center', x: -3, z: -8.5, floorId: 'upper' },
] as const;

const round = (value: number) => Number(value.toFixed(3));

export const parseColliderReachabilityAuditArgs = (
  args: readonly string[]
): ColliderReachabilityAuditOptions => {
  let query: ColliderInspectQuery | undefined;
  let json = false;
  let gridResolution = DEFAULT_OPTIONS.gridResolution;
  let maxExploredNodes = DEFAULT_OPTIONS.maxExploredNodes;
  let maxStepsPerPath = DEFAULT_OPTIONS.maxStepsPerPath;

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
    if (
      arg === '--grid-resolution' ||
      arg === '--max-explored-nodes' ||
      arg === '--max-steps'
    ) {
      const value = Number(readValue(index, arg));
      if (!Number.isFinite(value) || value <= 0)
        throw new Error(`${arg} must be positive.`);
      if (arg === '--grid-resolution') gridResolution = value;
      if (arg === '--max-explored-nodes') maxExploredNodes = Math.floor(value);
      if (arg === '--max-steps') maxStepsPerPath = Math.floor(value);
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
  return { query, json, gridResolution, maxExploredNodes, maxStepsPerPath };
};

const getSourceNoCollisionPolicy = (
  query: ColliderInspectQuery
): SourceNoCollisionPolicy | undefined =>
  query.kind === 'source-id'
    ? SOURCE_NO_COLLISION_POLICIES.find(
        (policy) => policy.sourceId === query.value
      )
    : undefined;

export const classifyReachabilityEvidence = (input: {
  candidate: RuntimeColliderMetadata;
  approaches: readonly RuntimeApproachResult[];
  blockerColliders: readonly RuntimeColliderMetadata[];
}): Pick<
  ColliderReachabilityAuditReport,
  'classification' | 'dominatingColliders' | 'note'
> => {
  if (input.candidate.intent === 'secondary-backstop') {
    return {
      classification: 'secondary-backstop',
      dominatingColliders: [],
      note: 'Source intent marks this collider as layered safety coverage.',
    };
  }

  const reached = input.approaches.filter(
    (approach) => approach.reachedApproach
  );
  const blockedBeforeApproach = input.approaches.filter(
    (approach) => !approach.reachedApproach && approach.firstBlockers.length > 0
  );
  if (
    reached.some((approach) =>
      approach.firstBlockers.includes(input.candidate.name)
    )
  ) {
    return {
      classification: 'directly-load-bearing',
      dominatingColliders: [],
      note: 'At least one legal runtime approach encountered this candidate first.',
    };
  }
  const dominanceEvidence = [...reached, ...blockedBeforeApproach];
  if (dominanceEvidence.length === 0) {
    return {
      classification: 'outside-reachable-navmesh',
      dominatingColliders: [],
      note: 'No tested legal start reached a meaningful approach sample.',
    };
  }

  const blockerNames = new Set(
    dominanceEvidence.flatMap((approach) => approach.firstBlockers)
  );
  const blockers = input.blockerColliders.filter((collider) =>
    blockerNames.has(collider.name)
  );
  if (
    blockers.length > 0 &&
    dominanceEvidence.every((approach) => approach.firstBlockers.length > 0)
  ) {
    return {
      classification: 'dominated',
      dominatingColliders: blockers.map(({ id, sourceId, name }) => ({
        id,
        sourceId,
        name,
      })),
      note: 'Every reached approach was blocked first by another active collider.',
    };
  }
  return {
    classification: 'ambiguous',
    dominatingColliders: [],
    note: 'Sampling or path limits prevented a confident first-blocker result.',
  };
};

const runRuntimeApproaches = async (
  page: Page,
  candidate: RuntimeColliderMetadata,
  options: ColliderReachabilityAuditOptions
): Promise<RuntimeApproachResult[]> =>
  page.evaluate(
    ({ candidate: nextCandidate, starts, maxSteps }) => {
      type PortfolioWindow = Window & {
        portfolio?: {
          world?: {
            canOccupyPosition(target: {
              x: number;
              z: number;
              floorId?: string;
            }): boolean;
            movePlayerTo(target: {
              x: number;
              z: number;
              floorId?: string;
            }): void;
            stepPlayerForTest(step: { dx: number; dz: number }): {
              movedX: boolean;
              movedZ: boolean;
              blockedBy?: string[];
            };
            getPlayerPosition(): { x: number; z: number };
          };
        };
      };
      const world = (window as PortfolioWindow).portfolio?.world;
      if (!world)
        throw new Error('World API unavailable for reachability audit.');
      const radius = 0.78;
      const centerX =
        (nextCandidate.bounds.minX + nextCandidate.bounds.maxX) / 2;
      const centerZ =
        (nextCandidate.bounds.minZ + nextCandidate.bounds.maxZ) / 2;
      const floorId =
        nextCandidate.floor === 'all' ? undefined : nextCandidate.floor;
      const samples = [
        {
          direction: 'north' as const,
          x: centerX,
          z: nextCandidate.bounds.minZ - radius,
        },
        {
          direction: 'south' as const,
          x: centerX,
          z: nextCandidate.bounds.maxZ + radius,
        },
        {
          direction: 'west' as const,
          x: nextCandidate.bounds.minX - radius,
          z: centerZ,
        },
        {
          direction: 'east' as const,
          x: nextCandidate.bounds.maxX + radius,
          z: centerZ,
        },
      ];

      const walkTo = (target: { x: number; z: number }) => {
        for (let index = 0; index < maxSteps; index += 1) {
          const position = world.getPlayerPosition();
          const dx = Math.max(-0.18, Math.min(0.18, target.x - position.x));
          const dz = Math.max(-0.18, Math.min(0.18, target.z - position.z));
          if (Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01)
            return { reached: true, blockers: [] };
          const result = world.stepPlayerForTest({ dx, dz });
          if ((dx !== 0 && !result.movedX) || (dz !== 0 && !result.movedZ)) {
            return { reached: false, blockers: result.blockedBy ?? [] };
          }
        }
        return { reached: false, blockers: [] };
      };

      const current = world.getPlayerPosition();
      const runtimeStarts = [
        {
          name: 'runtime-current-position',
          x: current.x,
          z: current.z,
          floorId: floorId ?? 'ground',
        },
        ...starts,
      ];

      return samples.map((sample) => {
        if (!world.canOccupyPosition({ x: sample.x, z: sample.z, floorId })) {
          return {
            direction: sample.direction,
            target: { x: sample.x, z: sample.z, floorId: floorId ?? 'ground' },
            reachedApproach: false,
            firstBlockers: [],
            note: 'Approach sample is not occupiable; not counted as reachable proof.',
          };
        }
        const blockedBy = new Set<string>();
        for (const start of runtimeStarts) {
          try {
            if (!world.canOccupyPosition(start)) continue;
            world.movePlayerTo(start);
            const approach = walkTo(sample);
            if (!approach.reached) {
              approach.blockers.forEach((blocker) => blockedBy.add(blocker));
              continue;
            }
            const dx = Math.max(-0.32, Math.min(0.32, centerX - sample.x));
            const dz = Math.max(-0.32, Math.min(0.32, centerZ - sample.z));
            const result = world.stepPlayerForTest({ dx, dz });
            return {
              direction: sample.direction,
              target: {
                x: sample.x,
                z: sample.z,
                floorId: floorId ?? start.floorId,
              },
              startName: start.name,
              reachedApproach: true,
              firstBlockers: result.blockedBy ?? [],
            };
          } catch {
            // Try the next deterministic start; failures here only limit sampling.
          }
        }
        return {
          direction: sample.direction,
          target: { x: sample.x, z: sample.z, floorId: floorId ?? 'ground' },
          reachedApproach: false,
          firstBlockers: Array.from(blockedBy),
          note: 'No seeded legal start reached this approach within step limits.',
        };
      });
    },
    { candidate, starts: STARTS, maxSteps: options.maxStepsPerPath }
  );

export const auditColliderReachability = async (
  page: Page,
  colliders: readonly RuntimeColliderMetadata[],
  options: ColliderReachabilityAuditOptions
): Promise<ColliderReachabilityAuditReport[]> => {
  const matches = findColliderMatches(colliders, options.query);
  if (matches.length === 0) {
    const sourcePolicy = getSourceNoCollisionPolicy(options.query);
    if (sourcePolicy) {
      return [
        {
          sourcePolicy,
          classification: 'visual-only-by-policy',
          limits: {
            gridResolution: options.gridResolution,
            maximumExploredNodes: options.maxExploredNodes,
            maxStepsPerPath: options.maxStepsPerPath,
            testedStarts: STARTS.map((start) => start.name),
            testedApproachSamples: 0,
          },
          approaches: [],
          dominatingColliders: [],
          note: sourcePolicy.rationale,
        },
      ];
    }
    throw new Error(
      `No collider matched ${options.query.kind} "${options.query.value}".`
    );
  }
  if (options.query.kind !== 'source-id' && matches.length > 1) {
    throw new Error(
      `Ambiguous collider ${options.query.kind} "${options.query.value}" matched ${matches.length} records: ${matches.map((match) => match.id).join(', ')}.`
    );
  }

  const geometry = auditColliderGeometry(colliders, {
    query: options.query,
    json: true,
    tolerance: 0.05,
    samples: 16,
  });

  return Promise.all(
    matches.map(async (candidate, index) => {
      const approaches = await runRuntimeApproaches(page, candidate, options);
      const aggregate = classifyReachabilityEvidence({
        candidate,
        approaches,
        blockerColliders: colliders,
      });
      return {
        candidate,
        ...aggregate,
        limits: {
          gridResolution: options.gridResolution,
          maximumExploredNodes: options.maxExploredNodes,
          maxStepsPerPath: options.maxStepsPerPath,
          testedStarts: STARTS.map((start) => start.name),
          testedApproachSamples: approaches.length,
        },
        approaches: approaches.map((approach) => ({
          ...approach,
          target: {
            x: round(approach.target.x),
            z: round(approach.target.z),
            floorId: approach.target.floorId,
          },
        })),
        staticEvidence: geometry[index],
      };
    })
  );
};

export const formatColliderReachabilityAuditReports = (
  reports: readonly ColliderReachabilityAuditReport[]
): string =>
  reports
    .map((report) => {
      if (report.sourcePolicy) {
        return [
          `Source ${report.sourcePolicy.sourceId}`,
          `  classification: ${report.classification}`,
          `  rationale: ${report.sourcePolicy.rationale}`,
          `  note: visual-only policies intentionally emit no runtime collider`,
        ].join('\n');
      }
      const candidate = report.candidate;
      if (!candidate) return `classification: ${report.classification}`;
      return [
        `Candidate ${candidate.id}`,
        `  runtime name: ${candidate.name}`,
        `  source ID: ${formatOptional(candidate.sourceId)}`,
        `  classification: ${report.classification}`,
        `  note: ${report.note}`,
        `  limits: grid ${report.limits.gridResolution}, max nodes ${report.limits.maximumExploredNodes}, max steps ${report.limits.maxStepsPerPath}`,
        `  tested starts: ${report.limits.testedStarts.join(', ')}`,
        'Approaches:',
        report.approaches
          .map(
            (approach) =>
              `  - ${approach.direction} via ${approach.startName ?? 'n/a'} at (${approach.target.x}, ${approach.target.z}, ${approach.target.floorId}): ${approach.reachedApproach ? 'reached' : 'not reached'}; first blockers: ${approach.firstBlockers.join(', ') || 'none'}${approach.note ? `; ${approach.note}` : ''}`
          )
          .join('\n'),
        'Dominating colliders:',
        report.dominatingColliders.length > 0
          ? report.dominatingColliders
              .map(
                (collider) =>
                  `  - ${collider.id} ${collider.name} (source ID: ${formatOptional(collider.sourceId)})`
              )
              .join('\n')
          : '  - none',
        `Static geometry classification: ${report.staticEvidence?.classification ?? 'n/a'}`,
        'Reminder: screenshots and maintainer judgment may override ambiguous reports.',
      ].join('\n');
    })
    .join('\n\n');

export const runColliderReachabilityAuditCli = async (
  args: readonly string[]
) => {
  const options = parseColliderReachabilityAuditArgs(args);
  const sourcePolicy = getSourceNoCollisionPolicy(options.query);
  if (sourcePolicy) {
    const reports = await auditColliderReachability({} as Page, [], options);
    process.stdout.write(
      options.json
        ? `${JSON.stringify(reports, null, 2)}\n`
        : `${formatColliderReachabilityAuditReports(reports)}\n`
    );
    return;
  }
  const reports = await withRuntimeColliderPage(async (page, pageColliders) =>
    auditColliderReachability(page, pageColliders, options)
  );
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
