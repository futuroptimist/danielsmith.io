import type { FloorPlanDefinition } from '../../assets/floorPlan';
import {
  getDoorwayPassageZones,
  type DoorwayPassageZoneOptions,
} from '../../assets/floorPlan/doorways';
import type { RectCollider } from '../collision';

export interface NavMeshOptions extends DoorwayPassageZoneOptions {
  /** Additional rectangles to include in the walkable area. */
  extraZones?: readonly RectCollider[];
  /** Comparison epsilon when determining containment. */
  epsilon?: number;
}

export interface NavMesh {
  readonly polygons: readonly RectCollider[];
  contains(x: number, z: number): boolean;
}

const DEFAULT_EPSILON = 1e-5;

function isWithinRect(
  rect: RectCollider,
  x: number,
  z: number,
  epsilon: number
): boolean {
  return (
    x >= rect.minX - epsilon &&
    x <= rect.maxX + epsilon &&
    z >= rect.minZ - epsilon &&
    z <= rect.maxZ + epsilon
  );
}

function cloneRect(rect: RectCollider): RectCollider {
  return { ...rect };
}

export function createNavMesh(
  plan: FloorPlanDefinition,
  options: NavMeshOptions = {}
): NavMesh {
  const {
    extraZones = [],
    epsilon = DEFAULT_EPSILON,
    ...doorwayOptions
  } = options;

  const polygons: RectCollider[] = [];

  plan.rooms.forEach((room) => {
    polygons.push(cloneRect(room.bounds));
  });

  const doorwayZones = getDoorwayPassageZones(plan, doorwayOptions);
  doorwayZones.forEach((zone) => {
    polygons.push(cloneRect(zone.bounds));
  });

  extraZones.forEach((zone) => {
    polygons.push(cloneRect(zone));
  });

  return {
    polygons,
    contains(x, z) {
      return polygons.some((polygon) => isWithinRect(polygon, x, z, epsilon));
    },
  };
}
