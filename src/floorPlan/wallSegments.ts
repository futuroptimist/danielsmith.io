import type { RectCollider } from '../collision';
import {
  getCombinedWallSegments,
  type CombinedWallSegment,
  type FloorPlanDefinition,
  type RoomCategory,
  type RoomWall,
} from '../floorPlan';

export interface WallSegmentInstance {
  segment: CombinedWallSegment;
  center: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  collider: RectCollider;
  /** True when the segment is a fence segment rather than a full-height wall. */
  isFence: boolean;
  /** True when the segment is shared between two rooms. */
  isSharedInterior: boolean;
  /** Effective thickness of the generated segment. */
  thickness: number;
}

export interface WallSegmentOptions {
  baseElevation: number;
  wallHeight: number;
  wallThickness: number;
  fenceHeight: number;
  fenceThickness: number;
  /** Additional overlap factor for interior segments to hide seams. */
  interiorExtensionFactor?: number;
  /** Additional overlap factor for exterior segments to prevent light leaks. */
  exteriorExtensionFactor?: number;
  getRoomCategory(roomId: string): RoomCategory;
}

const DEFAULT_INTERIOR_EXTENSION = 0.5;
const DEFAULT_EXTERIOR_EXTENSION = 1;
const LENGTH_EPSILON = 1e-4;

export function getWallOutwardDirection(wall: RoomWall): {
  x: number;
  z: number;
} {
  switch (wall) {
    case 'north':
      return { x: 0, z: 1 };
    case 'south':
      return { x: 0, z: -1 };
    case 'east':
      return { x: 1, z: 0 };
    case 'west':
      return { x: -1, z: 0 };
    default:
      return { x: 0, z: 0 };
  }
}

export function createWallSegmentInstances(
  plan: FloorPlanDefinition,
  options: WallSegmentOptions
): WallSegmentInstance[] {
  const interiorExtension =
    options.interiorExtensionFactor ?? DEFAULT_INTERIOR_EXTENSION;
  const exteriorExtension =
    options.exteriorExtensionFactor ?? DEFAULT_EXTERIOR_EXTENSION;

  const segments = getCombinedWallSegments(plan);
  const instances: WallSegmentInstance[] = [];

  for (const segment of segments) {
    const length =
      segment.orientation === 'horizontal'
        ? Math.abs(segment.end.x - segment.start.x)
        : Math.abs(segment.end.z - segment.start.z);
    if (length <= LENGTH_EPSILON) {
      continue;
    }

    const roomCategories = segment.rooms.map((roomInfo) =>
      options.getRoomCategory(roomInfo.id)
    );
    const hasExterior = roomCategories.some(
      (category) => category === 'exterior'
    );
    const hasInterior = roomCategories.some(
      (category) => category !== 'exterior'
    );
    const isMixed = hasExterior && hasInterior;
    const isFence = hasExterior && !isMixed;

    const thickness = isFence ? options.fenceThickness : options.wallThickness;
    const height = isFence ? options.fenceHeight : options.wallHeight;
    const isSharedInterior = segment.rooms.length > 1;
    const extensionFactor = isSharedInterior
      ? interiorExtension
      : exteriorExtension;
    const extension = thickness * extensionFactor;

    const width =
      segment.orientation === 'horizontal' ? length + extension : thickness;
    const depth =
      segment.orientation === 'horizontal' ? thickness : length + extension;

    const baseX =
      segment.orientation === 'horizontal'
        ? (segment.start.x + segment.end.x) / 2
        : segment.start.x;
    const baseZ =
      segment.orientation === 'horizontal'
        ? segment.start.z
        : (segment.start.z + segment.end.z) / 2;

    let offsetX = 0;
    let offsetZ = 0;
    if (!isSharedInterior && segment.rooms.length > 0) {
      const outward = getWallOutwardDirection(segment.rooms[0].wall);
      offsetX = outward.x * (options.wallThickness / 2);
      offsetZ = outward.z * (options.wallThickness / 2);
    }

    const center = {
      x: baseX + offsetX,
      y: options.baseElevation + height / 2,
      z: baseZ + offsetZ,
    };

    const collider: RectCollider = {
      minX: center.x - width / 2,
      maxX: center.x + width / 2,
      minZ: center.z - depth / 2,
      maxZ: center.z + depth / 2,
    };

    instances.push({
      segment,
      center,
      dimensions: { width, height, depth },
      collider,
      isFence,
      isSharedInterior,
      thickness,
    });
  }

  return instances;
}
