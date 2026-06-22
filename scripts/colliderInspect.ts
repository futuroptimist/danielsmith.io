import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  collectRuntimeColliders,
  type RuntimeColliderMetadata,
} from './colliderRuntimeCollector';

export type ColliderInspectQuery =
  | { kind: 'id'; value: string }
  | { kind: 'source-id'; value: string }
  | { kind: 'name'; value: string };

export type ColliderInspectOptions = {
  query: ColliderInspectQuery;
  json: boolean;
};

export type ColliderInspectionRecord = RuntimeColliderMetadata & {
  normalizedBounds: RuntimeColliderMetadata['bounds'];
  dimensions: { width: number; depth: number; area: number };
  idKind: 'explicit' | 'generated';
  overlappingActiveColliderCount: number;
};

const round = (value: number) => Number(value.toFixed(3));

const normalizeBounds = (bounds: RuntimeColliderMetadata['bounds']) => ({
  minX: round(bounds.minX),
  maxX: round(bounds.maxX),
  minZ: round(bounds.minZ),
  maxZ: round(bounds.maxZ),
});

const getDimensions = (bounds: RuntimeColliderMetadata['bounds']) => {
  const width = Math.max(0, bounds.maxX - bounds.minX);
  const depth = Math.max(0, bounds.maxZ - bounds.minZ);
  return {
    width: round(width),
    depth: round(depth),
    area: round(width * depth),
  };
};

export const floorsCanOverlap = (left: string, right: string): boolean =>
  left === right || left === 'all' || right === 'all';

const boundsOverlap = (
  left: RuntimeColliderMetadata['bounds'],
  right: RuntimeColliderMetadata['bounds']
): boolean =>
  left.minX < right.maxX &&
  left.maxX > right.minX &&
  left.minZ < right.maxZ &&
  left.maxZ > right.minZ;

const countOverlaps = (
  target: RuntimeColliderMetadata,
  colliders: readonly RuntimeColliderMetadata[]
): number =>
  colliders.filter(
    (candidate) =>
      candidate.id !== target.id &&
      floorsCanOverlap(candidate.floor, target.floor) &&
      boundsOverlap(candidate.bounds, target.bounds)
  ).length;

const byStableIdentity = (
  left: RuntimeColliderMetadata,
  right: RuntimeColliderMetadata
): number =>
  left.id.localeCompare(right.id) ||
  left.name.localeCompare(right.name) ||
  (left.sourceId ?? '').localeCompare(right.sourceId ?? '');

export const parseColliderInspectArgs = (
  args: readonly string[]
): ColliderInspectOptions => {
  let query: ColliderInspectQuery | undefined;
  let json = false;

  const readValue = (index: number, flag: string): string => {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${flag} requires a value.`);
    }
    return value;
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      json = true;
      continue;
    }

    if (arg === '--id' || arg === '--source-id' || arg === '--name') {
      if (query) {
        throw new Error('Provide exactly one of --id, --source-id, or --name.');
      }
      const value = readValue(index, arg);
      index += 1;
      query = {
        kind: arg.slice(2) as ColliderInspectQuery['kind'],
        value,
      };
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!query) {
    throw new Error('Provide exactly one of --id, --source-id, or --name.');
  }

  return { query, json };
};

export const findColliderMatches = (
  colliders: readonly RuntimeColliderMetadata[],
  query: ColliderInspectQuery
): RuntimeColliderMetadata[] => {
  const matches = colliders.filter((collider) => {
    if (query.kind === 'id') {
      return collider.id.toUpperCase() === query.value.toUpperCase();
    }
    if (query.kind === 'source-id') {
      return collider.sourceId === query.value;
    }
    return collider.name === query.value;
  });

  return [...matches].sort(byStableIdentity);
};

export const toInspectionRecords = (
  matches: readonly RuntimeColliderMetadata[],
  colliders: readonly RuntimeColliderMetadata[]
): ColliderInspectionRecord[] =>
  matches.map((collider) => ({
    ...collider,
    normalizedBounds: normalizeBounds(collider.bounds),
    dimensions: getDimensions(collider.bounds),
    idKind: collider.debugId === collider.id ? 'explicit' : 'generated',
    overlappingActiveColliderCount: countOverlaps(collider, colliders),
  }));

const formatBounds = (bounds: RuntimeColliderMetadata['bounds']): string =>
  `x ${bounds.minX}..${bounds.maxX}, z ${bounds.minZ}..${bounds.maxZ}`;

export const formatOptional = (value: string | undefined): string =>
  value ?? 'n/a';

export const formatInspectionRecords = (
  records: readonly ColliderInspectionRecord[]
): string =>
  records
    .map((record) =>
      [
        `Collider ${record.id}`,
        `  runtime name: ${record.name}`,
        `  source ID: ${formatOptional(record.sourceId)}`,
        `  source type: ${formatOptional(record.sourceType)}`,
        `  intent: ${formatOptional(record.intent)}`,
        `  role: ${formatOptional(record.role)}`,
        `  purpose: ${formatOptional(record.purpose)}`,
        `  floor: ${record.floor}`,
        `  category: ${record.category}`,
        `  normalized bounds: ${formatBounds(record.normalizedBounds)}`,
        `  dimensions: width ${record.dimensions.width}, depth ${record.dimensions.depth}, area ${record.dimensions.area}`,
        `  ID kind: ${record.idKind}`,
        `  overlapping active colliders: ${record.overlappingActiveColliderCount}`,
      ].join('\n')
    )
    .join('\n\n');

const getNoMatchMessage = (query: ColliderInspectQuery): string =>
  `No collider matched ${query.kind} "${query.value}".`;

const getAmbiguousMatchMessage = (
  query: ColliderInspectQuery,
  matches: readonly RuntimeColliderMetadata[]
): string =>
  `Ambiguous collider ${query.kind} "${query.value}" matched ${matches.length} records: ${matches
    .map((match) => match.id)
    .join(', ')}.`;

export const inspectColliders = (
  colliders: readonly RuntimeColliderMetadata[],
  options: ColliderInspectOptions
): ColliderInspectionRecord[] => {
  const matches = findColliderMatches(colliders, options.query);
  if (matches.length === 0) {
    throw new Error(getNoMatchMessage(options.query));
  }
  if (options.query.kind !== 'source-id' && matches.length > 1) {
    throw new Error(getAmbiguousMatchMessage(options.query, matches));
  }
  return toInspectionRecords(matches, colliders);
};

export const runColliderInspectCli = async (args: readonly string[]) => {
  const options = parseColliderInspectArgs(args);
  const colliders = await collectRuntimeColliders();
  const records = inspectColliders(colliders, options);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(records, null, 2)}\n`
      : `${formatInspectionRecords(records)}\n`
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
  runColliderInspectCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
