import type { MeshStandardMaterialParameters } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';

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
  /** Height of the upper-floor surface measured from world origin. */
  elevation: number;
  /** Guard rail configuration. */
  guard: UpperStairwellGuardConfig;
}

export interface UpperStairwellLandingBuild {
  group: Group;
  colliders: RectCollider[];
}

const GROUP_NAME = 'UpperStairwellLanding';
const SIDE_GUARD_NAME = 'UpperStairwellLandingSideGuard';
const FAR_GUARD_NAME = 'UpperStairwellLandingFarGuard';

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
  colliders: RectCollider[];
  material: MeshStandardMaterial;
  name: string;
  bounds: Bounds2D;
  elevation: number;
  height: number;
}) => {
  const width = params.bounds.maxX - params.bounds.minX;
  const depth = params.bounds.maxZ - params.bounds.minZ;
  if (width <= 0 || depth <= 0 || params.height <= 0) {
    return;
  }

  const guard = new Mesh(
    new BoxGeometry(width, params.height, depth),
    params.material
  );
  guard.name = params.name;
  guard.position.set(
    params.bounds.minX + width / 2,
    params.elevation + params.height / 2,
    params.bounds.minZ + depth / 2
  );
  params.group.add(guard);
  params.colliders.push(params.bounds);
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
  const colliders: RectCollider[] = [];
  const thickness = Math.max(config.guard.thickness, 0);
  const guardMaterial = new MeshStandardMaterial(config.guard.material);

  if (thickness <= 0 || config.guard.height <= 0) {
    return { group, colliders };
  }

  addGuard({
    group,
    colliders,
    material: guardMaterial,
    name: `${SIDE_GUARD_NAME}-West`,
    bounds: {
      minX: openingBounds.minX - thickness,
      maxX: openingBounds.minX,
      minZ: openingBounds.minZ,
      maxZ: openingBounds.maxZ,
    },
    elevation: config.elevation,
    height: config.guard.height,
  });
  addGuard({
    group,
    colliders,
    material: guardMaterial,
    name: `${SIDE_GUARD_NAME}-East`,
    bounds: {
      minX: openingBounds.maxX,
      maxX: openingBounds.maxX + thickness,
      minZ: openingBounds.minZ,
      maxZ: openingBounds.maxZ,
    },
    elevation: config.elevation,
    height: config.guard.height,
  });
  addGuard({
    group,
    colliders,
    material: guardMaterial,
    name: FAR_GUARD_NAME,
    bounds: {
      minX: openingBounds.minX,
      maxX: openingBounds.maxX,
      minZ: openingBounds.minZ,
      maxZ: openingBounds.minZ + thickness,
    },
    elevation: config.elevation,
    height: config.guard.height,
  });

  return { group, colliders };
}
