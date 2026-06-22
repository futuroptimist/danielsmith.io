import type { RectCollider } from '../../systems/collision';
import { isDebugColliderId } from '../debug/colliderDebugIds';

import {
  isActiveSourceCollisionPolicy,
  type SourceBackedCollider,
  type SourceCollisionPolicy,
} from './sourceCollision';
import { isLevelSourceId, type LevelSourceId } from './sourceIds';

export interface SourceCollisionPolicyDeclaration<
  Role extends string = string,
> {
  role: Role;
  sourceId: LevelSourceId;
  collision: SourceCollisionPolicy;
}

export type SourceCollisionRecord<Role extends string = string> =
  | SourceBackedCollider<Role, LevelSourceId, string>
  | (RectCollider &
      Omit<SourceBackedCollider<Role, LevelSourceId, string>, 'bounds'>);

export interface SourceCollisionValidationOptions<
  Role extends string = string,
> {
  multiBoundRoles?: ReadonlySet<Role> | readonly Role[];
}

const isNonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const describeRecord = (
  record: Pick<SourceCollisionRecord, 'sourceId' | 'role'>
): string => `${record.sourceId} (${record.role})`;

const getRecordBounds = (record: SourceCollisionRecord): RectCollider =>
  'bounds' in record ? record.bounds : record;

const getMultiBoundRoles = <Role extends string>(
  roles: SourceCollisionValidationOptions<Role>['multiBoundRoles']
): ReadonlySet<Role> => (roles instanceof Set ? roles : new Set(roles ?? []));

export const validateSourceCollisionPolicy = <Role extends string>(
  declaration: SourceCollisionPolicyDeclaration<Role>
): string[] => {
  const errors: string[] = [];

  if (!isLevelSourceId(declaration.sourceId)) {
    errors.push(
      `Policy ${declaration.role} has invalid sourceId "${declaration.sourceId}".`
    );
  }
  if (!isNonEmpty(declaration.role)) {
    errors.push(
      `Policy ${declaration.sourceId} requires a nonempty semantic role.`
    );
  }

  if (isActiveSourceCollisionPolicy(declaration.collision)) {
    if (!isNonEmpty(declaration.collision.intent)) {
      errors.push(`Active policy ${declaration.sourceId} requires an intent.`);
    }
    if (!isNonEmpty(declaration.collision.purpose)) {
      errors.push(`Active policy ${declaration.sourceId} requires a purpose.`);
    }
    if (!isNonEmpty(declaration.collision.runtimeName)) {
      errors.push(
        `Active policy ${declaration.sourceId} requires a runtime name.`
      );
    }
    if (
      declaration.collision.debugId !== undefined &&
      !isDebugColliderId(declaration.collision.debugId)
    ) {
      errors.push(
        `Active policy ${declaration.sourceId} has invalid debugId "${declaration.collision.debugId}".`
      );
    }
  } else if (!isNonEmpty(declaration.collision.rationale)) {
    errors.push(
      `No-collision policy ${declaration.sourceId} requires a rationale.`
    );
  }

  return errors;
};

const validateBounds = (
  bounds: RectCollider,
  owner: string,
  errors: string[]
): void => {
  for (const key of ['minX', 'maxX', 'minZ', 'maxZ'] as const) {
    if (!Number.isFinite(bounds[key])) {
      errors.push(`${owner} bounds.${key} must be finite.`);
    }
  }
  if (!(bounds.minX < bounds.maxX)) {
    errors.push(`${owner} bounds must be normalized on X.`);
  }
  if (!(bounds.minZ < bounds.maxZ)) {
    errors.push(`${owner} bounds must be normalized on Z.`);
  }
};

export const validateSourceCollisionRecords = <Role extends string>(
  records: readonly SourceCollisionRecord<Role>[],
  options: SourceCollisionValidationOptions<Role> = {}
): string[] => {
  const errors: string[] = [];
  const debugIds = new Map<string, string>();
  const sourceRolePairs = new Map<string, string>();
  const multiBoundRoles = getMultiBoundRoles(options.multiBoundRoles);

  for (const record of records) {
    const owner = describeRecord(record);
    validateBounds(getRecordBounds(record), owner, errors);

    if (!isLevelSourceId(record.sourceId)) {
      errors.push(`${owner} has invalid sourceId.`);
    }
    if (!isNonEmpty(record.sourceType)) {
      errors.push(`${owner} requires a sourceType.`);
    }
    if (!isNonEmpty(record.intent)) {
      errors.push(`${owner} requires an intent.`);
    }
    if (!isNonEmpty(record.purpose)) {
      errors.push(`${owner} requires a purpose.`);
    }
    if (!isNonEmpty(record.role)) {
      errors.push(`${owner} requires a semantic role.`);
    }
    if (!isNonEmpty(record.name)) {
      errors.push(`${owner} requires a runtime name.`);
    }

    if (record.debugId !== undefined) {
      if (!isDebugColliderId(record.debugId)) {
        errors.push(`${owner} has invalid debugId "${record.debugId}".`);
      }
      const existing = debugIds.get(record.debugId);
      if (existing) {
        errors.push(
          `Debug ID ${record.debugId} is used by both ${existing} and ${owner}.`
        );
      }
      debugIds.set(record.debugId, owner);
    }

    const sourceRoleKey = `${record.sourceId}\u0000${record.role}`;
    const existing = sourceRolePairs.get(sourceRoleKey);
    if (existing && !multiBoundRoles.has(record.role)) {
      errors.push(
        `Duplicate active source/role ${owner}; already used by ${existing}.`
      );
    }
    sourceRolePairs.set(sourceRoleKey, owner);
  }

  return errors;
};
