import type { RectCollider } from '../../systems/collision';
import type { DebugColliderId } from '../debug/colliderDebugIds';

export type CollisionIntent =
  | 'physical-boundary'
  | 'safety-guard'
  | 'interaction-footprint'
  | 'secondary-backstop';

export interface ActiveSourceCollisionPolicy {
  kind: 'active';
  intent: CollisionIntent;
  purpose: string;
  name: string;
  debugId?: DebugColliderId;
}

export interface NoSourceCollisionPolicy {
  kind: 'none';
  rationale: string;
}

export type SourceCollisionPolicy =
  | ActiveSourceCollisionPolicy
  | NoSourceCollisionPolicy;

export interface SourceBackedCollider<
  Role extends string,
  SourceId extends string,
  SourceType extends string,
> {
  role: Role;
  sourceId: SourceId;
  sourceType: SourceType;
  intent: CollisionIntent;
  purpose: string;
  bounds: RectCollider;
  name: string;
  debugId?: DebugColliderId;
}

export const isActiveSourceCollisionPolicy = (
  policy: SourceCollisionPolicy
): policy is ActiveSourceCollisionPolicy => policy.kind === 'active';
