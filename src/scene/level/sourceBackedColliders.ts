import type { RectCollider } from '../../systems/collision';
import type { DebugColliderId } from '../debug/colliderDebugIds';

import type { LevelSourceId } from './sourceIds';

export type CollisionIntent =
  | 'physical-boundary'
  | 'safety-guard'
  | 'interaction-footprint'
  | 'secondary-backstop';

export interface ActiveSourceCollisionPolicy {
  collision: 'active';
  intent: CollisionIntent;
  purpose: string;
  runtimeName?: string;
  debugId?: DebugColliderId;
}

export interface NoSourceCollisionPolicy {
  collision: 'none';
  rationale: string;
}

export type SourceCollisionPolicy =
  | ActiveSourceCollisionPolicy
  | NoSourceCollisionPolicy;

export interface SourceBackedColliderRecord<
  Role extends string = string,
  SourceType extends string = string,
> {
  role: Role;
  sourceId: LevelSourceId;
  sourceType: SourceType;
  intent: CollisionIntent;
  purpose: string;
  bounds: RectCollider;
  name: string;
  debugId?: DebugColliderId;
}
