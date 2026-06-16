import { getDebugHash } from '../debug/debugIds';

const LEVEL_SOURCE_ID_PATTERN =
  /^[a-z0-9][A-Za-z0-9_-]*(?:\.[a-z0-9][A-Za-z0-9_-]*)*$/;
const DEBUG_REF_MIN_LENGTH = 1;
const DEBUG_REF_MAX_LENGTH = 6;

export type LevelSourceId = string & {
  readonly __levelSourceId: unique symbol;
};

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

export const isLevelSourceId = (value: unknown): value is LevelSourceId =>
  typeof value === 'string' && LEVEL_SOURCE_ID_PATTERN.test(value);

const describeLevelSourceIdError = (value: string): string => {
  if (value.length === 0) {
    return 'Source IDs must not be empty.';
  }

  if (value.includes('/')) {
    return 'Use dot-separated hierarchy instead of slash paths.';
  }

  if (/\s/.test(value)) {
    return 'Source IDs must not contain whitespace.';
  }

  if (value.startsWith('.') || value.endsWith('.') || value.includes('..')) {
    return 'Source IDs must not contain empty hierarchy segments.';
  }

  if (/[A-Z]/.test(value)) {
    return 'Source ID hierarchy segments must start with a lowercase letter or digit.';
  }

  return 'Allowed characters are letters, digits, dot, underscore, and hyphen; each segment must start lowercase or numeric.';
};

export const assertLevelSourceId = (value: string): LevelSourceId => {
  if (!isLevelSourceId(value)) {
    throw new Error(
      `Invalid level source ID "${value}": ${describeLevelSourceIdError(value)}`
    );
  }

  return value;
};

export const makeLevelSourceId = (parts: readonly string[]): LevelSourceId => {
  if (parts.length === 0) {
    throw new Error('Level source IDs require at least one hierarchy part.');
  }

  for (const part of parts) {
    if (part.length === 0) {
      throw new Error('Level source ID hierarchy parts must not be empty.');
    }

    if (part.includes('.')) {
      throw new Error(`Level source ID part "${part}" must not contain dots.`);
    }
  }

  return assertLevelSourceId(parts.join('.'));
};

export const joinLevelSourceId = (...parts: string[]): LevelSourceId =>
  makeLevelSourceId(parts);

export const getLevelSourceDebugRef = (
  sourceId: LevelSourceId,
  length = 6
): string => {
  if (
    !Number.isInteger(length) ||
    length < DEBUG_REF_MIN_LENGTH ||
    length > DEBUG_REF_MAX_LENGTH
  ) {
    throw new Error(
      `Level source debug reference length must be an integer from ${DEBUG_REF_MIN_LENGTH} to ${DEBUG_REF_MAX_LENGTH}.`
    );
  }

  return getDebugHash(sourceId).slice(0, length);
};
