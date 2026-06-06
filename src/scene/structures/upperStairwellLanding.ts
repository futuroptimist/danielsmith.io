import type { MeshStandardMaterialParameters } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';

export interface UpperStairwellGuardConfig {
  /** Height of the guard rail measured from the upper-floor surface. */
  height: number;
  /** Thickness of each side guard measured across the stairwell opening. */
  thickness: number;
  /** Keep guards away from the exact room edge to avoid wall z-fighting. */
  endInset: number;
  /** Optional material overrides for the guard rails. */
  material?: MeshStandardMaterialParameters;
}

export interface UpperStairwellLandingConfig {
  /** Upper landing room bounds, used to clip guard rails to visible floor. */
  roomBounds: Bounds2D;
  /** Stairwell void cut from the upper floor, derived from movement layout. */
  opening: Bounds2D;
  /** Height of the upper-floor walking surface. */
  elevation: number;
  /** Material applied to the guard rails. */
  material: MeshStandardMaterialParameters;
  /** Side guard rail configuration. */
  guard: UpperStairwellGuardConfig;
}

export interface UpperStairwellLandingBuild {
  group: Group;
  colliders: RectCollider[];
}

const GROUP_NAME = 'UpperStairwellLanding';
const LEFT_GUARD_NAME = 'UpperStairwellLandingGuardLeft';
const RIGHT_GUARD_NAME = 'UpperStairwellLandingGuardRight';

const clipOpeningToRoom = (
  roomBounds: Bounds2D,
  opening: Bounds2D
): Bounds2D | null => {
  const clipped = {
    minX: Math.max(roomBounds.minX, opening.minX),
    maxX: Math.min(roomBounds.maxX, opening.maxX),
    minZ: Math.max(roomBounds.minZ, opening.minZ),
    maxZ: Math.min(roomBounds.maxZ, opening.maxZ),
  };

  return clipped.maxX > clipped.minX && clipped.maxZ > clipped.minZ
    ? clipped
    : null;
};

const addGuard = (
  group: Group,
  colliders: RectCollider[],
  config: UpperStairwellLandingConfig,
  name: string,
  centerX: number,
  minZ: number,
  maxZ: number
): void => {
  const depth = maxZ - minZ;
  if (config.guard.thickness <= 0 || config.guard.height <= 0 || depth <= 0) {
    return;
  }

  const guardMaterial = new MeshStandardMaterial(
    config.guard.material ?? config.material
  );
  const guardGeometry = new BoxGeometry(
    config.guard.thickness,
    config.guard.height,
    depth
  );
  const guard = new Mesh(guardGeometry, guardMaterial);
  guard.name = name;
  guard.position.set(
    centerX,
    config.elevation + config.guard.height / 2,
    minZ + depth / 2
  );
  group.add(guard);

  colliders.push({
    minX: centerX - config.guard.thickness / 2,
    maxX: centerX + config.guard.thickness / 2,
    minZ,
    maxZ,
  });
};

/**
 * Builds only the protective side rails for the upper stairwell opening.
 *
 * The walking surfaces are the real upper-floor room tiles plus the actual
 * `StaircaseLanding`; this helper intentionally avoids slab geometry so it
 * cannot recreate the old solid cuboid over the descent opening. Its `opening`
 * must come from the same stair layout metrics used by movement, keeping the
 * visual void, guard colliders, and stair transition corridor in sync.
 */
export function createUpperStairwellLanding(
  config: UpperStairwellLandingConfig
): UpperStairwellLandingBuild {
  const group = new Group();
  group.name = GROUP_NAME;
  const colliders: RectCollider[] = [];

  const opening = clipOpeningToRoom(config.roomBounds, config.opening);
  if (!opening) {
    return { group, colliders };
  }

  const minZ = opening.minZ + config.guard.endInset;
  const maxZ = opening.maxZ - config.guard.endInset;
  if (maxZ <= minZ) {
    return { group, colliders };
  }

  addGuard(
    group,
    colliders,
    config,
    LEFT_GUARD_NAME,
    opening.minX + config.guard.thickness / 2,
    minZ,
    maxZ
  );
  addGuard(
    group,
    colliders,
    config,
    RIGHT_GUARD_NAME,
    opening.maxX - config.guard.thickness / 2,
    minZ,
    maxZ
  );

  return { group, colliders };
}
