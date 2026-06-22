import type { RectCollider } from '../../systems/collision';
import { isDebugColliderId } from '../debug/colliderDebugIds';

import type {
  SourceBackedCollider,
  SourceCollisionPolicy,
} from './sourceCollision';
import { isActiveSourceCollisionPolicy } from './sourceCollision';
import { isLevelSourceId } from './sourceIds';

export interface SourcePolicyContractInput {
  readonly sourceId: unknown;
  readonly role: unknown;
  readonly collision: SourceCollisionPolicy;
}

export type SourceBackedColliderRecord = SourceBackedCollider<
  string,
  string,
  string
> &
  Partial<RectCollider>;

export interface ActiveRecordValidationOptions {
  readonly allowMultipleBoundsFor?: ReadonlySet<string> | readonly string[];
}

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const validateBounds = (bounds: RectCollider, label: string): string[] => {
  const errors: string[] = [];
  const values = [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ];

  if (values.some((value) => !Number.isFinite(value))) {
    errors.push(`${label} bounds must be finite.`);
  }
  if (!(bounds.minX < bounds.maxX) || !(bounds.minZ < bounds.maxZ)) {
    errors.push(`${label} bounds must be normalized.`);
  }

  return errors;
};

const assertNoErrors = (errors: string[], label: string): void => {
  if (errors.length > 0) {
    throw new Error(
      `${label} failed collider contract validation:\n- ${errors.join('\n- ')}`
    );
  }
};

export const validateSourceCollisionPolicy = (
  policy: SourcePolicyContractInput,
  label = String(policy.role || policy.sourceId || 'source policy')
): void => {
  const errors: string[] = [];

  if (!isLevelSourceId(policy.sourceId)) {
    errors.push(
      `${label} sourceId must be a valid hierarchical level source ID.`
    );
  }
  if (!hasText(policy.role)) {
    errors.push(`${label} role must be nonempty.`);
  }

  if (isActiveSourceCollisionPolicy(policy.collision)) {
    if (!hasText(policy.collision.intent)) {
      errors.push(`${label} active collision policy requires intent.`);
    }
    if (!hasText(policy.collision.purpose)) {
      errors.push(`${label} active collision policy requires purpose.`);
    }
    if (!hasText(policy.collision.runtimeName)) {
      errors.push(`${label} active collision policy requires runtimeName.`);
    }
    if (
      policy.collision.debugId !== undefined &&
      !isDebugColliderId(policy.collision.debugId)
    ) {
      errors.push(
        `${label} explicit debugId must be a valid debug collider ID.`
      );
    }
  } else if (!hasText(policy.collision.rationale)) {
    errors.push(`${label} no-collision policy requires a nonempty rationale.`);
  }

  assertNoErrors(errors, label);
};

export const validateSourceCollisionPolicies = (
  policies: readonly SourcePolicyContractInput[],
  label = 'source policies'
): void => {
  const errors: string[] = [];
  policies.forEach((policy) => {
    try {
      validateSourceCollisionPolicy(policy);
    } catch (error) {
      errors.push((error as Error).message);
    }
  });
  assertNoErrors(errors, label);
};

export const validateActiveSourceColliderRecords = (
  records: readonly SourceBackedColliderRecord[],
  options: ActiveRecordValidationOptions = {},
  label = 'active collider records'
): void => {
  const errors: string[] = [];
  const debugIds = new Map<string, string>();
  const sourceRoleKeys = new Map<string, string>();
  const multiBoundFamilies = new Set(options.allowMultipleBoundsFor ?? []);

  records.forEach((record) => {
    const recordLabel = record.name || `${record.sourceId}:${record.role}`;
    const bounds = record.bounds ?? record;
    errors.push(...validateBounds(bounds, recordLabel));

    if (!isLevelSourceId(record.sourceId)) {
      errors.push(`${recordLabel} sourceId must be valid source metadata.`);
    }
    if (!hasText(record.sourceType)) {
      errors.push(`${recordLabel} sourceType must be valid source metadata.`);
    }
    if (!hasText(record.role)) {
      errors.push(`${recordLabel} role must be nonempty.`);
    }
    if (!hasText(record.intent)) {
      errors.push(`${recordLabel} intent must be nonempty.`);
    }
    if (!hasText(record.purpose)) {
      errors.push(`${recordLabel} purpose must be nonempty.`);
    }
    if (!hasText(record.name)) {
      errors.push(`${recordLabel} runtime name must be nonempty.`);
    }

    if (record.debugId !== undefined) {
      if (!isDebugColliderId(record.debugId)) {
        errors.push(`${recordLabel} explicit debugId must be valid.`);
      }
      const prior = debugIds.get(record.debugId);
      if (prior) {
        errors.push(
          `${recordLabel} duplicates explicit debugId ${record.debugId} from ${prior}.`
        );
      }
      debugIds.set(record.debugId, recordLabel);
    }

    const sourceRoleKey = `${record.sourceId}::${record.role}`;
    if (!multiBoundFamilies.has(sourceRoleKey)) {
      const prior = sourceRoleKeys.get(sourceRoleKey);
      if (prior) {
        errors.push(
          `${recordLabel} duplicates source/role ${sourceRoleKey} from ${prior}.`
        );
      }
      sourceRoleKeys.set(sourceRoleKey, recordLabel);
    }
  });

  assertNoErrors(errors, label);
};
