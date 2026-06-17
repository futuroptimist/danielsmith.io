import type {
  CombinedWallSegment,
  RoomCategory,
  RoomWall,
} from '../../assets/floorPlan';
import {
  createWallSegmentInstancesFromCombinedSegments,
  type WallSegmentInstance,
  type WallSegmentOptions,
} from '../../assets/floorPlan/wallSegments';

import type {
  FloorDefinition,
  LevelDefinition,
  SemanticRoomDefinition,
  WallDefinition,
} from './schema';
import { assertValidLevelDefinition } from './schema';

export interface GenerateWallInstancesOptions
  extends Omit<WallSegmentOptions, 'floorId' | 'levelId' | 'getRoomCategory'> {
  floorId: string;
  coordinateScale?: number;
  getRoomCategory?(roomId: string): RoomCategory;
}

const AXIS_EPSILON = 1e-6;
const LENGTH_EPSILON = 1e-4;

export function generateWallInstances(
  level: LevelDefinition,
  options: GenerateWallInstancesOptions
): WallSegmentInstance[] {
  assertValidLevelDefinition(level);
  const floor = level.floors.find(
    (candidate) => candidate.id === options.floorId
  );
  if (!floor)
    throw new Error(
      `Level "${level.id}" does not contain floor "${options.floorId}".`
    );

  const declarativeSegments = createDeclarativeCombinedSegments(floor, options);
  return createWallSegmentInstancesFromCombinedSegments(
    declarativeSegments.map((entry) => entry.segment),
    {
      ...options,
      floorId: options.floorId,
      getRoomCategory:
        options.getRoomCategory ??
        ((roomId) =>
          floor.rooms.find((room) => room.id === roomId)?.category ??
          'interior'),
    }
  ).map((instance, index) => ({
    ...instance,
    sourceId: declarativeSegments[index].sourceId,
  }));
}

function createDeclarativeCombinedSegments(
  floor: FloorDefinition,
  options: GenerateWallInstancesOptions
): Array<{
  segment: CombinedWallSegment;
  sourceId: WallDefinition['sourceId'];
}> {
  return floor.walls.flatMap((wall) => {
    const segments = getWallPieces(wall).flatMap((piece) => {
      const splitPieces =
        (wall.rooms?.length ?? 0) > 1
          ? splitAtRoomBoundaries(piece, floor.rooms)
          : [piece];
      return splitPieces.flatMap((splitPiece) => {
        const rooms = getRoomsForPiece(splitPiece, floor.rooms);
        if (rooms.length === 0) return [];
        const scaledSegment: CombinedWallSegment = {
          orientation: splitPiece.orientation,
          start: {
            x: scale(splitPiece.start.x, options),
            z: scale(splitPiece.start.z, options),
          },
          end: {
            x: scale(splitPiece.end.x, options),
            z: scale(splitPiece.end.z, options),
          },
          rooms,
        };
        return [{ segment: scaledSegment, sourceId: wall.sourceId }];
      });
    });
    return segments;
  });
}

type AxisPiece = CombinedWallSegment & { rooms: [] };

function hasSegments(wall: WallDefinition): wall is WallDefinition & {
  segments: NonNullable<WallDefinition['segments']>;
} {
  return Array.isArray((wall as { segments?: unknown }).segments);
}

function getWallPieces(wall: WallDefinition): AxisPiece[] {
  const rawSegments = hasSegments(wall) ? wall.segments : splitRun(wall.run);
  return rawSegments.flatMap((segment) => {
    const orientation = getOrientation(segment.start, segment.end);
    if (!orientation) return [];
    return [{ orientation, start: segment.start, end: segment.end, rooms: [] }];
  });
}

function splitRun(
  run: NonNullable<WallDefinition['run']>
): Array<{ start: { x: number; z: number }; end: { x: number; z: number } }> {
  const length = Math.hypot(run.end.x - run.start.x, run.end.z - run.start.z);
  if (length <= AXIS_EPSILON) return [];
  const gaps = [...(run.gaps ?? [])].sort((a, b) => a.start - b.start);
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const gap of gaps) {
    const gapStart = Math.max(0, Math.min(length, gap.start));
    const gapEnd = Math.max(0, Math.min(length, gap.end));
    if (gapStart > cursor) ranges.push({ start: cursor, end: gapStart });
    cursor = Math.max(cursor, gapEnd);
  }
  if (cursor < length) ranges.push({ start: cursor, end: length });
  return ranges
    .filter((range) => range.end - range.start > LENGTH_EPSILON)
    .map((range) => ({
      start: pointAt(run, range.start / length),
      end: pointAt(run, range.end / length),
    }));
}

