import type { MeshStandardMaterialParameters } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';

export interface UpperStairwellHoleBoundsConfig {
  /** World-space bounds of the upper landing room that owns the stair opening. */
  roomBounds: Bounds2D;
  /** Stair center from the navigation geometry. */
  stairCenterX: number;
  /** Half of the physical stair width used by movement. */
  stairHalfWidth: number;
  /** Extra side margin that keeps the visual void outside stair guard colliders. */
  stairwellMarginX: number;
  /** Z range computed by computeStairLayout from the same stair metrics as movement. */
  stairHoleRange: { minZ: number; maxZ: number };
}

export interface UpperStairwellGuardConfig {
  /** Height of the guard rail measured from the upper-floor surface. */
  height: number;
  /** Thickness of the guard rail measured perpendicular to the guarded edge. */
  thickness: number;
  /** Material applied to the guard rails. */
  material: MeshStandardMaterialParameters;
}

export interface UpperStairwellLandingConfig {
  /** Clipped world-space bounds of the open stairwell void. */
  stairwellBounds: Bounds2D;
  /** Height of the upper floor surface measured from world origin. */
  elevation: number;
  /** Guard rail settings for sealed/non-traversable edges. */
  guard: UpperStairwellGuardConfig;
}

export interface UpperStairwellLandingBuild {
  group: Group;
  colliders: RectCollider[];
}

const GROUP_NAME = 'UpperStairwellLanding';
const LEFT_GUARD_NAME = 'UpperStairwellLandingGuardLeft';
const RIGHT_GUARD_NAME = 'UpperStairwellLandingGuardRight';
const MIN_DIMENSION = 0.05;

/**
 * Derives the second-floor stairwell void from the same computeStairLayout
 * stairHoleRange used by navigation. Clipping to the upper-landing room keeps
 * the visible hole, floor cutouts, and guard colliders coupled to movement so
 * future stair metric tweaks cannot leave a solid slab over the descent path.
 */
export function createUpperStairwellHoleBounds(
  config: UpperStairwellHoleBoundsConfig
): Bounds2D {
  const halfWidth = config.stairHalfWidth + config.stairwellMarginX;
  const bounds = {
    minX: config.stairCenterX - halfWidth,
    maxX: config.stairCenterX + halfWidth,
    minZ: Math.max(config.roomBounds.minZ, config.stairHoleRange.minZ),
    maxZ: Math.min(config.roomBounds.maxZ, config.stairHoleRange.maxZ),
  };

  if (
    bounds.maxX - bounds.minX <= MIN_DIMENSION ||
    bounds.maxZ - bounds.minZ <= MIN_DIMENSION
  ) {
    throw new Error(
      'Upper stairwell hole bounds must overlap the landing room.'
    );
  }

  return bounds;
}

const addGuard = ({
  group,
  colliders,
  material,
  name,
  centerX,
  centerZ,
  elevation,
  height,
  thickness,
  depth,
}: {
  group: Group;
  colliders: RectCollider[];
  material: MeshStandardMaterial;
  name: string;
  centerX: number;
  centerZ: number;
  elevation: number;
  height: number;
  thickness: number;
  depth: number;
}) => {
  const geometry = new BoxGeometry(thickness, height, depth);
  const guard = new Mesh(geometry, material);
  guard.name = name;
  guard.position.set(centerX, elevation + height / 2, centerZ);
  group.add(guard);

  colliders.push({
    minX: centerX - thickness / 2,
    maxX: centerX + thickness / 2,
    minZ: centerZ - depth / 2,
    maxZ: centerZ + depth / 2,
  });
};

/**
 * Builds the upstairs stairwell railings without placing any slab over the
 * descent opening. The existing StaircaseLanding mesh remains the walkable top
 * landing surface; this helper only marks the dangerous side edges so the
 * central stair path stays visible and traversable.
 */
export function createUpperStairwellLanding(
  config: UpperStairwellLandingConfig
): UpperStairwellLandingBuild {
  const group = new Group();
  group.name = GROUP_NAME;
  const colliders: RectCollider[] = [];

  const depth = config.stairwellBounds.maxZ - config.stairwellBounds.minZ;
  if (depth <= MIN_DIMENSION) {
    throw new Error('Upper stairwell landing requires a positive guard span.');
  }

  const guardMaterial = new MeshStandardMaterial(config.guard.material);
  const centerZ =
    (config.stairwellBounds.minZ + config.stairwellBounds.maxZ) / 2;

  addGuard({
    group,
    colliders,
    material: guardMaterial,
    name: LEFT_GUARD_NAME,
    centerX: config.stairwellBounds.minX + config.guard.thickness / 2,
    centerZ,
    elevation: config.elevation,
    height: config.guard.height,
    thickness: config.guard.thickness,
    depth,
  });

  addGuard({
    group,
    colliders,
    material: guardMaterial,
    name: RIGHT_GUARD_NAME,
    centerX: config.stairwellBounds.maxX - config.guard.thickness / 2,
    centerZ,
    elevation: config.elevation,
    height: config.guard.height,
    thickness: config.guard.thickness,
    depth,
  });

  return { group, colliders };
}
