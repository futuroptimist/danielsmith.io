import type { Bounds2D } from '../../assets/floorPlan';
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

export interface BackyardFenceSegmentPolicy {
  role: Exclude<BackyardPerimeterRole, 'hologramBarrier'>;
  sourceId: LevelSourceId;
  purpose: string;
  debugId?: DebugColliderId;
}

export interface BackyardFenceLayout {
  fenceHeight: number;
  fenceInsetX: number;
  fenceFrontPadding: number;
  fenceBackGap: number;
  fenceFrontZ: number;
  fenceBackZ: number;
  barrierZ: number;
}

export interface BackyardFenceSegment extends BackyardFenceSegmentPolicy {
  start: { x: number; z: number };
  end: { x: number; z: number };
  bounds: RectCollider;
  name: string;
}

export type BackyardPerimeterCollider = SourceBackedCollider<
  BackyardPerimeterRole,
  LevelSourceId,
  'generatedCollider'
>;

export interface BackyardBarrierPolicy {
  role: 'hologramBarrier';
  sourceId: LevelSourceId;
  purpose: string;
}

const sourceId = (value: string): LevelSourceId => assertLevelSourceId(value);
const debugId = (value: string): DebugColliderId =>
  assertDebugColliderId(value);

export const BACKYARD_FENCE_POLICIES: readonly BackyardFenceSegmentPolicy[] = [
  {
    role: 'leftFenceBoundary',
    sourceId: sourceId('ground.backyard.perimeter.leftFenceBoundary'),
    purpose: 'Block the west edge of the backyard perimeter fence.',
  },
  {
    role: 'rightFenceBoundary',
    sourceId: sourceId('ground.backyard.perimeter.rightFenceBoundary'),
    purpose: 'Block the east edge of the backyard perimeter fence.',
  },
  {
    role: 'backFenceBoundary',
    sourceId: sourceId('ground.backyard.perimeter.backFenceBoundary'),
    purpose: 'Keep the visible back fence as an explicit backyard boundary.',
    debugId: debugId('1007'),
  },
] as const;

export const BACKYARD_HOLOGRAM_BARRIER_POLICY: BackyardBarrierPolicy = {
  role: 'hologramBarrier',
  sourceId: sourceId('ground.backyard.perimeter.hologramBarrier'),
  purpose: 'Keep visitors in front of the active hologram gate.',
};

export const createBackyardFenceLayout = (
  bounds: Bounds2D
): BackyardFenceLayout => {
  const barrierZ = bounds.maxZ - 1.2;
  const fenceBackGap = 0.6;

  return {
    fenceHeight: 1.5,
    fenceInsetX: 0.35,
    fenceFrontPadding: 0.9,
    fenceBackGap,
    fenceFrontZ: bounds.minZ + 0.9,
    fenceBackZ: barrierZ - fenceBackGap,
    barrierZ,
  };
};

export const createBackyardFenceSegments = (
  bounds: Bounds2D,
  layout: BackyardFenceLayout = createBackyardFenceLayout(bounds)
): readonly BackyardFenceSegment[] => {
  const leftX = bounds.minX + layout.fenceInsetX;
  const rightX = bounds.maxX - layout.fenceInsetX;

  return BACKYARD_FENCE_POLICIES.map((policy) => {
    if (policy.role === 'leftFenceBoundary') {
      return {
        ...policy,
        name: 'backyard-left-fence-boundary',
        start: { x: leftX, z: layout.fenceFrontZ },
        end: { x: leftX, z: layout.fenceBackZ },
        bounds: {
          minX: leftX - 0.12,
          maxX: leftX + 0.18,
          minZ: layout.fenceFrontZ - 0.3,
          maxZ: layout.fenceBackZ + 0.3,
        },
      };
    }

    if (policy.role === 'rightFenceBoundary') {
      return {
        ...policy,
        name: 'backyard-right-fence-boundary',
        start: { x: rightX, z: layout.fenceFrontZ },
        end: { x: rightX, z: layout.fenceBackZ },
        bounds: {
          minX: rightX - 0.18,
          maxX: rightX + 0.12,
          minZ: layout.fenceFrontZ - 0.3,
          maxZ: layout.fenceBackZ + 0.3,
        },
      };
    }

    return {
      ...policy,
      name: 'backyard-back-fence-boundary',
      start: { x: leftX, z: layout.fenceBackZ },
      end: { x: rightX, z: layout.fenceBackZ },
      bounds: {
        minX: leftX + 0.18,
        maxX: rightX - 0.18,
        minZ: layout.fenceBackZ - 0.3,
        maxZ: layout.fenceBackZ + 0.3,
      },
    };
  });
};

export const createBackyardFenceColliders = (
  segments: readonly BackyardFenceSegment[]
): readonly BackyardPerimeterCollider[] =>
  segments.map((segment) => ({
    role: segment.role,
    sourceId: segment.sourceId,
    sourceType: 'generatedCollider',
    intent: 'physical-boundary',
    purpose: segment.purpose,
    bounds: segment.bounds,
    name: segment.name,
    debugId: segment.debugId,
  }));

export const createBackyardHologramBarrierCollider = (params: {
  centerX: number;
  barrierZ: number;
  barrierWidth: number;
  barrierThickness: number;
}): BackyardPerimeterCollider => ({
  role: BACKYARD_HOLOGRAM_BARRIER_POLICY.role,
  sourceId: BACKYARD_HOLOGRAM_BARRIER_POLICY.sourceId,
  sourceType: 'generatedCollider',
  intent: 'physical-boundary',
  purpose: BACKYARD_HOLOGRAM_BARRIER_POLICY.purpose,
  name: 'backyard-hologram-barrier-boundary',
  bounds: {
    minX: params.centerX - params.barrierWidth / 2,
    maxX: params.centerX + params.barrierWidth / 2,
    minZ: params.barrierZ - params.barrierThickness / 2,
    maxZ: params.barrierZ + params.barrierThickness / 2,
  },
});
