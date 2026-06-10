import type { MeshStandardMaterialParameters } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';

export interface UpperStairwellGuardConfig {
  /** Height of the guard rail measured from the upper-floor surface. */
  height: number;
  /** Physical thickness of each rail. */
  thickness: number;
  /**
   * Optional long side rail edges around the opening. Omitting west keeps the
   * upstairs-room egress open while east can still protect the stair void edge.
   */
  sideSides?: ReadonlyArray<'east' | 'west'>;
  /**
   * Optional shoulder rail sides to add around the descent corridor. Omitting
   * west keeps the upstairs-room egress open while east can still protect the
   * stair void edge.
   */
  shoulderSides?: ReadonlyArray<'east' | 'west'>;
  /** Optional X start for the far rail when a west-side egress lane remains open. */
  farGuardMinX?: number;
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
}

export interface UpperStairwellLandingBuild {
  group: Group;
  colliders: RectCollider[];
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

const addGuard = (params: {
  group: Group;
  colliders: RectCollider[];
  material: MeshStandardMaterial;
  name: string;
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

  const guard = new Mesh(
    new BoxGeometry(width, params.height, depth),
    params.material
  );
  guard.name = params.name;
  guard.position.set(
    guardBounds.minX + width / 2,
    params.elevation + params.height / 2,
    guardBounds.minZ + depth / 2
  );
  params.group.add(guard);
  params.colliders.push(guardBounds);
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

  const sideSides = config.guard.sideSides ?? ['east', 'west'];

  if (sideSides.includes('west')) {
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
      roomBounds: config.roomBounds,
      elevation: config.elevation,
      height: config.guard.height,
    });
  }

  if (sideSides.includes('east')) {
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
      roomBounds: config.roomBounds,
      elevation: config.elevation,
      height: config.guard.height,
    });
  }
  addGuard({
    group,
    colliders,
    material: guardMaterial,
    name: FAR_GUARD_NAME,
    bounds: {
      minX: Math.max(
        openingBounds.minX,
        config.guard.farGuardMinX ?? openingBounds.minX
      ),
      maxX: openingBounds.maxX,
      minZ: openingBounds.minZ,
      maxZ: openingBounds.minZ + thickness,
    },
    roomBounds: config.roomBounds,
    elevation: config.elevation,
    height: config.guard.height,
  });

  const shoulderSides = config.guard.shoulderSides ?? ['east', 'west'];

  if (config.descentCorridorBounds && shoulderSides.length > 0) {
    const descentCorridorBounds = clampBoundsToRoom(
      config.descentCorridorBounds,
      openingBounds
    );

    if (shoulderSides.includes('west')) {
      addGuard({
        group,
        colliders,
        material: guardMaterial,
        name: `${SHOULDER_GUARD_NAME}-West`,
        bounds: {
          minX: openingBounds.minX,
          maxX: descentCorridorBounds.minX,
          minZ: openingBounds.minZ,
          maxZ: openingBounds.maxZ,
        },
        roomBounds: config.roomBounds,
        elevation: config.elevation,
        height: config.guard.height,
      });
    }

    if (shoulderSides.includes('east')) {
      addGuard({
        group,
        colliders,
        material: guardMaterial,
        name: `${SHOULDER_GUARD_NAME}-East`,
        bounds: {
          minX: descentCorridorBounds.maxX,
          maxX: openingBounds.maxX,
          minZ: openingBounds.minZ,
          maxZ: openingBounds.maxZ,
        },
        roomBounds: config.roomBounds,
        elevation: config.elevation,
        height: config.guard.height,
      });
    }
  }

  return { group, colliders };
}
