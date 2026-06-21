import type { MeshStandardMaterialParameters } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import {
  isActiveSourceCollisionPolicy,
  type SourceBackedCollider,
} from '../level/sourceCollision';
import type {
  UpperStairwellLandingSegmentPolicy,
  UpperStairwellLandingSegmentRole,
} from '../level/upperStairwellLandingSegments';

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
  /** Declarative render/collision policy for semantic guard segments. */
  segments: readonly UpperStairwellLandingSegmentPolicy[];
}

export type UpperStairwellLandingCollider = SourceBackedCollider<
  UpperStairwellLandingSegmentRole,
  UpperStairwellLandingSegmentPolicy['sourceId'],
  'generatedCollider'
>;

export interface UpperStairwellLandingBuild {
  group: Group;
  colliders: UpperStairwellLandingCollider[];
}

const GROUP_NAME = 'UpperStairwellLanding';
const SIDE_GUARD_NAME = 'UpperStairwellLandingSideGuard';
const FAR_GUARD_NAME = 'UpperStairwellLandingFarGuard';
const SHOULDER_GUARD_NAME = 'UpperStairwellLandingShoulderGuard';

const getMeshNameForRole = (role: UpperStairwellLandingSegmentRole): string => {
  switch (role) {
    case 'side-west':
      return `${SIDE_GUARD_NAME}-West`;
    case 'side-east':
      return `${SIDE_GUARD_NAME}-East`;
    case 'far':
      return FAR_GUARD_NAME;
    case 'shoulder-west':
      return `${SHOULDER_GUARD_NAME}-West`;
    case 'shoulder-east':
      return `${SHOULDER_GUARD_NAME}-East`;
  }
};

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

const addGuard = (params: {
  group: Group;
  colliders: UpperStairwellLandingCollider[];
  material: MeshStandardMaterial;
  policy: UpperStairwellLandingSegmentPolicy;
  meshName: string;
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

  if (params.policy.render) {
    const guard = new Mesh(
      new BoxGeometry(width, params.height, depth),
      params.material
    );
    guard.name = params.meshName;
    guard.position.set(
      guardBounds.minX + width / 2,
      params.elevation + params.height / 2,
      guardBounds.minZ + depth / 2
    );
    params.group.add(guard);
  }

  const collision = params.policy.collision;
  if (isActiveSourceCollisionPolicy(collision)) {
    params.colliders.push({
      role: params.policy.role,
      sourceId: params.policy.sourceId,
      sourceType: 'generatedCollider',
      intent: collision.intent,
      purpose: collision.purpose,
      name: collision.runtimeName,
      debugId: collision.debugId,
      bounds: guardBounds,
    });
  }
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
  const colliders: UpperStairwellLandingCollider[] = [];
  const thickness = Math.max(config.guard.thickness, 0);
  const guardMaterial = new MeshStandardMaterial(config.guard.material);

  if (thickness <= 0 || config.guard.height <= 0) {
    return { group, colliders };
  }

  const descentCorridorBounds = config.descentCorridorBounds
    ? clampBoundsToRoom(config.descentCorridorBounds, openingBounds)
    : undefined;
  for (const policy of config.segments) {
    let bounds: Bounds2D | undefined;

    switch (policy.role) {
      case 'side-west':
        bounds = {
          minX: openingBounds.minX - thickness,
          maxX: openingBounds.minX,
          minZ: openingBounds.minZ,
          maxZ: openingBounds.maxZ,
        };
        break;
      case 'side-east':
        bounds = {
          minX: openingBounds.maxX,
          maxX: openingBounds.maxX + thickness,
          minZ: openingBounds.minZ,
          maxZ: openingBounds.maxZ,
        };
        break;
      case 'far':
        bounds = {
          minX: openingBounds.minX,
          maxX: openingBounds.maxX,
          minZ: openingBounds.minZ,
          maxZ: openingBounds.minZ + thickness,
        };
        break;
      case 'shoulder-west':
        if (descentCorridorBounds) {
          bounds = {
            minX: openingBounds.minX,
            maxX: descentCorridorBounds.minX,
            minZ: openingBounds.minZ,
            maxZ: openingBounds.maxZ,
          };
        }
        break;
      case 'shoulder-east':
        if (descentCorridorBounds) {
          bounds = {
            minX: descentCorridorBounds.maxX,
            maxX: openingBounds.maxX,
            minZ: openingBounds.minZ,
            maxZ: openingBounds.maxZ,
          };
        }
        break;
    }

    if (!bounds) continue;

    addGuard({
      group,
      colliders,
      material: guardMaterial,
      policy,
      meshName: getMeshNameForRole(policy.role),
      bounds,
      roomBounds: config.roomBounds,
      elevation: config.elevation,
      height: config.guard.height,
    });
  }

  return { group, colliders };
}
