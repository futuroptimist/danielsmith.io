import {
  makeLevelSourceId,
  type LevelSourceId,
} from '../../scene/level/sourceIds';
import type { RectCollider } from '../../systems/collision';
import {
  getCombinedWallSegments,
  type CombinedWallSegment,
  type FloorPlanDefinition,
  type RoomCategory,
  type RoomWall,
} from '../floorPlan';

import { getNormalizedDoorways } from './doorways';

export interface WallSegmentInstance {
  segment: CombinedWallSegment;
  /** Stable identifier for correlating generated meshes with the source segment. */
  segmentId: string;
  /** Semantic source identifier for generated legacy wall segments. */
  sourceId: LevelSourceId;
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

interface WallSegmentBaseOptions {
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

type WallSegmentFloorContext =
  | {
      /** Floor context used when deriving semantic source IDs for generated wall segments. */
      floorId: string;
      /** Alias for floorId when a caller has level terminology. */
      levelId?: string;
    }
  | {
      /** Floor context used when deriving semantic source IDs for generated wall segments. */
      floorId?: string;
      /** Alias for floorId when a caller has level terminology. */
      levelId: string;
    };

export type WallSegmentOptions = WallSegmentBaseOptions &
  WallSegmentFloorContext;

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
  const doorways = getNormalizedDoorways(plan);
  const instances: WallSegmentInstance[] = [];

  segments.forEach((segment) => {
    const length =
      segment.orientation === 'horizontal'
        ? Math.abs(segment.end.x - segment.start.x)
        : Math.abs(segment.end.z - segment.start.z);
    if (length <= LENGTH_EPSILON) {
      return;
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

    // Seam overlap belongs at wall joins, never inside an authored doorway.
    // Combined wall coordinates are rounded to millimetres; doorway edges are not.
    const atDoorwayEdge = (point: { x: number; z: number }) =>
      doorways.some((door) => {
        if (door.axis !== segment.orientation) return false;
        const along = door.axis === 'horizontal' ? 'x' : 'z';
        const across = door.axis === 'horizontal' ? 'z' : 'x';
        return (
          Math.abs(point[across] - door.center[across]) < 0.001 &&
          Math.abs(
            Math.abs(point[along] - door.center[along]) - door.width / 2
          ) < 0.001
        );
      });
    const startExtension = atDoorwayEdge(segment.start) ? 0 : extension / 2;
    const endExtension = atDoorwayEdge(segment.end) ? 0 : extension / 2;
    const extendedLength = length + startExtension + endExtension;
    const centerShift = (endExtension - startExtension) / 2;

    const width =
      segment.orientation === 'horizontal' ? extendedLength : thickness;
    const depth =
      segment.orientation === 'horizontal' ? thickness : extendedLength;

    const baseX =
      segment.orientation === 'horizontal'
        ? (segment.start.x + segment.end.x) / 2 + centerShift
        : segment.start.x;
    const baseZ =
      segment.orientation === 'horizontal'
        ? segment.start.z
        : (segment.start.z + segment.end.z) / 2 + centerShift;

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
      segmentId: createSegmentId(segment),
      sourceId: createSegmentSourceId(segment, options),
      center,
      dimensions: { width, height, depth },
      collider,
      isFence,
      isSharedInterior,
      thickness,
    });
  });

  return instances;
}

function formatPoint(point: { x: number; z: number }): string {
  return `${point.x.toFixed(3)},${point.z.toFixed(3)}`;
}

function createSegmentId(segment: CombinedWallSegment): string {
  const start = formatPoint(segment.start);
  const end = formatPoint(segment.end);
  const rooms = segment.rooms
    .map((room) => `${room.id}:${room.wall}`)
    .sort()
    .join('|');
  return [segment.orientation, start, end, rooms || 'none'].join('|');
}

function formatSourceCoordinate(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(
      `Wall source coordinates must be finite; received ${value}.`
    );
  }

  const normalized = Object.is(value, -0) ? 0 : value;
  return `${normalized < 0 ? 'n' : 'p'}${Math.abs(normalized)
    .toString()
    .replace(/[^a-z0-9]+/g, '_')}`;
}

function formatSourcePoint(point: { x: number; z: number }): string {
  return `x${formatSourceCoordinate(point.x)}_z${formatSourceCoordinate(point.z)}`;
}

function formatSourcePart(value: string): string {
  return (
    value
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'unknown'
  );
}

function createSegmentSourceId(
  segment: CombinedWallSegment,
  options: Pick<WallSegmentOptions, 'floorId' | 'levelId'>
): LevelSourceId {
  const floorContext = options.floorId ?? options.levelId;
  if (!floorContext) {
    throw new Error(
      'createWallSegmentInstances requires floorId or levelId for stable wall source IDs.'
    );
  }

  const floorId = formatSourcePart(floorContext);
  const rooms = segment.rooms
    .map((room) => `${formatSourcePart(room.id)}_${room.wall}`)
    .sort()
    .join('__');

  return makeLevelSourceId([
    floorId,
    'generated_wall',
    segment.orientation,
    `${formatSourcePoint(segment.start)}_to_${formatSourcePoint(segment.end)}`,
    rooms || 'none',
  ]);
}
