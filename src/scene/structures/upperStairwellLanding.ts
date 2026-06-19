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
  /** Declarative guard segment policy controlling rendering and collisions. */
  segments?: readonly UpperStairwellLandingSegmentPolicy[];
}

export interface UpperStairwellLandingColliderSegment {
  role: UpperStairwellLandingSegmentRole;
  name: string;
  sourceId: UpperStairwellLandingSegmentPolicy['sourceId'];
  bounds: RectCollider;
}

export interface UpperStairwellLandingBuild {
  group: Group;
  colliderSegments: UpperStairwellLandingColliderSegment[];
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
        'upper.stairwell.landing.sideWest.guard' as UpperStairwellLandingSegmentPolicy['sourceId'],
      colliderName: `${SIDE_GUARD_NAME}-West`,
    },
    {
      role: 'side-east',
      render: true,
      collision: true,
      sourceId:
        'upper.stairwell.landing.sideEast.guard' as UpperStairwellLandingSegmentPolicy['sourceId'],
      colliderName: `${SIDE_GUARD_NAME}-East`,
    },
    {
      role: 'far',
      render: true,
      collision: true,
      sourceId:
        'upper.stairwell.landing.far.guard' as UpperStairwellLandingSegmentPolicy['sourceId'],
      colliderName: FAR_GUARD_NAME,
    },
    {
      role: 'shoulder-west',
      render: true,
      collision: true,
      sourceId:
        'upper.stairwell.landing.shoulderWest.guard' as UpperStairwellLandingSegmentPolicy['sourceId'],
      colliderName: `${SHOULDER_GUARD_NAME}-West`,
    },
    {
      role: 'shoulder-east',
      render: true,
      collision: true,
      sourceId:
        'upper.stairwell.landing.shoulderEast.guard' as UpperStairwellLandingSegmentPolicy['sourceId'],
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

const getSegmentBounds = (params: {
  role: UpperStairwellLandingSegmentRole;
  openingBounds: Bounds2D;
  descentCorridorBounds?: Bounds2D;
  thickness: number;
}): Bounds2D | undefined => {
  const { role, openingBounds, descentCorridorBounds, thickness } = params;

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

const addGuardSegment = (params: {
  group: Group;
  colliderSegments: UpperStairwellLandingColliderSegment[];
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

  if (params.policy.render) {
    const guard = new Mesh(
      new BoxGeometry(width, params.height, depth),
      params.material
    );
    guard.name = getSegmentMeshName(params.policy.role);
    guard.position.set(
      guardBounds.minX + width / 2,
      params.elevation + params.height / 2,
      guardBounds.minZ + depth / 2
    );
    params.group.add(guard);
  }

  if (params.policy.collision) {
    if (!params.policy.colliderName) {
      throw new Error(
        `Upper stairwell landing segment ${params.policy.role} requires a collider name.`
      );
    }

    params.colliderSegments.push({
      role: params.policy.role,
      name: params.policy.colliderName,
      sourceId: params.policy.sourceId,
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
  const colliderSegments: UpperStairwellLandingColliderSegment[] = [];
  const thickness = Math.max(config.guard.thickness, 0);
  const guardMaterial = new MeshStandardMaterial(config.guard.material);

  if (thickness <= 0 || config.guard.height <= 0) {
    return { group, colliderSegments };
  }

  const sideSides = config.guard.sideSides ?? ['east', 'west'];
  const shoulderSides = config.guard.shoulderSides ?? ['east', 'west'];
  const descentCorridorBounds = config.descentCorridorBounds
    ? clampBoundsToRoom(config.descentCorridorBounds, openingBounds)
    : undefined;
  const policies = config.segments ?? DEFAULT_SEGMENT_POLICIES;

  for (const policy of policies) {
    if (policy.role.startsWith('side-')) {
      const side = policy.role === 'side-east' ? 'east' : 'west';
      if (!sideSides.includes(side)) {
        continue;
      }
    }

    if (policy.role.startsWith('shoulder-')) {
      const side = policy.role === 'shoulder-east' ? 'east' : 'west';
      if (!shoulderSides.includes(side)) {
        continue;
      }
    }

    const bounds = getSegmentBounds({
      role: policy.role,
      openingBounds,
      descentCorridorBounds,
      thickness,
    });

    if (!bounds) {
      continue;
    }

    addGuardSegment({
      group,
      colliderSegments,
      material: guardMaterial,
      policy,
      bounds,
      roomBounds: config.roomBounds,
      elevation: config.elevation,
      height: config.guard.height,
    });
  }

  return { group, colliderSegments };
}
