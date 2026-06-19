import type { DebugColliderFloor } from './colliderVisualizer';

export interface DebugColliderIdLookupInput {
  floor: DebugColliderFloor;
  category: string;
  name: string;
}

const DEBUG_COLLIDER_ID_PATTERN = /^[0-9A-F]{4,6}$/;
export type DebugColliderId = string & {
  readonly __debugColliderId: unique symbol;
};

export const isDebugColliderId = (value: string): value is DebugColliderId =>
  DEBUG_COLLIDER_ID_PATTERN.test(value);

export const assertDebugColliderId = (value: string): DebugColliderId => {
  if (!isDebugColliderId(value)) {
    throw new Error(`Invalid debug collider ID ${value}`);
  }
  return value;
};

const GENERATED_COLLIDER_ID_PREFIXES = {
  ground: '1',
  static: '2',
  upper: '3',
} as const;

const DECLARED_REGRESSION_COLLIDER_IDS = {
  // Greptile regression pair: these names historically shared fallback primary
  // FB7D89, so declare code-owned IDs instead of depending on registration
  // timing to decide which collider owns that visible screenshot anchor.
  'collision-1104': 'C1104',
  'collision-2488': 'C2488',
} as const satisfies Record<string, string>;

const getGeneratedColliderId = ({
  category,
  name,
}: DebugColliderIdLookupInput): string | undefined => {
  const prefix =
    GENERATED_COLLIDER_ID_PREFIXES[
      category as keyof typeof GENERATED_COLLIDER_ID_PREFIXES
    ];
  if (!prefix) {
    return undefined;
  }

  const match = name.match(new RegExp(`^${category}-collider-(\\d+)$`));
  if (!match) {
    return undefined;
  }

  const index = Number.parseInt(match[1], 10);
  if (!Number.isSafeInteger(index) || index <= 0 || index > 0xfff) {
    return undefined;
  }

  return `${prefix}${index.toString(16).toUpperCase().padStart(3, '0')}`;
};

export const getGeneratedColliderDebugIds = (): Map<string, string> => {
  const generatedIds = new Map<string, string>();
  for (const [category, prefix] of Object.entries(
    GENERATED_COLLIDER_ID_PREFIXES
  )) {
    if (!DEBUG_COLLIDER_ID_PATTERN.test(`${prefix}001`)) {
      throw new Error(`Invalid generated debug collider prefix ${prefix}`);
    }
    for (let index = 1; index <= 0xfff; index += 1) {
      const id = `${prefix}${index.toString(16).toUpperCase().padStart(3, '0')}`;
      generatedIds.set(id, `${category}-collider-${index}`);
    }
  }
  return generatedIds;
};

export const getDeclaredRegressionColliderDebugIds = (): ReadonlyMap<
  string,
  string
> => new Map(Object.entries(DECLARED_REGRESSION_COLLIDER_IDS));

export const assertDebugColliderIdsDoNotCollide = (
  declaredIds: Iterable<readonly [string, string]>
): void => {
  const usedIds = getGeneratedColliderDebugIds();

  for (const [name, id] of [
    ...Object.entries(DECLARED_REGRESSION_COLLIDER_IDS),
    ...declaredIds,
  ]) {
    if (!DEBUG_COLLIDER_ID_PATTERN.test(id)) {
      throw new Error(`Invalid debug collider ID ${id} declared for ${name}`);
    }
    const existingName = usedIds.get(id);
    if (existingName) {
      throw new Error(
        `Debug collider ID ${id} is declared for both ${existingName} and ${name}`
      );
    }
    usedIds.set(id, name);
  }
};

assertDebugColliderIdsDoNotCollide([]);

export const getDeclaredColliderDebugId = (
  input: DebugColliderIdLookupInput
): string | undefined =>
  DECLARED_REGRESSION_COLLIDER_IDS[
    input.name as keyof typeof DECLARED_REGRESSION_COLLIDER_IDS
  ] ?? getGeneratedColliderId(input);
