import type { RectCollider } from '../../systems/collision';
import {
  assertDebugColliderId,
  type DebugColliderId,
} from '../debug/colliderDebugIds';

import type { SourceBackedCollider } from './sourceCollision';
import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type BackyardPerimeterRole =
  | 'leftFenceBoundary'
  | 'rightFenceBoundary'
  | 'backFenceBoundary'
  | 'hologramBarrier';

export type BackyardPerimeterSourceType = 'generatedCollider';

interface FenceSegmentPolicy {
  role: Exclude<BackyardPerimeterRole, 'hologramBarrier'>;
  sourceId: LevelSourceId;
  runtimeName: string;
  purpose: string;
  debugId?: DebugColliderId;
  side: 'left' | 'right' | 'back';
}

export interface BackyardFenceLayout {
  fenceInsetX: number;
  fenceFrontZ: number;
  fenceBackZ: number;
}

export interface BackyardFenceSegment extends FenceSegmentPolicy {
  start: { x: number; z: number };
  end: { x: number; z: number };
  bounds: RectCollider;
}

interface HologramBarrierPolicy {
  role: 'hologramBarrier';
  sourceId: LevelSourceId;
  runtimeName: string;
  purpose: string;
}

const sourceId = (value: string): LevelSourceId => assertLevelSourceId(value);
const debugId = (value: string): DebugColliderId =>
  assertDebugColliderId(value);

const FENCE_COLLIDER_REACH = 0.3;
const SIDE_FENCE_INNER_REACH = 0.18;
const SIDE_FENCE_OUTER_REACH = 0.12;

export const BACKYARD_FENCE_POLICIES: readonly FenceSegmentPolicy[] = [
  {
    role: 'leftFenceBoundary',
    sourceId: sourceId('ground.backyard.perimeter.leftFenceBoundary'),
    runtimeName: 'BackyardLeftFenceBoundary',
    purpose: 'Blocks movement through the visible left backyard fence.',
    side: 'left',
  },
  {
    role: 'rightFenceBoundary',
    sourceId: sourceId('ground.backyard.perimeter.rightFenceBoundary'),
    runtimeName: 'BackyardRightFenceBoundary',
    purpose: 'Blocks movement through the visible right backyard fence.',
    side: 'right',
  },
  {
    role: 'backFenceBoundary',
    sourceId: sourceId('ground.backyard.perimeter.backFenceBoundary'),
    runtimeName: 'BackyardBackFenceBoundary',
    purpose:
      'Preserves the visible back fence as an explicit physical boundary.',
    debugId: debugId('1007'),
    side: 'back',
  },
];

export const BACKYARD_HOLOGRAM_BARRIER_POLICY: HologramBarrierPolicy = {
  role: 'hologramBarrier',
  sourceId: sourceId('ground.backyard.perimeter.hologramBarrier'),
  runtimeName: 'BackyardHologramBarrierBoundary',
  purpose: 'Blocks movement through the active hologram exhibit barrier.',
};

export const createBackyardFenceSegments = (
  bounds: { minX: number; maxX: number },
  layout: BackyardFenceLayout
): readonly BackyardFenceSegment[] =>
  BACKYARD_FENCE_POLICIES.map((policy) => {
    const leftX = bounds.minX + layout.fenceInsetX;
    const rightX = bounds.maxX - layout.fenceInsetX;

    if (policy.side === 'left') {
      return {
        ...policy,
        start: { x: leftX, z: layout.fenceFrontZ },
        end: { x: leftX, z: layout.fenceBackZ },
        bounds: {
          minX: leftX - SIDE_FENCE_OUTER_REACH,
          maxX: leftX + SIDE_FENCE_INNER_REACH,
          minZ: layout.fenceFrontZ - FENCE_COLLIDER_REACH,
          maxZ: layout.fenceBackZ + FENCE_COLLIDER_REACH,
        },
      };
    }

    if (policy.side === 'right') {
      return {
        ...policy,
        start: { x: rightX, z: layout.fenceFrontZ },
        end: { x: rightX, z: layout.fenceBackZ },
        bounds: {
          minX: rightX - SIDE_FENCE_INNER_REACH,
          maxX: rightX + SIDE_FENCE_OUTER_REACH,
          minZ: layout.fenceFrontZ - FENCE_COLLIDER_REACH,
          maxZ: layout.fenceBackZ + FENCE_COLLIDER_REACH,
        },
      };
    }

    return {
      ...policy,
      start: { x: leftX, z: layout.fenceBackZ },
      end: { x: rightX, z: layout.fenceBackZ },
      bounds: {
        minX: leftX + SIDE_FENCE_INNER_REACH,
        maxX: rightX - SIDE_FENCE_INNER_REACH,
        minZ: layout.fenceBackZ - FENCE_COLLIDER_REACH,
        maxZ: layout.fenceBackZ + FENCE_COLLIDER_REACH,
      },
    };
  });

export const createBackyardFenceCollider = (
  segment: BackyardFenceSegment
): SourceBackedCollider<
  BackyardPerimeterRole,
  LevelSourceId,
  BackyardPerimeterSourceType
> => ({
  role: segment.role,
  sourceId: segment.sourceId,
  sourceType: 'generatedCollider',
  intent: 'physical-boundary',
  purpose: segment.purpose,
  bounds: segment.bounds,
  name: segment.runtimeName,
  ...(segment.debugId ? { debugId: segment.debugId } : {}),
});

export const createBackyardHologramBarrierCollider = (
  bounds: RectCollider
): SourceBackedCollider<
  BackyardPerimeterRole,
  LevelSourceId,
  BackyardPerimeterSourceType
> => ({
  role: BACKYARD_HOLOGRAM_BARRIER_POLICY.role,
  sourceId: BACKYARD_HOLOGRAM_BARRIER_POLICY.sourceId,
  sourceType: 'generatedCollider',
  intent: 'physical-boundary',
  purpose: BACKYARD_HOLOGRAM_BARRIER_POLICY.purpose,
  bounds,
  name: BACKYARD_HOLOGRAM_BARRIER_POLICY.runtimeName,
});
