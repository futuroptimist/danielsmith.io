import type { WallSegmentInstance } from '../../assets/floorPlan/wallSegments';

import { getDebugHash } from './debugIds';

export type SourceBackedWallColliderFloor = 'ground' | 'upper';

export interface SourceBackedWallColliderIdentity {
  name: string;
  debugId: string;
}

const formatWallColliderNamePrefix = (
  floor: SourceBackedWallColliderFloor,
  isFence: boolean
): string => {
  if (floor === 'upper') return 'UpperWallCollider';
  return isFence ? 'GroundFenceCollider' : 'GroundWallCollider';
};

export const getSourceBackedWallColliderIdentity = (
  floor: SourceBackedWallColliderFloor,
  instance: Pick<WallSegmentInstance, 'sourceId' | 'segmentId' | 'isFence'>
): SourceBackedWallColliderIdentity => {
  const prefix = formatWallColliderNamePrefix(floor, instance.isFence);
  const sourceKey = `${instance.sourceId}:${instance.segmentId}`;
  const name = `${prefix}:${sourceKey}`;

  return {
    name,
    debugId: getDebugHash(name),
  };
};
