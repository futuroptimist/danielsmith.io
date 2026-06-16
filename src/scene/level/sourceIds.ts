import { DEBUG_ID_MAX_LENGTH, getDebugHash } from '../debug/debugIds';

export type LevelSourceId = string & {
  readonly __levelSourceIdBrand: unique symbol;
};

export const LEVEL_SOURCE_ID_PATTERN = /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/;

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
  sourceId: LevelSourceId;
  sourceType: LevelSourceType;
  purpose?: string;
}

const describeSourceIdFormat = (): string =>
  'Level source IDs must be dot-separated lowercase segments containing only ' +
  'letters, digits, underscores, and hyphens.';

export const isLevelSourceId = (value: unknown): value is LevelSourceId =>
  typeof value === 'string' && LEVEL_SOURCE_ID_PATTERN.test(value);

export const assertLevelSourceId = (value: string): LevelSourceId => {
  if (isLevelSourceId(value)) {
    return value;
  }

  throw new Error(
    `Invalid level source ID "${value}". ${describeSourceIdFormat()}`
  );
};

export const makeLevelSourceId = (parts: readonly string[]): LevelSourceId => {
  if (parts.length === 0) {
    throw new Error('Level source IDs require at least one path segment.');
  }

  for (const part of parts) {
    if (part.length === 0) {
      throw new Error('Level source ID segments must not be empty.');
    }

    if (part.includes('.')) {
      throw new Error(
        `Level source ID segment "${part}" must not contain dots; pass hierarchy as parts.`
      );
    }
  }

  return assertLevelSourceId(parts.join('.'));
};

export const joinLevelSourceId = (...parts: string[]): LevelSourceId =>
  makeLevelSourceId(parts);

export const getLevelSourceDebugRef = (
  sourceId: LevelSourceId,
  length = DEBUG_ID_MAX_LENGTH
): string => {
  if (!Number.isInteger(length) || length < 1 || length > DEBUG_ID_MAX_LENGTH) {
    throw new Error(
      `Level source debug refs must request an integer length from 1 to ${DEBUG_ID_MAX_LENGTH}.`
    );
  }

  return getDebugHash(sourceId).slice(0, length);
};
