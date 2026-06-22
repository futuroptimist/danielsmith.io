import type { RectCollider } from '../../systems/collision';
import { isDebugColliderId } from '../debug/colliderDebugIds';

import type {
  SourceBackedCollider,
  SourceCollisionPolicy,
} from './sourceCollision';
import { isLevelSourceId } from './sourceIds';

export interface SourceCollisionDeclaration {
  role: string;
  sourceId: string;
  collision: SourceCollisionPolicy;
}

export type SourceCollisionRecord =
  | SourceBackedCollider<string, string, string>
  | (RectCollider &
      Omit<SourceBackedCollider<string, string, string>, 'bounds'>);

export interface SourceCollisionRecordValidationOptions {
  allowMultipleBoundsFor?: ReadonlySet<string> | readonly string[];
}

const isNonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const getAllowedFamilyKeys = (
  options: SourceCollisionRecordValidationOptions
): ReadonlySet<string> =>
  options.allowMultipleBoundsFor instanceof Set
    ? options.allowMultipleBoundsFor
    : new Set(options.allowMultipleBoundsFor ?? []);

const getRecordFamilyKey = (record: SourceCollisionRecord): string =>
  `${record.sourceId}::${record.role}`;

const getRecordBounds = (record: SourceCollisionRecord): RectCollider =>
  'bounds' in record ? record.bounds : record;

const assertNormalizedFiniteBounds = (record: SourceCollisionRecord): void => {
  const { minX, maxX, minZ, maxZ } = getRecordBounds(record);
  if (![minX, maxX, minZ, maxZ].every(Number.isFinite)) {
    throw new Error(`${record.name} has non-finite collider bounds.`);
  }
  if (minX >= maxX || minZ >= maxZ) {
    throw new Error(`${record.name} has non-normalized collider bounds.`);
  }
};

export const assertValidSourceCollisionPolicy = (
  declaration: SourceCollisionDeclaration
): void => {
  if (!isLevelSourceId(declaration.sourceId)) {
    throw new Error(`Invalid collision source ID "${declaration.sourceId}".`);
  }
  if (!isNonEmpty(declaration.role)) {
    throw new Error(
      `${declaration.sourceId} requires a nonempty semantic role.`
    );
  }

  const { collision } = declaration;
  if (collision.collision === 'active') {
    if (!isNonEmpty(collision.intent)) {
      throw new Error(`${declaration.sourceId} active policy requires intent.`);
    }
    if (!isNonEmpty(collision.purpose)) {
      throw new Error(
        `${declaration.sourceId} active policy requires purpose.`
      );
    }
    if (
      collision.debugId !== undefined &&
      !isDebugColliderId(collision.debugId)
    ) {
      throw new Error(
        `${declaration.sourceId} has invalid debug ID ${collision.debugId}.`
      );
    }
    return;
  }

  if (!isNonEmpty(collision.rationale)) {
    throw new Error(
      `${declaration.sourceId} no-collision policy requires rationale.`
    );
  }
};

export const assertValidSourceCollisionPolicies = (
  declarations: readonly SourceCollisionDeclaration[]
): void => {
  declarations.forEach(assertValidSourceCollisionPolicy);
};

export const assertValidSourceCollisionRecords = (
  records: readonly SourceCollisionRecord[],
  options: SourceCollisionRecordValidationOptions = {}
): void => {
  const debugIds = new Map<string, string>();
  const familyKeys = new Map<string, string>();
  const allowedFamilyKeys = getAllowedFamilyKeys(options);

  for (const record of records) {
    assertNormalizedFiniteBounds(record);
    if (!isLevelSourceId(record.sourceId)) {
      throw new Error(
        `${record.name} has invalid source ID "${record.sourceId}".`
      );
    }
    if (!isNonEmpty(record.role)) {
      throw new Error(`${record.sourceId} requires a nonempty semantic role.`);
    }
    if (!isNonEmpty(record.sourceType)) {
      throw new Error(`${record.sourceId} requires source metadata.`);
    }
    if (!isNonEmpty(record.name)) {
      throw new Error(`${record.sourceId} requires a nonempty runtime name.`);
    }
    if (!isNonEmpty(record.intent) || !isNonEmpty(record.purpose)) {
      throw new Error(`${record.name} requires active intent and purpose.`);
    }
    if (record.debugId !== undefined) {
      if (!isDebugColliderId(record.debugId)) {
        throw new Error(
          `${record.name} has invalid debug ID ${record.debugId}.`
        );
      }
      const duplicate = debugIds.get(record.debugId);
      if (duplicate) {
        throw new Error(
          `Debug ID ${record.debugId} is used by both ${duplicate} and ${record.name}.`
        );
      }
      debugIds.set(record.debugId, record.name);
    }

    const familyKey = getRecordFamilyKey(record);
    if (!allowedFamilyKeys.has(familyKey)) {
      const duplicate = familyKeys.get(familyKey);
      if (duplicate) {
        throw new Error(
          `${record.sourceId} role ${record.role} is emitted by both ${duplicate} and ${record.name}.`
        );
      }
      familyKeys.set(familyKey, record.name);
    }
  }
};
