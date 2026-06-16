import { getDebugHash } from '../debug/debugIds';

const LEVEL_SOURCE_ID_PATTERN = /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/;
const LEVEL_SOURCE_DEBUG_REF_MIN_LENGTH = 1;
const LEVEL_SOURCE_DEBUG_REF_MAX_LENGTH = 6;

declare const levelSourceIdBrand: unique symbol;

export type LevelSourceId = string & { readonly [levelSourceIdBrand]: true };

export type LevelSourceType =
  | 'room'
  | 'wall'
  | 'floorSurface'
  | 'safetyCollider'
  | 'sceneObject'
  | 'roomConnection'
  | 'generatedCollider'
  | 'generatedSolid';

export interface LevelSourceMetadata {
  readonly sourceId: LevelSourceId;
  readonly sourceType: LevelSourceType;
  readonly purpose?: string;
}

export const isLevelSourceId = (value: unknown): value is LevelSourceId =>
  typeof value === 'string' && LEVEL_SOURCE_ID_PATTERN.test(value);

export const assertLevelSourceId = (value: string): LevelSourceId => {
  if (isLevelSourceId(value)) {
    return value;
  }

  throw new Error(
    `Invalid level source ID "${value}". Use dot-separated lowercase segments ` +
      'containing only letters, digits, underscores, or hyphens.'
  );
};

export const makeLevelSourceId = (parts: readonly string[]): LevelSourceId => {
  if (parts.length === 0) {
    throw new Error('Level source IDs require at least one hierarchy segment.');
  }

  return assertLevelSourceId(parts.join('.'));
};

export const joinLevelSourceId = (...parts: string[]): LevelSourceId =>
  makeLevelSourceId(parts);

export const getLevelSourceDebugRef = (
  sourceId: LevelSourceId,
  length = 6
): string => {
  if (!Number.isInteger(length)) {
    throw new Error('Level source debug reference length must be an integer.');
  }

  if (
    length < LEVEL_SOURCE_DEBUG_REF_MIN_LENGTH ||
    length > LEVEL_SOURCE_DEBUG_REF_MAX_LENGTH
  ) {
    throw new Error(
      `Level source debug reference length must be between ${LEVEL_SOURCE_DEBUG_REF_MIN_LENGTH} ` +
        `and ${LEVEL_SOURCE_DEBUG_REF_MAX_LENGTH}.`
    );
  }

  return getDebugHash(sourceId).slice(0, length);
};