function pointAt(run: NonNullable<WallDefinition['run']>, ratio: number) {
  return {
    x: run.start.x + (run.end.x - run.start.x) * ratio,
    z: run.start.z + (run.end.z - run.start.z) * ratio,
  };
}

function getOrientation(
  start: { x: number; z: number },
  end: { x: number; z: number }
): 'horizontal' | 'vertical' | undefined {
  if (Math.abs(start.z - end.z) <= AXIS_EPSILON) return 'horizontal';
  if (Math.abs(start.x - end.x) <= AXIS_EPSILON) return 'vertical';
  return undefined;
}

function splitAtRoomBoundaries(
  piece: AxisPiece,
  rooms: readonly SemanticRoomDefinition[]
): AxisPiece[] {
  const points = new Set<number>();
  const start =
    piece.orientation === 'horizontal' ? piece.start.x : piece.start.z;
  const end = piece.orientation === 'horizontal' ? piece.end.x : piece.end.z;
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  points.add(min);
  points.add(max);
  rooms.forEach((room) => {
    const a =
      piece.orientation === 'horizontal' ? room.bounds.minX : room.bounds.minZ;
    const b =
      piece.orientation === 'horizontal' ? room.bounds.maxX : room.bounds.maxZ;
    if (a > min + AXIS_EPSILON && a < max - AXIS_EPSILON) points.add(a);
    if (b > min + AXIS_EPSILON && b < max - AXIS_EPSILON) points.add(b);
  });
  const sorted = [...points].sort((a, b) => a - b);
  return sorted.slice(0, -1).flatMap((value, index) => {
    const next = sorted[index + 1];
    if (next - value <= LENGTH_EPSILON) return [];
    return [
      { ...piece, start: toPoint(piece, value), end: toPoint(piece, next) },
    ];
  });
}

function toPoint(piece: AxisPiece, value: number) {
  return piece.orientation === 'horizontal'
    ? { x: value, z: piece.start.z }
    : { x: piece.start.x, z: value };
}

function getRoomsForPiece(
  piece: AxisPiece,
  rooms: readonly SemanticRoomDefinition[]
): Array<{ id: string; wall: RoomWall }> {
  return rooms.flatMap((room) => {
    const wall = getRoomWallForPiece(piece, room);
    return wall ? [{ id: room.id, wall }] : [];
  });
}

function getRoomWallForPiece(
  piece: AxisPiece,
  room: SemanticRoomDefinition
): RoomWall | undefined {
  const min =
    piece.orientation === 'horizontal'
      ? Math.min(piece.start.x, piece.end.x)
      : Math.min(piece.start.z, piece.end.z);
  const max =
    piece.orientation === 'horizontal'
      ? Math.max(piece.start.x, piece.end.x)
      : Math.max(piece.start.z, piece.end.z);
  const roomMin =
    piece.orientation === 'horizontal' ? room.bounds.minX : room.bounds.minZ;
  const roomMax =
    piece.orientation === 'horizontal' ? room.bounds.maxX : room.bounds.maxZ;
  if (min < roomMin - AXIS_EPSILON || max > roomMax + AXIS_EPSILON)
    return undefined;
  if (piece.orientation === 'horizontal') {
    if (Math.abs(piece.start.z - room.bounds.maxZ) <= AXIS_EPSILON)
      return 'north';
    if (Math.abs(piece.start.z - room.bounds.minZ) <= AXIS_EPSILON)
      return 'south';
  } else {
    if (Math.abs(piece.start.x - room.bounds.maxX) <= AXIS_EPSILON)
      return 'east';
    if (Math.abs(piece.start.x - room.bounds.minX) <= AXIS_EPSILON)
      return 'west';
  }
  return undefined;
}

function scale(
  value: number,
  options: Pick<GenerateWallInstancesOptions, 'coordinateScale'>
): number {
  return value * (options.coordinateScale ?? 1);
}
