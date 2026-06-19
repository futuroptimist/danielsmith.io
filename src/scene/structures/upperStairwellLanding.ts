import type { MeshStandardMaterialParameters } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import type {
  UpperStairwellLandingSegmentPolicy,
  UpperStairwellLandingSegmentRole,
} from '../level/upperStairwellLandingPolicy';

export interface UpperStairwellGuardConfig {
  /** Height of the guard rail measured from the upper-floor surface. */
  height: number;
  /** Physical thickness of each rail. */
  thickness: number;
  /** Optional material overrides for the guard rails. */
  material?: MeshStandardMaterialParameters;
}

export interface UpperStairwellLandingConfig {
  /** World-space bounds of the upper landing room. */
  roomBounds: Bounds2D;
  /** World-space stairwell opening derived from the shared stair layout. */
  openingBounds: Bounds2D;
  /** Optional deliberate descent corridor that remains open through the cutout. */
  descentCorridorBounds?: Bounds2D;
  /** Height of the upper-floor surface measured from world origin. */
  elevation: number;
  /** Guard rail configuration. */
  guard: UpperStairwellGuardConfig;
  /** Declarative source-owned segment render/collision policy. */
  segmentPolicies: readonly UpperStairwellLandingSegmentPolicy[];
}

export interface UpperStairwellLandingColliderRecord {
  role: UpperStairwellLandingSegmentRole;
  sourceId: UpperStairwellLandingSegmentPolicy['sourceId'];
  name: string;
  bounds: RectCollider;
}

export interface UpperStairwellLandingSegmentRecord {
  role: UpperStairwellLandingSegmentRole;
  sourceId: UpperStairwellLandingSegmentPolicy['sourceId'];
  bounds: Bounds2D;
  rendered: boolean;
  collider?: UpperStairwellLandingColliderRecord;
}

export interface UpperStairwellLandingBuild {
  group: Group;
  segments: UpperStairwellLandingSegmentRecord[];
  colliders: UpperStairwellLandingColliderRecord[];
}

const GROUP_NAME = 'UpperStairwellLanding';
const SIDE_GUARD_NAME = 'UpperStairwellLandingSideGuard';
const FAR_GUARD_NAME = 'UpperStairwellLandingFarGuard';
const SHOULDER_GUARD_NAME = 'UpperStairwellLandingShoulderGuard';

const hasPositiveArea = (bounds: Bounds2D): boolean =>
  bounds.maxX > bounds.minX && bounds.maxZ > bounds.minZ;

const clampBoundsToRoom = (
  bounds: Bounds2D,
  roomBounds: Bounds2D
): Bounds2D => ({
  minX: Math.max(bounds.minX, roomBounds.minX),
  maxX: Math.min(bounds.maxX, roomBounds.maxX),
  minZ: Math.max(bounds.minZ, roomBounds.minZ),
  maxZ: Math.min(bounds.maxZ, roomBounds.maxZ),
});

const getSegmentName = (role: UpperStairwellLandingSegmentRole): string => {
  switch (role) {
    case 'side-east':
      return `${SIDE_GUARD_NAME}-East`;
    case 'side-west':
      return `${SIDE_GUARD_NAME}-West`;
    case 'far':
      return FAR_GUARD_NAME;
    case 'shoulder-east':
      return `${SHOULDER_GUARD_NAME}-East`;
    case 'shoulder-west':
      return `${SHOULDER_GUARD_NAME}-West`;
  }
};

const getSegmentBounds = (params: {
  role: UpperStairwellLandingSegmentRole;
  openingBounds: Bounds2D;
  descentCorridorBounds?: Bounds2D;
  thickness: number;
}): Bounds2D | undefined => {
  const { openingBounds, descentCorridorBounds, thickness } = params;

  switch (params.role) {
    case 'side-west':
      return {
        minX: openingBounds.minX - thickness,
        maxX: openingBounds.minX,
        minZ: openingBounds.minZ,
        maxZ: openingBounds.maxZ,
      };
    case 'side-east':
      return {
        minX: openingBounds.maxX,
        maxX: openingBounds.maxX + thickness,
        minZ: openingBounds.minZ,
        maxZ: openingBounds.maxZ,
      };
    case 'far':
      return {
        minX: openingBounds.minX,
        maxX: openingBounds.maxX,
        minZ: openingBounds.minZ,
        maxZ: openingBounds.minZ + thickness,
      };
    case 'shoulder-west':
      return descentCorridorBounds
        ? {
            minX: openingBounds.minX,
            maxX: descentCorridorBounds.minX,
            minZ: openingBounds.minZ,
            maxZ: openingBounds.maxZ,
          }
        : undefined;
    case 'shoulder-east':
      return descentCorridorBounds
        ? {
            minX: descentCorridorBounds.maxX,
            maxX: openingBounds.maxX,
            minZ: openingBounds.minZ,
            maxZ: openingBounds.maxZ,
          }
        : undefined;
  }
};

