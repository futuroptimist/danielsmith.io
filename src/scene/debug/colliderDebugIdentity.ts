import type { WallSegmentInstance } from '../../assets/floorPlan/wallSegments';
import type { FloorId } from '../../systems/movement/stairs';

const WALL_COLLIDER_NAME_PREFIXES = {
  ground: 'GroundWallCollider',
  upper: 'UpperWallCollider',
} as const satisfies Record<FloorId, string>;

export const getWallSegmentColliderDebugName = (
  floorId: FloorId,
  instance: Pick<WallSegmentInstance, 'sourceId' | 'segmentId'>
): string =>
  `${WALL_COLLIDER_NAME_PREFIXES[floorId]}:${instance.sourceId}:${instance.segmentId}`;
