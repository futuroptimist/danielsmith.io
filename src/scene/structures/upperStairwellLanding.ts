import type { MeshStandardMaterialParameters } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
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
  /** Source-owned policy declaring which semantic guard segments render/collide. */
  segments?: readonly UpperStairwellLandingSegmentPolicy[];
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

export interface UpperStairwellLandingCollider {
  role: UpperStairwellLandingSegmentRole;
  sourceId: UpperStairwellLandingSegmentPolicy['sourceId'];
  name: string;
  bounds: RectCollider;
}

export interface UpperStairwellLandingBuild {
  group: Group;
  segments: UpperStairwellLandingCollider[];
}

const GROUP_NAME = 'UpperStairwellLanding';
const SIDE_GUARD_NAME = 'UpperStairwellLandingSideGuard';
const FAR_GUARD_NAME = 'UpperStairwellLandingFarGuard';
const SHOULDER_GUARD_NAME = 'UpperStairwellLandingShoulderGuard';

const DEFAULT_SEGMENT_POLICIES: readonly UpperStairwellLandingSegmentPolicy[] =
  [
    {
      role: 'side-west',
      render: true,
      collision: true,
      sourceId:
        'upper.stairwell.landing.sideWest.generatedCollider' as UpperStairwellLandingSegmentPolicy['sourceId'],
      colliderName: `${SIDE_GUARD_NAME}-West`,
    },
    {
      role: 'side-east',
      render: true,
      collision: true,
      sourceId:
        'upper.stairwell.landing.sideEast.generatedCollider' as UpperStairwellLandingSegmentPolicy['sourceId'],
      colliderName: `${SIDE_GUARD_NAME}-East`,
    },
    {
      role: 'far',
      render: true,
      collision: true,
      sourceId:
        'upper.stairwell.landing.far.generatedCollider' as UpperStairwellLandingSegmentPolicy['sourceId'],
      colliderName: FAR_GUARD_NAME,
    },
    {
      role: 'shoulder-west',
      render: true,
      collision: true,
      sourceId:
        'upper.stairwell.landing.shoulderWest.generatedCollider' as UpperStairwellLandingSegmentPolicy['sourceId'],
      colliderName: `${SHOULDER_GUARD_NAME}-West`,
    },
    {
      role: 'shoulder-east',
      render: true,
      collision: true,
      sourceId:
        'upper.stairwell.landing.shoulderEast.generatedCollider' as UpperStairwellLandingSegmentPolicy['sourceId'],
      colliderName: `${SHOULDER_GUARD_NAME}-East`,
    },
  ];

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

const getSegmentMeshName = (role: UpperStairwellLandingSegmentRole): string => {
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

const getSegmentBounds = (
  role: UpperStairwellLandingSegmentRole,
  openingBounds: Bounds2D,
  descentCorridorBounds: Bounds2D | undefined,
  thickness: number
): Bounds2D | undefined => {
  switch (role) {
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
  const segments: UpperStairwellLandingCollider[] = [];
  const thickness = Math.max(config.guard.thickness, 0);
  const guardMaterial = new MeshStandardMaterial(config.guard.material);
  const segmentPolicies = config.guard.segments ?? DEFAULT_SEGMENT_POLICIES;

  if (thickness <= 0 || config.guard.height <= 0) {
    return { group, segments };
  }

  const descentCorridorBounds = config.descentCorridorBounds
    ? clampBoundsToRoom(config.descentCorridorBounds, openingBounds)
    : undefined;

  for (const policy of segmentPolicies) {
    const unclampedBounds = getSegmentBounds(
      policy.role,
      openingBounds,
      descentCorridorBounds,
      thickness
    );
    if (!unclampedBounds) {
      continue;
    }

    const bounds = clampBoundsToRoom(unclampedBounds, config.roomBounds);
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    if (width <= 0 || depth <= 0) {
      continue;
    }

    if (policy.render) {
      const guard = new Mesh(
        new BoxGeometry(width, config.guard.height, depth),
        guardMaterial
      );
      guard.name = getSegmentMeshName(policy.role);
      guard.position.set(
        bounds.minX + width / 2,
        config.elevation + config.guard.height / 2,
        bounds.minZ + depth / 2
      );
      group.add(guard);
    }

    if (policy.collision) {
      segments.push({
        role: policy.role,
        sourceId: policy.sourceId,
        name: policy.colliderName ?? getSegmentMeshName(policy.role),
        bounds,
      });
    }
  }

  return { group, segments };
}
