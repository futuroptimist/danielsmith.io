import type { Bounds2D } from '../../assets/floorPlan';
import { assertDebugColliderId } from '../debug/colliderDebugIds';
import type { DebugColliderId } from '../debug/colliderDebugIds';

import type { SourceBackedCollider } from './sourceCollision';
import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type BackyardCollisionRole =
  | 'left-fence-boundary'
  | 'right-fence-boundary'
  | 'back-fence-boundary'
  | 'hologram-barrier';

export interface BackyardPerimeterSegmentPolicy {
  role: Exclude<BackyardCollisionRole, 'hologram-barrier'>;
  sourceId: LevelSourceId;
  runtimeName: string;
  visualRunName: string;
  intent: 'physical-boundary';
  purpose: string;
  debugId?: DebugColliderId;
  getEndpoints(layout: BackyardPerimeterLayout): {
    start: { x: number; z: number };
    end: { x: number; z: number };
  };
  getBounds(layout: BackyardPerimeterLayout): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

export interface BackyardPerimeterLayout {
  bounds: Bounds2D;
  fenceInsetX: number;
  fenceFrontZ: number;
  fenceBackZ: number;
}

export type BackyardSourceBackedCollider = SourceBackedCollider<
  BackyardCollisionRole,
  LevelSourceId,
  'generatedCollider'
>;

const sourceId = (value: string): LevelSourceId => assertLevelSourceId(value);
const debugId = (value: string): DebugColliderId =>
  assertDebugColliderId(value);

export const BACKYARD_PERIMETER_SEGMENT_POLICIES = [
  {
    role: 'left-fence-boundary',
    sourceId: sourceId('ground.backyard.perimeter.leftFenceBoundary'),
    runtimeName: 'BackyardLeftFenceBoundary',
    visualRunName: 'BackyardFenceRun-left-fence-boundary',
    intent: 'physical-boundary',
    purpose: 'block the west backyard perimeter fence line',
    getEndpoints: ({ bounds, fenceInsetX, fenceFrontZ, fenceBackZ }) => ({
      start: { x: bounds.minX + fenceInsetX, z: fenceFrontZ },
      end: { x: bounds.minX + fenceInsetX, z: fenceBackZ },
    }),
    getBounds: ({ bounds, fenceInsetX, fenceFrontZ, fenceBackZ }) => ({
      minX: bounds.minX + fenceInsetX - 0.12,
      maxX: bounds.minX + fenceInsetX + 0.18,
      minZ: fenceFrontZ - 0.3,
      maxZ: fenceBackZ + 0.3,
    }),
  },
  {
    role: 'right-fence-boundary',
    sourceId: sourceId('ground.backyard.perimeter.rightFenceBoundary'),
    runtimeName: 'BackyardRightFenceBoundary',
    visualRunName: 'BackyardFenceRun-right-fence-boundary',
    intent: 'physical-boundary',
    purpose: 'block the east backyard perimeter fence line',
    getEndpoints: ({ bounds, fenceInsetX, fenceFrontZ, fenceBackZ }) => ({
      start: { x: bounds.maxX - fenceInsetX, z: fenceFrontZ },
      end: { x: bounds.maxX - fenceInsetX, z: fenceBackZ },
    }),
    getBounds: ({ bounds, fenceInsetX, fenceFrontZ, fenceBackZ }) => ({
      minX: bounds.maxX - fenceInsetX - 0.18,
      maxX: bounds.maxX - fenceInsetX + 0.12,
      minZ: fenceFrontZ - 0.3,
      maxZ: fenceBackZ + 0.3,
    }),
  },
  {
    role: 'back-fence-boundary',
    sourceId: sourceId('ground.backyard.perimeter.backFenceBoundary'),
    runtimeName: 'BackyardBackFenceBoundary',
    visualRunName: 'BackyardFenceRun-back-fence-boundary',
    intent: 'physical-boundary',
    purpose: 'preserve the north backyard back-fence boundary',
    debugId: debugId('1007'),
    getEndpoints: ({ bounds, fenceInsetX, fenceBackZ }) => ({
      start: { x: bounds.minX + fenceInsetX, z: fenceBackZ },
      end: { x: bounds.maxX - fenceInsetX, z: fenceBackZ },
    }),
    getBounds: ({ bounds, fenceInsetX, fenceBackZ }) => ({
      minX: bounds.minX + fenceInsetX + 0.18,
      maxX: bounds.maxX - fenceInsetX - 0.18,
      minZ: fenceBackZ - 0.3,
      maxZ: fenceBackZ + 0.3,
    }),
  },
] as const satisfies readonly BackyardPerimeterSegmentPolicy[];

export const createBackyardHologramBarrierCollider = ({
  centerX,
  barrierZ,
  barrierWidth,
  barrierThickness,
}: {
  centerX: number;
  barrierZ: number;
  barrierWidth: number;
  barrierThickness: number;
}): BackyardSourceBackedCollider => ({
  role: 'hologram-barrier',
  sourceId: sourceId('ground.backyard.hologramBarrier.physicalBoundary'),
  sourceType: 'generatedCollider',
  intent: 'physical-boundary',
  purpose: 'block traversal through the backyard hologram barrier',
  name: 'BackyardHologramBarrierBoundary',
  bounds: {
    minX: centerX - barrierWidth / 2,
    maxX: centerX + barrierWidth / 2,
    minZ: barrierZ - barrierThickness / 2,
    maxZ: barrierZ + barrierThickness / 2,
  },
});
