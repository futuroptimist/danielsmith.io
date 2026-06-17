import type {
  CombinedWallSegment,
  RoomCategory,
  RoomWall,
} from '../../assets/floorPlan';
import {
  getWallOutwardDirection,
  type WallSegmentInstance,
} from '../../assets/floorPlan/wallSegments';
import type { RectCollider } from '../../systems/collision';

import type {
  FloorDefinition,
  LevelDefinition,
  Point2D,
  WallDefinition,
} from './schema';

interface GenerateWallInstancesOptions {
  floorId: string;
  baseElevation: number;
  wallHeight: number;
  wallThickness: number;
  fenceHeight: number;
  fenceThickness: number;
  getRoomCategory(roomId: string): RoomCategory;
  scale?: number;
  interiorExtensionFactor?: number;
  exteriorExtensionFactor?: number;
}

const DEFAULT_INTERIOR_EXTENSION = 0.5;
const DEFAULT_EXTERIOR_EXTENSION = 1;
const LENGTH_EPSILON = 1e-4;

export function generateWallInstancesFromLevel(
  level: LevelDefinition,
  options: GenerateWallInstancesOptions
): WallSegmentInstance[] {
  const floor = level.floors.find(
    (candidate) => candidate.id === options.floorId
  );
  if (!floor) throw new Error(`Unknown level floor "${options.floorId}".`);

  return generateWallInstancesForFloor(floor, options);
}

export function generateWallInstancesForFloor(
  floor: FloorDefinition,
  options: GenerateWallInstancesOptions
): WallSegmentInstance[] {
  const scale = options.scale ?? 1;
  const interiorExtension =
    options.interiorExtensionFactor ?? DEFAULT_INTERIOR_EXTENSION;
  const exteriorExtension =
    options.exteriorExtensionFactor ?? DEFAULT_EXTERIOR_EXTENSION;

  return floor.walls.flatMap((wall) =>
    getWallSourceSegments(floor, wall).flatMap(
      (sourceSegment, segmentIndex) => {
        const start = scalePoint(sourceSegment.start, scale);
        const end = scalePoint(sourceSegment.end, scale);
        const orientation = getOrientation(start, end);
        const length =
          orientation === 'horizontal'
            ? Math.abs(end.x - start.x)
            : Math.abs(end.z - start.z);
        if (length <= LENGTH_EPSILON) return [];

        const roomRefs = (wall.rooms ?? [])
          .filter((roomId) => segmentTouchesRoom(floor, sourceSegment, roomId))
          .map((roomId) => ({
            id: roomId,
            wall: inferRoomWall(floor, wall, sourceSegment, roomId),
          }));
        const roomCategories = roomRefs.map((roomInfo) =>
          options.getRoomCategory(roomInfo.id)
        );
        const hasExterior = roomCategories.some(
          (category) => category === 'exterior'
        );
        const hasInterior = roomCategories.some(
          (category) => category !== 'exterior'
        );
        const isMixed = hasExterior && hasInterior;
        const isFence = wall.wallKind === 'fence' || (hasExterior && !isMixed);
        const thickness =
          wall.thickness ??
          (isFence ? options.fenceThickness : options.wallThickness);
        const height =
          wall.height ?? (isFence ? options.fenceHeight : options.wallHeight);
        const isSharedInterior = roomRefs.length > 1;
        const extension =
          thickness *
          (isSharedInterior ? interiorExtension : exteriorExtension);
        const width =
          orientation === 'horizontal' ? length + extension : thickness;
        const depth =
          orientation === 'horizontal' ? thickness : length + extension;
        const baseX =
          orientation === 'horizontal' ? (start.x + end.x) / 2 : start.x;
        const baseZ =
          orientation === 'horizontal' ? start.z : (start.z + end.z) / 2;
        const outward =
          !isSharedInterior && roomRefs.length > 0
            ? getWallOutwardDirection(roomRefs[0].wall)
            : { x: 0, z: 0 };
        const center = {
          x: baseX + outward.x * (options.wallThickness / 2),
          y: options.baseElevation + height / 2,
          z: baseZ + outward.z * (options.wallThickness / 2),
        };
        const collider: RectCollider = {
          minX: center.x - width / 2,
          maxX: center.x + width / 2,
          minZ: center.z - depth / 2,
          maxZ: center.z + depth / 2,
        };
        const segment: CombinedWallSegment = {
          orientation,
          start,
          end,
          rooms: roomRefs,
        };

        return [
          {
            segment,
            segmentId: `${wall.sourceId}#${segmentIndex + 1}`,
            sourceId: wall.sourceId,
            sourceType: 'wall' as const,
            center,
            dimensions: { width, height, depth },
            collider,
            isFence,
            isSharedInterior,
            thickness,
          },
        ];
      }
    )
  );
}

