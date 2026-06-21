import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import {
  assertDebugColliderId,
  type DebugColliderId,
} from '../debug/colliderDebugIds';

import type { SourceBackedCollider } from './sourceCollision';
import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type BackyardCollisionRole =
  | 'leftFenceBoundary'
  | 'rightFenceBoundary'
  | 'backFenceBoundary'
  | 'hologramBarrier';

export interface BackyardFenceSegmentPolicy {
  role: Extract<
    BackyardCollisionRole,
    'leftFenceBoundary' | 'rightFenceBoundary' | 'backFenceBoundary'
  >;
  sourceId: LevelSourceId;
  name: string;
  purpose: string;
  debugId?: DebugColliderId;
}

export interface BackyardFenceLayout {
  fenceInsetX: number;
  fenceFrontPadding: number;
  fenceBackGap: number;
  barrierSetback: number;
}

export interface BackyardFenceSegment extends BackyardFenceSegmentPolicy {
  start: { x: number; z: number };
  end: { x: number; z: number };
  bounds: RectCollider;
}

type BackyardSourceColliderMetadata = Omit<
  SourceBackedCollider<
    BackyardCollisionRole,
    LevelSourceId,
    'generatedCollider'
  >,
  'bounds'
>;

export type BackyardSourceCollider = RectCollider &
  BackyardSourceColliderMetadata;

const sourceId = (value: string): LevelSourceId => assertLevelSourceId(value);
const debugId = (value: string): DebugColliderId =>
  assertDebugColliderId(value);

export const BACKYARD_FENCE_LAYOUT = {
  fenceInsetX: 0.35,
  fenceFrontPadding: 0.9,
  fenceBackGap: 0.6,
  barrierSetback: 1.2,
} as const satisfies BackyardFenceLayout;

export const BACKYARD_FENCE_SEGMENT_POLICIES = [
  {
    role: 'leftFenceBoundary',
    sourceId: sourceId('ground.backyard.perimeter.leftFence.boundary'),
    name: 'BackyardLeftFenceBoundary',
    purpose: 'block the west edge of the backyard perimeter fence',
  },
  {
    role: 'rightFenceBoundary',
    sourceId: sourceId('ground.backyard.perimeter.rightFence.boundary'),
    name: 'BackyardRightFenceBoundary',
    purpose: 'block the east edge of the backyard perimeter fence',
  },
  {
    role: 'backFenceBoundary',
    sourceId: sourceId('ground.backyard.perimeter.backFence.boundary'),
    name: 'BackyardBackFenceBoundary',
    purpose: 'preserve the visible back fence as a physical boundary',
    debugId: debugId('1006'),
  },
] as const satisfies readonly BackyardFenceSegmentPolicy[];

export const BACKYARD_HOLOGRAM_BARRIER_POLICY = {
  role: 'hologramBarrier',
  sourceId: sourceId('ground.backyard.hologramBarrier.boundary'),
  name: 'BackyardHologramBarrierBoundary',
  debugId: debugId('1007'),
  purpose: 'block traversal through the hologram barrier plane',
} as const;

const createFenceBounds = (
  role: BackyardFenceSegmentPolicy['role'],
  bounds: Bounds2D,
  layout: BackyardFenceLayout
): RectCollider => {
  const barrierZ = bounds.maxZ - layout.barrierSetback;
  const fenceFrontZ = bounds.minZ + layout.fenceFrontPadding;
  const fenceBackZ = barrierZ - layout.fenceBackGap;

  switch (role) {
    case 'leftFenceBoundary':
      return {
        minX: bounds.minX + layout.fenceInsetX - 0.12,
        maxX: bounds.minX + layout.fenceInsetX + 0.18,
        minZ: fenceFrontZ - 0.3,
        maxZ: fenceBackZ + 0.3,
      };
    case 'rightFenceBoundary':
      return {
        minX: bounds.maxX - layout.fenceInsetX - 0.18,
        maxX: bounds.maxX - layout.fenceInsetX + 0.12,
        minZ: fenceFrontZ - 0.3,
        maxZ: fenceBackZ + 0.3,
      };
    case 'backFenceBoundary':
      return {
        minX: bounds.minX + layout.fenceInsetX + 0.18,
        maxX: bounds.maxX - layout.fenceInsetX - 0.18,
        minZ: fenceBackZ - 0.3,
        maxZ: fenceBackZ + 0.3,
      };
  }
};

