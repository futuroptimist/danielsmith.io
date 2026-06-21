export type ColliderBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type RuntimeColliderMetadata = {
  id: string;
  name: string;
  floor: string;
  category: string;
  bounds: ColliderBounds;
  sourceId?: string;
  sourceType?: string;
  role?: string;
  intent?: string;
  purpose?: string;
  debugId?: string;
};

export type InspectOptions = {
  id?: string;
  sourceId?: string;
  name?: string;
  json: boolean;
};

export type InspectedCollider = RuntimeColliderMetadata & {
  normalizedBounds: ColliderBounds;
  dimensions: { width: number; depth: number; area: number };
  idKind: 'explicit' | 'generated';
  overlapCount: number;
};

const QUERY_FLAGS = new Set(['--id', '--source-id', '--name']);

export function parseColliderInspectArgs(
  args: readonly string[]
): InspectOptions {
  const options: InspectOptions = { json: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (!QUERY_FLAGS.has(arg)) {
      throw new Error(`Unknown option: ${arg}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }
    index += 1;

    if (arg === '--id') options.id = value.toUpperCase();
    if (arg === '--source-id') options.sourceId = value;
    if (arg === '--name') options.name = value;
  }

  const queryCount = [options.id, options.sourceId, options.name].filter(
    Boolean
  ).length;
  if (queryCount !== 1) {
    throw new Error('Provide exactly one of --id, --source-id, or --name.');
  }

  return options;
}

const round = (value: number): number => Number(value.toFixed(3));

export const normalizeBounds = (bounds: ColliderBounds): ColliderBounds => ({
  minX: round(Math.min(bounds.minX, bounds.maxX)),
  maxX: round(Math.max(bounds.minX, bounds.maxX)),
  minZ: round(Math.min(bounds.minZ, bounds.maxZ)),
  maxZ: round(Math.max(bounds.minZ, bounds.maxZ)),
});

const overlaps = (left: ColliderBounds, right: ColliderBounds): boolean =>
  left.minX < right.maxX &&
  left.maxX > right.minX &&
  left.minZ < right.maxZ &&
  left.maxZ > right.minZ;

export function inspectColliders(
  colliders: readonly RuntimeColliderMetadata[],
  options: Pick<InspectOptions, 'id' | 'sourceId' | 'name'>
): InspectedCollider[] {
  const matches = colliders.filter((collider) => {
    if (options.id)
      return collider.id.toUpperCase() === options.id.toUpperCase();
    if (options.sourceId) return collider.sourceId === options.sourceId;
    return collider.name === options.name;
  });

  if (matches.length === 0) {
    const query = options.id ?? options.sourceId ?? options.name;
    throw new Error(`No collider matched ${query}.`);
  }
  if ((options.id || options.name) && matches.length > 1) {
    throw new Error(
      `Ambiguous collider match (${matches.length} matches). Use --source-id or --id.`
    );
  }

  const normalizedColliders = colliders.map((collider) => ({
    collider,
    bounds: normalizeBounds(collider.bounds),
  }));

  return matches.map((collider) => {
    const normalizedBounds = normalizeBounds(collider.bounds);
    const width = round(normalizedBounds.maxX - normalizedBounds.minX);
    const depth = round(normalizedBounds.maxZ - normalizedBounds.minZ);
    return {
      ...collider,
      normalizedBounds,
      dimensions: { width, depth, area: round(width * depth) },
      idKind: collider.debugId === collider.id ? 'explicit' : 'generated',
      overlapCount: normalizedColliders.filter(
        (entry) =>
          entry.collider !== collider &&
          overlaps(normalizedBounds, entry.bounds)
      ).length,
    };
  });
}

const formatOptional = (value: string | undefined): string => value ?? 'n/a';
const formatBounds = (bounds: ColliderBounds): string =>
  `x ${bounds.minX}..${bounds.maxX}, z ${bounds.minZ}..${bounds.maxZ}`;

export function formatColliderReport(
  matches: readonly InspectedCollider[]
): string {
  return matches
    .map((collider) =>
      [
        `Collider ${collider.id}`,
        `  runtime name: ${collider.name}`,
        `  source ID: ${formatOptional(collider.sourceId)}`,
        `  source type: ${formatOptional(collider.sourceType)}`,
        `  role/intent: ${formatOptional(collider.role)} / ${formatOptional(collider.intent)}`,
        `  purpose: ${formatOptional(collider.purpose)}`,
        `  floor: ${collider.floor}`,
        `  category: ${collider.category}`,
        `  bounds: ${formatBounds(collider.normalizedBounds)}`,
        `  dimensions: ${collider.dimensions.width} × ${collider.dimensions.depth} (area ${collider.dimensions.area})`,
        `  ID kind: ${collider.idKind}`,
        `  overlapping active colliders: ${collider.overlapCount}`,
      ].join('\n')
    )
    .join('\n\n');
}
