import type { MeshStandardMaterialParameters } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';

export interface UpperStairwellGuardConfig {
  /** Height of the guard rail measured from the upper-floor surface. */
  height: number;
  /** Thickness of rails measured perpendicular to the guarded edge. */
  thickness: number;
  /** Gap left between the room wall and guard ends to avoid wall z-fighting. */
  endInset: number;
  /** Optional material overrides for the guard rails. */
  material?: MeshStandardMaterialParameters;
}

export interface UpperStairwellLandingConfig {
  /** World-space bounds of the upper landing room receiving the stairwell. */
  bounds: Bounds2D;
  /** Full stairwell void bounds derived from stair navigation/layout metrics. */
  stairwellOpening: Bounds2D;
  /** Height of the upper-floor walking surface measured from world origin. */
  elevation: number;
  /** Optional guard rail configuration. */
  guard?: UpperStairwellGuardConfig;
  /** Material used when guard.material is omitted. */
  material: MeshStandardMaterialParameters;
}

export interface UpperStairwellLandingBuild {
  group: Group;
  colliders: RectCollider[];
}

const GROUP_NAME = 'UpperStairwellLanding';
const GUARD_PREFIX = 'UpperStairwellGuard';

const hasPositiveArea = (bounds: Bounds2D): boolean =>
  bounds.maxX - bounds.minX > 0 && bounds.maxZ - bounds.minZ > 0;

const clipToBounds = (bounds: Bounds2D, opening: Bounds2D): Bounds2D => ({
  minX: Math.max(bounds.minX, opening.minX),
  maxX: Math.min(bounds.maxX, opening.maxX),
  minZ: Math.max(bounds.minZ, opening.minZ),
  maxZ: Math.min(bounds.maxZ, opening.maxZ),
});

const addGuard = (
  group: Group,
  colliders: RectCollider[],
  config: {
    name: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    elevation: number;
    height: number;
    material: MeshStandardMaterial;
  }
) => {
  if (config.width <= 0 || config.depth <= 0 || config.height <= 0) {
    return;
  }

  const guard = new Mesh(
    new BoxGeometry(config.width, config.height, config.depth),
    config.material
  );
  guard.name = config.name;
  guard.position.set(config.x, config.elevation + config.height / 2, config.z);
  group.add(guard);

  colliders.push({
    minX: config.x - config.width / 2,
    maxX: config.x + config.width / 2,
    minZ: config.z - config.depth / 2,
    maxZ: config.z + config.depth / 2,
  });
};

/**
 * Builds the upstairs stairwell finish: visible low guard rails around the
 * structural void, but no slab over the descent path. The room floor cutout and
 * this guard builder both consume the same stairwell opening bounds, which are
 * derived from computeStairLayout so navigation, collision, and visuals do not
 * drift apart when stair metrics change.
 */
export function createUpperStairwellLanding(
  config: UpperStairwellLandingConfig
): UpperStairwellLandingBuild {
  const group = new Group();
  group.name = GROUP_NAME;
  const colliders: RectCollider[] = [];

  const opening = clipToBounds(config.bounds, config.stairwellOpening);
  if (!hasPositiveArea(opening)) {
    return { group, colliders };
  }

  if (!config.guard) {
    return { group, colliders };
  }

  const guardMaterial = new MeshStandardMaterial(
    config.guard.material ?? config.material
  );
  const thickness = Math.max(config.guard.thickness, 0);
  const height = Math.max(config.guard.height, 0);
  const endInset = Math.max(config.guard.endInset, 0);
  const guardedDepth = Math.max(0, opening.maxZ - opening.minZ - endInset * 2);
  const guardCenterZ = opening.minZ + endInset + guardedDepth / 2;

  // Side rails seal the dangerous edges beside the stair void while leaving the
  // full center of the opening clear for intentional upstairs-to-stairs travel.
  addGuard(group, colliders, {
    name: `${GUARD_PREFIX}-West`,
    x: opening.minX - thickness / 2,
    z: guardCenterZ,
    width: thickness,
    depth: guardedDepth,
    elevation: config.elevation,
    height,
    material: guardMaterial,
  });

  addGuard(group, colliders, {
    name: `${GUARD_PREFIX}-East`,
    x: opening.maxX + thickness / 2,
    z: guardCenterZ,
    width: thickness,
    depth: guardedDepth,
    elevation: config.elevation,
    height,
    material: guardMaterial,
  });

  return { group, colliders };
}