export const createBackyardFenceSegments = (
  bounds: Bounds2D,
  layout: BackyardFenceLayout = BACKYARD_FENCE_LAYOUT
): BackyardFenceSegment[] => {
  const barrierZ = bounds.maxZ - layout.barrierSetback;
  const fenceFrontZ = bounds.minZ + layout.fenceFrontPadding;
  const fenceBackZ = barrierZ - layout.fenceBackGap;
  const leftX = bounds.minX + layout.fenceInsetX;
  const rightX = bounds.maxX - layout.fenceInsetX;

  const endpoints = {
    leftFenceBoundary: {
      start: { x: leftX, z: fenceFrontZ },
      end: { x: leftX, z: fenceBackZ },
    },
    rightFenceBoundary: {
      start: { x: rightX, z: fenceFrontZ },
      end: { x: rightX, z: fenceBackZ },
    },
    backFenceBoundary: {
      start: { x: leftX, z: fenceBackZ },
      end: { x: rightX, z: fenceBackZ },
    },
  } as const;

  return BACKYARD_FENCE_SEGMENT_POLICIES.map((policy) => ({
    ...policy,
    ...endpoints[policy.role],
    bounds: createFenceBounds(policy.role, bounds, layout),
  }));
};

export const createBackyardFenceColliders = (
  segments: readonly BackyardFenceSegment[]
): BackyardSourceCollider[] =>
  segments.map((segment) => ({
    ...segment.bounds,
    role: segment.role,
    sourceId: segment.sourceId,
    sourceType: 'generatedCollider',
    intent: 'physical-boundary',
    purpose: segment.purpose,
    name: segment.name,
    ...(segment.debugId ? { debugId: segment.debugId } : {}),
  }));

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
}): BackyardSourceCollider => ({
  minX: centerX - barrierWidth / 2,
  maxX: centerX + barrierWidth / 2,
  minZ: barrierZ - barrierThickness / 2,
  maxZ: barrierZ + barrierThickness / 2,
  role: BACKYARD_HOLOGRAM_BARRIER_POLICY.role,
  sourceId: BACKYARD_HOLOGRAM_BARRIER_POLICY.sourceId,
  sourceType: 'generatedCollider',
  intent: 'physical-boundary',
  purpose: BACKYARD_HOLOGRAM_BARRIER_POLICY.purpose,
  name: BACKYARD_HOLOGRAM_BARRIER_POLICY.name,
  debugId: BACKYARD_HOLOGRAM_BARRIER_POLICY.debugId,
});

const BACKYARD_SOURCE_IDS: ReadonlySet<string> = new Set([
  BACKYARD_HOLOGRAM_BARRIER_POLICY.sourceId,
  ...BACKYARD_FENCE_SEGMENT_POLICIES.map((policy) => policy.sourceId),
]);

const BACKYARD_SOURCE_ROLES: ReadonlySet<string> = new Set([
  BACKYARD_HOLOGRAM_BARRIER_POLICY.role,
  ...BACKYARD_FENCE_SEGMENT_POLICIES.map((policy) => policy.role),
]);

export const isBackyardSourceCollider = (
  collider: RectCollider
): collider is BackyardSourceCollider => {
  const candidate = collider as Partial<BackyardSourceCollider>;
  return (
    typeof candidate.sourceId === 'string' &&
    BACKYARD_SOURCE_IDS.has(candidate.sourceId) &&
    typeof candidate.role === 'string' &&
    BACKYARD_SOURCE_ROLES.has(candidate.role) &&
    candidate.sourceType === 'generatedCollider' &&
    typeof candidate.name === 'string' &&
    typeof candidate.purpose === 'string' &&
    candidate.intent === 'physical-boundary'
  );
};
