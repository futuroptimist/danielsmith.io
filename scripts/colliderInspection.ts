import type { DebugColliderMetadata } from '../src/scene/debug/colliderVisualizer';

export type ColliderInspectQuery =
  | { field: 'id'; value: string }
  | { field: 'sourceId'; value: string }
  | { field: 'name'; value: string };

export interface ColliderInspectOptions {
  query: ColliderInspectQuery;
  json: boolean;
}

export type RuntimeColliderMetadata = DebugColliderMetadata;

export interface InspectedCollider extends RuntimeColliderMetadata {
  dimensions: { width: number; depth: number; area: number };
  debugIdKind: 'explicit' | 'generated';
  overlapCount: number;
}

const round = (value: number): number =>
  Object.is(value, -0) ? 0 : Number(value.toFixed(3));

const normalizeId = (value: string): string => value.toUpperCase();

export const parseColliderInspectArgs = (
  argv: readonly string[]
): ColliderInspectOptions => {
  let query: ColliderInspectQuery | undefined;
  let json = false;

  const setQuery = (field: ColliderInspectQuery['field'], value: string) => {
    if (query) {
      throw new Error('Pass exactly one of --id, --source-id, or --name.');
    }
    if (!value || value.startsWith('--')) {
      throw new Error(
        `Missing value for --${field === 'sourceId' ? 'source-id' : field}.`
      );
    }
    query = { field, value } as ColliderInspectQuery;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      json = true;
    } else if (arg === '--id') {
      setQuery('id', argv[++index] ?? '');
    } else if (arg === '--source-id') {
      setQuery('sourceId', argv[++index] ?? '');
    } else if (arg === '--name') {
      setQuery('name', argv[++index] ?? '');
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!query) {
    throw new Error('Pass one of --id, --source-id, or --name.');
  }

  return { query, json };
};

export const findColliderMatches = (
  colliders: readonly RuntimeColliderMetadata[],
  query: ColliderInspectQuery
): RuntimeColliderMetadata[] => {
  if (query.field === 'id') {
    const id = normalizeId(query.value);
    return colliders.filter(
      (collider) => collider.id === id || collider.debugId === id
    );
  }
  if (query.field === 'sourceId') {
    return colliders.filter((collider) => collider.sourceId === query.value);
  }
  return colliders.filter((collider) => collider.name === query.value);
};

const overlaps = (
  a: RuntimeColliderMetadata,
  b: RuntimeColliderMetadata
): boolean =>
  a.id !== b.id &&
  a.bounds.minX < b.bounds.maxX &&
  a.bounds.maxX > b.bounds.minX &&
  a.bounds.minZ < b.bounds.maxZ &&
  a.bounds.maxZ > b.bounds.minZ &&
  (a.floor === b.floor || a.floor === 'all' || b.floor === 'all');

export const inspectColliderMatches = (
  matches: readonly RuntimeColliderMetadata[],
  allColliders: readonly RuntimeColliderMetadata[]
): InspectedCollider[] =>
  matches.map((collider) => {
    const width = round(collider.bounds.maxX - collider.bounds.minX);
    const depth = round(collider.bounds.maxZ - collider.bounds.minZ);
    return {
      ...collider,
      bounds: {
        minX: round(collider.bounds.minX),
        maxX: round(collider.bounds.maxX),
        minZ: round(collider.bounds.minZ),
        maxZ: round(collider.bounds.maxZ),
      },
      dimensions: { width, depth, area: round(width * depth) },
      debugIdKind: collider.debugId ? 'explicit' : 'generated',
      overlapCount: allColliders.filter((next) => overlaps(collider, next))
        .length,
    };
  });

export const formatColliderInspection = (
  colliders: readonly InspectedCollider[]
): string =>
  colliders
    .map((collider, index) => {
      const lines =
        colliders.length > 1 ? [`Match ${index + 1}/${colliders.length}`] : [];
      lines.push(
        `Debug ID: ${collider.id}`,
        `Runtime name: ${collider.name}`,
        `Source ID: ${collider.sourceId ?? '(unavailable)'}`,
        `Source type: ${collider.sourceType ?? '(unavailable)'}`,
        `Semantic role: ${collider.role ?? '(unavailable)'}`,
        `Semantic intent: ${collider.intent ?? '(unavailable)'}`,
        `Purpose: ${collider.purpose ?? '(unavailable)'}`,
        `Floor: ${collider.floor}`,
        `Category: ${collider.category}`,
        `Bounds: minX=${collider.bounds.minX}, maxX=${collider.bounds.maxX}, minZ=${collider.bounds.minZ}, maxZ=${collider.bounds.maxZ}`,
        `Dimensions: width=${collider.dimensions.width}, depth=${collider.dimensions.depth}, area=${collider.dimensions.area}`,
        `Debug ID kind: ${collider.debugIdKind}`,
        `Overlapping active colliders: ${collider.overlapCount}`
      );
      return lines.join('\n');
    })
    .join('\n\n');

export const formatNoMatchError = (
  query: ColliderInspectQuery,
  colliderCount: number
): string =>
  `No collider matched ${query.field}=${query.value}. Searched ${colliderCount} active colliders.`;
