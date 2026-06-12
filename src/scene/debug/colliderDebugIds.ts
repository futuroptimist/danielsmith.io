import type { DebugColliderFloor } from './colliderVisualizer';

export interface DebugColliderIdLookupInput {
  floor: DebugColliderFloor;
  category: string;
  name: string;
}

const DEBUG_COLLIDER_ID_PATTERN = /^[0-9A-F]{4,6}$/;

const GENERATED_COLLIDER_ID_PREFIXES = {
  ground: '1',
  static: '2',
  upper: '3',
} as const;

const DECLARED_NAMED_COLLIDER_IDS = {
  GroundStairEastBoundary: '4001',
  GroundStairLowerCornerGuard: '4002',
  UpperStairTopGapBlockerWest: '4003',
  UpperStairTopGapBlockerEast: '4004',
  UpperStairWestUpperVoidGuard: '4005',
  UpperStairEastLowerVoidGuard: '4006',
  UpperStairEastUpperVoidGuard: '4007',
  UpperStairHiddenRunVoidGuard: '4008',
  UpperStairWestBannisterGuard: '4009',
  UpperStairNorthBannisterGuard: '400A',
  'UpperStairwellLandingGuard-1': '400B',
  'UpperStairwellLandingGuard-2': '400C',
  'UpperStairwellLandingGuard-3': '400D',
  'UpperStairwellLandingGuard-4': '400E',
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

const assertValidDebugColliderIds = () => {
  const usedIds = new Map<string, string>();
  for (const [name, id] of Object.entries(DECLARED_NAMED_COLLIDER_IDS)) {
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

assertValidDebugColliderIds();

export const getDeclaredColliderDebugId = (
  input: DebugColliderIdLookupInput
): string | undefined =>
  DECLARED_NAMED_COLLIDER_IDS[
    input.name as keyof typeof DECLARED_NAMED_COLLIDER_IDS
  ] ?? getGeneratedColliderId(input);