const addSegment = (params: {
  group: Group;
  colliders: UpperStairwellLandingColliderRecord[];
  segments: UpperStairwellLandingSegmentRecord[];
  material: MeshStandardMaterial;
  policy: UpperStairwellLandingSegmentPolicy;
  bounds: Bounds2D;
  roomBounds: Bounds2D;
  elevation: number;
  height: number;
}) => {
  const guardBounds = clampBoundsToRoom(params.bounds, params.roomBounds);
  const width = guardBounds.maxX - guardBounds.minX;
  const depth = guardBounds.maxZ - guardBounds.minZ;
  if (width <= 0 || depth <= 0 || params.height <= 0) {
    return;
  }

  let rendered = false;
  if (params.policy.render) {
    const guard = new Mesh(
      new BoxGeometry(width, params.height, depth),
      params.material
    );
    guard.name = getSegmentName(params.policy.role);
    guard.userData.levelSourceId = params.policy.sourceId;
    guard.userData.levelSource = {
      sourceId: params.policy.sourceId,
      sourceType: 'generatedSolid',
      purpose: 'render upper stairwell landing guard segment',
    };
    guard.position.set(
      guardBounds.minX + width / 2,
      params.elevation + params.height / 2,
      guardBounds.minZ + depth / 2
    );
    params.group.add(guard);
    rendered = true;
  }

  const collider = params.policy.collision
    ? {
        role: params.policy.role,
        sourceId: params.policy.sourceId,
        name: params.policy.colliderName ?? getSegmentName(params.policy.role),
        bounds: guardBounds,
      }
    : undefined;
  if (collider) {
    params.colliders.push(collider);
  }
  params.segments.push({
    role: params.policy.role,
    sourceId: params.policy.sourceId,
    bounds: guardBounds,
    rendered,
    ...(collider ? { collider } : {}),
  });
};

/**
 * Adds low railings around the upstairs stairwell opening without creating any
 * slab across the descent path. The room floor tiles own the walkable landing
 * surface, while the shared stair layout owns `openingBounds`; keeping those
 * inputs separate prevents visual floor slabs from drifting over the ramp.
 */
export function createUpperStairwellLanding(
  config: UpperStairwellLandingConfig
): UpperStairwellLandingBuild {
  const openingBounds = clampBoundsToRoom(
    config.openingBounds,
    config.roomBounds
  );
  if (!hasPositiveArea(openingBounds)) {
    throw new Error('Upper stairwell opening must overlap the landing room.');
  }

  const group = new Group();
  group.name = GROUP_NAME;
  const colliders: UpperStairwellLandingColliderRecord[] = [];
  const segments: UpperStairwellLandingSegmentRecord[] = [];
  const thickness = Math.max(config.guard.thickness, 0);
  const guardMaterial = new MeshStandardMaterial(config.guard.material);

  if (thickness <= 0 || config.guard.height <= 0) {
    return { group, segments, colliders };
  }

  const descentCorridorBounds = config.descentCorridorBounds
    ? clampBoundsToRoom(config.descentCorridorBounds, openingBounds)
    : undefined;

  for (const policy of config.segmentPolicies) {
    const bounds = getSegmentBounds({
      role: policy.role,
      openingBounds,
      descentCorridorBounds,
      thickness,
    });
    if (!bounds) {
      continue;
    }

    addSegment({
      group,
      colliders,
      segments,
      material: guardMaterial,
      policy,
      bounds,
      roomBounds: config.roomBounds,
      elevation: config.elevation,
      height: config.guard.height,
    });
  }

  return { group, segments, colliders };
}