function getWallSourceSegments(
  floor: FloorDefinition,
  wall: WallDefinition
): Array<{ start: Point2D; end: Point2D }> {
  if ('segments' in wall && wall.segments) return wall.segments;

  const run = wall.run;
  const runLength = getLength(run.start, run.end);
  const breakpoints = new Set([0, runLength]);
  for (const gap of run.gaps ?? []) {
    breakpoints.add(gap.start);
    breakpoints.add(gap.end);
  }

  const horizontal = Math.abs(run.start.z - run.end.z) <= LENGTH_EPSILON;
  for (const roomId of wall.rooms ?? []) {
    const room = floor.rooms.find((candidate) => candidate.id === roomId);
    if (!room) continue;
    const bounds = room.bounds;
    const candidates = horizontal
      ? [bounds.minX, bounds.maxX]
      : [bounds.minZ, bounds.maxZ];
    for (const candidate of candidates) {
      const offset = candidate - (horizontal ? run.start.x : run.start.z);
      if (offset > 0 && offset < runLength) breakpoints.add(offset);
    }
  }

  const sorted = [...breakpoints].sort((a, b) => a - b);
  return sorted.flatMap((start, index) => {
    const end = sorted[index + 1];
    if (end === undefined || end - start <= LENGTH_EPSILON) return [];
    const midpoint = (start + end) / 2;
    const insideGap = (run.gaps ?? []).some(
      (gap) => midpoint > gap.start && midpoint < gap.end
    );
    return insideGap
      ? []
      : [sliceRun(run.start, run.end, start, end, runLength)];
  });
}

function sliceRun(
  start: Point2D,
  end: Point2D,
  from: number,
  to: number,
  length: number
) {
  const dx = (end.x - start.x) / length;
  const dz = (end.z - start.z) / length;
  return {
    start: { x: start.x + dx * from, z: start.z + dz * from },
    end: { x: start.x + dx * to, z: start.z + dz * to },
  };
}

function getLength(start: Point2D, end: Point2D) {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function scalePoint(point: Point2D, scale: number): Point2D {
  return { x: point.x * scale, z: point.z * scale };
}

function getOrientation(
  start: Point2D,
  end: Point2D
): CombinedWallSegment['orientation'] {
  return Math.abs(start.z - end.z) <= LENGTH_EPSILON
    ? 'horizontal'
    : 'vertical';
}

function inferRoomWall(
  floor: FloorDefinition,
  wall: WallDefinition,
  segment: { start: Point2D; end: Point2D },
  roomId: string
): RoomWall {
  const room = floor.rooms.find((candidate) => candidate.id === roomId);
  const orientation = getOrientation(segment.start, segment.end);
  if (!room) return orientation === 'horizontal' ? 'north' : 'east';
  const value =
    orientation === 'horizontal' ? segment.start.z : segment.start.x;
  const { bounds } = room;
  if (orientation === 'horizontal') {
    if (Math.abs(value - bounds.minZ) <= 1e-3) return 'south';
    if (Math.abs(value - bounds.maxZ) <= 1e-3) return 'north';
    return wall.id.includes('south') ? 'south' : 'north';
  }
  if (Math.abs(value - bounds.minX) <= 1e-3) return 'west';
  if (Math.abs(value - bounds.maxX) <= 1e-3) return 'east';
  return wall.id.includes('west') ? 'west' : 'east';
}

function segmentTouchesRoom(
  floor: FloorDefinition,
  segment: { start: Point2D; end: Point2D },
  roomId: string
): boolean {
  const room = floor.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return true;
  const orientation = getOrientation(segment.start, segment.end);
  const min =
    orientation === 'horizontal'
      ? Math.min(segment.start.x, segment.end.x)
      : Math.min(segment.start.z, segment.end.z);
  const max =
    orientation === 'horizontal'
      ? Math.max(segment.start.x, segment.end.x)
      : Math.max(segment.start.z, segment.end.z);
  const boundsMin =
    orientation === 'horizontal' ? room.bounds.minX : room.bounds.minZ;
  const boundsMax =
    orientation === 'horizontal' ? room.bounds.maxX : room.bounds.maxZ;
  return Math.min(max, boundsMax) - Math.max(min, boundsMin) > LENGTH_EPSILON;
}
