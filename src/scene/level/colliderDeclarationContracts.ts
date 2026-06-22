import type { RectCollider } from '../../systems/collision';
import {
  assertDebugColliderId,
  type DebugColliderId,
} from '../debug/colliderDebugIds';

import {
  isActiveSourceCollisionPolicy,
  type SourceBackedCollider,
  type SourceCollisionPolicy,
} from './sourceCollision';
import { assertLevelSourceId } from './sourceIds';

export interface SourceCollisionPolicyDeclaration<
  Role extends string = string,
> {
  role: Role;
  sourceId: string;
  collision: SourceCollisionPolicy;
}

export type ActiveSourceRecord<Role extends string = string> =
  | SourceBackedCollider<Role, string, string>
  | (RectCollider & Omit<SourceBackedCollider<Role, string, string>, 'bounds'>);

export interface ActiveRecordValidationOptions<Role extends string = string> {
  allowMultipleBoundsFor?: (record: ActiveSourceRecord<Role>) => boolean;
}

const hasText = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const describeRecord = (
  record: Pick<ActiveSourceRecord, 'sourceId' | 'role'>
) => `${record.sourceId} (${record.role})`;

export const validateSourceCollisionPolicies = (
  policies: readonly SourceCollisionPolicyDeclaration[],
  familyName = 'source collision policies'
): void => {
  policies.forEach((policy, index) => {
    const owner = `${familyName}[${index}] ${policy.sourceId}`;
    assertLevelSourceId(policy.sourceId);

    if (!hasText(policy.role)) {
      throw new Error(`${owner} must declare a nonempty semantic role.`);
    }

    if (isActiveSourceCollisionPolicy(policy.collision)) {
      if (!hasText(policy.collision.intent)) {
        throw new Error(
          `${owner} active collision policy must declare intent.`
        );
      }
      if (!hasText(policy.collision.purpose)) {
        throw new Error(
          `${owner} active collision policy must declare purpose.`
        );
      }
      if (policy.collision.debugId !== undefined) {
        assertDebugColliderId(policy.collision.debugId);
      }
      return;
    }

    if (!hasText(policy.collision.rationale)) {
      throw new Error(`${owner} no-collision policy must declare rationale.`);
    }
  });
};

export const validateActiveSourceRecords = <Role extends string>(
  records: readonly ActiveSourceRecord<Role>[],
  familyName = 'active source records',
  options: ActiveRecordValidationOptions<Role> = {}
): void => {
  const debugIds = new Map<DebugColliderId, string>();
  const activeKeys = new Map<string, string>();

  records.forEach((record, index) => {
    const owner = `${familyName}[${index}] ${describeRecord(record)}`;
    assertLevelSourceId(record.sourceId);

    if (!hasText(record.role)) throw new Error(`${owner} must declare role.`);
    if (!hasText(record.sourceType)) {
      throw new Error(`${owner} must declare sourceType.`);
    }
    if (!hasText(record.intent))
      throw new Error(`${owner} must declare intent.`);
    if (!hasText(record.purpose))
      throw new Error(`${owner} must declare purpose.`);
    if (!hasText(record.name))
      throw new Error(`${owner} must declare runtime name.`);
    validateNormalizedBounds(getRecordBounds(record), owner);

    if (record.debugId !== undefined) {
      const debugId = assertDebugColliderId(record.debugId);
      const existing = debugIds.get(debugId);
      if (existing) {
        throw new Error(
          `Duplicate explicit debug ID ${debugId} on ${existing} and ${owner}.`
        );
      }
      debugIds.set(debugId, owner);
    }

    if (!options.allowMultipleBoundsFor?.(record)) {
      const key = `${record.sourceId}\u0000${record.role}`;
      const existing = activeKeys.get(key);
      if (existing) {
        throw new Error(
          `Duplicate active source-role record ${describeRecord(record)} on ${existing} and ${owner}.`
        );
      }
      activeKeys.set(key, owner);
    }
  });
};

const getRecordBounds = (record: ActiveSourceRecord): RectCollider =>
  'bounds' in record ? record.bounds : record;

const validateNormalizedBounds = (
  bounds: RectCollider,
  owner: string
): void => {
  const values = [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ];
  if (!values.every(Number.isFinite)) {
    throw new Error(`${owner} bounds must contain only finite numbers.`);
  }
  if (bounds.minX >= bounds.maxX || bounds.minZ >= bounds.maxZ) {
    throw new Error(`${owner} bounds must be normalized with positive area.`);
  }
};
