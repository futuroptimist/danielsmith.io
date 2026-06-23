import type { WallSegmentInstance } from '../../assets/floorPlan/wallSegments';
import {
  assertDebugColliderId,
  type DebugColliderId,
} from '../debug/colliderDebugIds';
import { getDebugHash } from '../debug/debugIds';

export type WallColliderDebugFloor = 'ground' | 'upper';

export interface WallColliderDebugIdentity {
  name: string;
  debugId: DebugColliderId;
}

const WALL_COLLIDER_NAME_PREFIX = {
  ground: 'GroundWallCollider',
  upper: 'UpperWallCollider',
} as const satisfies Record<WallColliderDebugFloor, string>;

export function getWallColliderDebugIdentity(
  floor: WallColliderDebugFloor,
  instance: Pick<WallSegmentInstance, 'sourceId' | 'segmentId'>
): WallColliderDebugIdentity {
  const sourceId = String(instance.sourceId);
  const identitySeed = `${floor}|${sourceId}|${instance.segmentId}`;
  const debugId = assertDebugColliderId(getDebugHash(identitySeed));

  return {
    name: `${WALL_COLLIDER_NAME_PREFIX[floor]}:${sourceId}:${debugId}`,
    debugId,
  };
}
