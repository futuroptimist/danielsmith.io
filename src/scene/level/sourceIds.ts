import { getStableDebugHashValue } from '../debug/debugIds';

const LEVEL_SOURCE_ID_SEGMENT_PATTERN = /^[a-z0-9][A-Za-z0-9_-]*$/;
const LEVEL_SOURCE_DEBUG_REF_MIN_LENGTH = 1;
const LEVEL_SOURCE_DEBUG_REF_MAX_LENGTH = 12;

declare const levelSourceIdBrand: unique symbol;

/**
 * Semantic identity for an intended level concept or a generated child artifact.
 *
 * Source IDs are dot-separated, human-readable paths. They may use lower camel
 * case within a segment, but every segment must start with a lowercase letter or
 * digit and may only contain ASCII letters, digits, underscores, or hyphens.
 */
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
  sourceId: LevelSourceId;
  sourceType: LevelSourceType;
  purpose?: string;
}

export const isLevelSourceId = (value: unknown): value is LevelSourceId =>
  typeof value === 'string' && getLevelSourceIdValidationError(value) === null;

export const assertLevelSourceId = (value: string): LevelSourceId => {
  const validationError = getLevelSourceIdValidationError(value);
  if (validationError !== null) {
    throw new Error(`Invalid level source ID "${value}": ${validationError}`);
  }

  return value as LevelSourceId;
};

export const makeLevelSourceId = (parts: readonly string[]): LevelSourceId => {
  if (parts.length === 0) {
    throw new Error('Level source ID requires at least one part');
  }

  return assertLevelSourceId(parts.join('.'));
};

export const joinLevelSourceId = (...parts: string[]): LevelSourceId =>
  makeLevelSourceId(parts);

export const getLevelSourceDebugRef = (
  sourceId: LevelSourceId,
  length = 6
): string => {
  assertDebugRefLength(length);

  return Math.floor(getStableDebugHashValue(sourceId) % 16 ** length)
    .toString(16)
    .toUpperCase()
    .padStart(length, '0');
};

const getLevelSourceIdValidationError = (value: string): string | null => {
  if (value.length === 0) {
    return 'source IDs cannot be empty';
  }

  if (/\s/.test(value)) {
    return 'source IDs cannot contain whitespace';
  }

  if (value.includes('/')) {
    return 'source IDs must use dot hierarchy, not slash paths';
  }

  if (value.startsWith('.') || value.endsWith('.')) {
    return 'source IDs cannot start or end with a dot';
  }

  if (value.includes('..')) {
    return 'source IDs cannot contain empty segments';
  }

  const invalidSegment = value
    .split('.')
    .find((segment) => !LEVEL_SOURCE_ID_SEGMENT_PATTERN.test(segment));
  if (invalidSegment !== undefined) {
    return [
      `invalid segment "${invalidSegment}"`,
      'segments must start with lowercase ASCII or a digit',
      'and contain only ASCII letters, digits, underscores, or hyphens',
    ].join('; ');
  }

  return null;
};

const assertDebugRefLength = (length: number): void => {
  if (
    !Number.isInteger(length) ||
    length < LEVEL_SOURCE_DEBUG_REF_MIN_LENGTH ||
    length > LEVEL_SOURCE_DEBUG_REF_MAX_LENGTH
  ) {
    throw new Error(
      [
        'Level source debug ref length must be an integer from',
        `${LEVEL_SOURCE_DEBUG_REF_MIN_LENGTH} to ${LEVEL_SOURCE_DEBUG_REF_MAX_LENGTH}`,
      ].join(' ')
    );
  }
};
