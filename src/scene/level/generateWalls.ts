import type { CombinedWallSegment, RoomWall } from '../../assets/floorPlan';
import {
  getWallOutwardDirection,
  type WallSegmentInstance,
  type WallSegmentOptions,
} from '../../assets/floorPlan/wallSegments';
import type { RectCollider } from '../../systems/collision';

import type {
  FloorDefinition,
  SemanticRoomDefinition,
  WallDefinition,
} from './schema';

const DEFAULT_INTERIOR_EXTENSION = 0.5;
const DEFAULT_EXTERIOR_EXTENSION = 1;
const AXIS_EPSILON = 1e-6;
const LENGTH_EPSILON = 1e-4;

type Axis = 'horizontal' | 'vertical';

interface AtomicWallSegment {
  wall: WallDefinition;
  orientation: Axis;
  start: { x: number; z: number };
  end: { x: number; z: number };
}

export type DeclarativeWallGenerationOptions = Omit<
  WallSegmentOptions,
  'floorId' | 'levelId'
> & {
  coordinateScale?: number;
};

export function generateWallSegmentInstances(
  floor: FloorDefinition,
  options: DeclarativeWallGenerationOptions
): WallSegmentInstance[] {
  const segments = combineDeclarativeWallSegments(
    scaleFloorDefinition(floor, options.coordinateScale ?? 1)
  );
  return segments.flatMap(
    (segment) => createWallInstance(segment, options) ?? []
  );
}

function createWallInstance(
  segment: CombinedWallSegment & { sourceWall: WallDefinition },
  options: DeclarativeWallGenerationOptions
): WallSegmentInstance | undefined {
  const length =
    segment.orientation === 'horizontal'
      ? Math.abs(segment.end.x - segment.start.x)
      : Math.abs(segment.end.z - segment.start.z);
  if (length <= LENGTH_EPSILON) return undefined;

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
  const isFence =
    segment.sourceWall.wallKind === 'fence' || (hasExterior && !isMixed);
  const thickness =
    segment.sourceWall.thickness ??
    (isFence ? options.fenceThickness : options.wallThickness);
  const height =
    segment.sourceWall.height ??
    (isFence ? options.fenceHeight : options.wallHeight);
  const isSharedInterior = segment.rooms.length > 1;
  const extensionFactor = isSharedInterior
    ? (options.interiorExtensionFactor ?? DEFAULT_INTERIOR_EXTENSION)
    : (options.exteriorExtensionFactor ?? DEFAULT_EXTERIOR_EXTENSION);
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
    const offsetThickness =
      segment.sourceWall.thickness ?? options.wallThickness;
    offsetX = outward.x * (offsetThickness / 2);
    offsetZ = outward.z * (offsetThickness / 2);
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

  return {
    segment,
    segmentId: createSegmentId(segment),
    sourceId: segment.sourceWall.sourceId,
    center,
    dimensions: { width, height, depth },
    collider,
    isFence,
    isSharedInterior,
    thickness,
  };
}

function combineDeclarativeWallSegments(
  floor: FloorDefinition
): Array<CombinedWallSegment & { sourceWall: WallDefinition }> {
  const atomic = floor.walls.flatMap(expandWallDefinition);
  return [
    ...combineAxis(floor, atomic, 'horizontal'),
    ...combineAxis(floor, atomic, 'vertical'),
  ];
}

function combineAxis(
  floor: FloorDefinition,
  atomic: AtomicWallSegment[],
  orientation: Axis
): Array<CombinedWallSegment & { sourceWall: WallDefinition }> {
  const grouped = new Map<string, AtomicWallSegment[]>();
  atomic
    .filter((segment) => segment.orientation === orientation)
    .forEach((segment) => {
      const key = formatKey(
        orientation === 'horizontal' ? segment.start.z : segment.start.x
      );
      grouped.set(key, [...(grouped.get(key) ?? []), segment]);
    });

  const combined: Array<CombinedWallSegment & { sourceWall: WallDefinition }> =
    [];
  for (const [key, segments] of grouped) {
    const breakpoints = new Set<number>();
    segments.forEach((segment) => {
      const [start, end] = getAxisRange(segment);
      breakpoints.add(start);
      breakpoints.add(end);
      getRoomBreakpointsForSegment(floor, segment).forEach((point) =>
        breakpoints.add(point)
      );
    });
    const sorted = [...breakpoints].sort((a, b) => a - b);
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const start = sorted[index];
      const end = sorted[index + 1];
      if (end - start <= LENGTH_EPSILON) continue;
      const covering = segments.filter((segment) => {
        const [segmentStart, segmentEnd] = getAxisRange(segment);
        return (
          segmentStart <= start + AXIS_EPSILON &&
          segmentEnd >= end - AXIS_EPSILON
        );
      });
      if (covering.length === 0) continue;
      const sourceWall = covering[0].wall;
      const rooms = uniqueRoomWalls(
        covering.flatMap((coverage) =>
          getRoomWallsForSpan(floor, coverage.wall, orientation, start, end)
        )
      );
      combined.push({
        orientation,
        start:
          orientation === 'horizontal'
            ? { x: start, z: Number(key) }
            : { x: Number(key), z: start },
        end:
          orientation === 'horizontal'
            ? { x: end, z: Number(key) }
            : { x: Number(key), z: end },
        rooms,
        sourceWall,
      });
    }
  }
  return combined;
}

function expandWallDefinition(wall: WallDefinition): AtomicWallSegment[] {
  const segments = 'segments' in wall ? wall.segments : splitRun(wall.run);
  return segments.flatMap((segment) => {
    const orientation = getOrientation(segment.start, segment.end);
    if (!orientation) {
      throw new Error(
        `Wall ${wall.id} contains a non-axis-aligned segment from ${formatPoint(
          segment.start
        )} to ${formatPoint(segment.end)}. Declarative wall generation only supports horizontal or vertical walls.`
      );
    }
    return [{ wall, orientation, start: segment.start, end: segment.end }];
  });
}

function splitRun(
  run: WallDefinition['run']
): Array<{ start: { x: number; z: number }; end: { x: number; z: number } }> {
  const length = Math.hypot(run.end.x - run.start.x, run.end.z - run.start.z);
  if (length <= AXIS_EPSILON) return [];
  const gaps = [...(run.gaps ?? [])]
    .map((gap) => ({
      start: Math.max(0, Math.min(length, gap.start)),
      end: Math.max(0, Math.min(length, gap.end)),
    }))
    .filter((gap) => gap.end - gap.start > AXIS_EPSILON)
    .sort((a, b) => a.start - b.start);
  const spans: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  gaps.forEach((gap) => {
    if (gap.start > cursor) spans.push({ start: cursor, end: gap.start });
    cursor = Math.max(cursor, gap.end);
  });
  if (cursor < length) spans.push({ start: cursor, end: length });
  return spans.map((span) => ({
    start: interpolate(run, span.start / length),
    end: interpolate(run, span.end / length),
  }));
}

function interpolate(
  run: WallDefinition['run'],
  ratio: number
): { x: number; z: number } {
  return {
    x: run.start.x + (run.end.x - run.start.x) * ratio,
    z: run.start.z + (run.end.z - run.start.z) * ratio,
  };
}

function getOrientation(
  start: { x: number; z: number },
  end: { x: number; z: number }
): Axis | undefined {
  if (Math.abs(start.z - end.z) <= AXIS_EPSILON) return 'horizontal';
  if (Math.abs(start.x - end.x) <= AXIS_EPSILON) return 'vertical';
  return undefined;
}

function getAxisRange(segment: AtomicWallSegment): [number, number] {
  const a =
    segment.orientation === 'horizontal' ? segment.start.x : segment.start.z;
  const b =
    segment.orientation === 'horizontal' ? segment.end.x : segment.end.z;
  return [Math.min(a, b), Math.max(a, b)];
}

function getRoomBreakpointsForSegment(
  floor: FloorDefinition,
  segment: AtomicWallSegment
): number[] {
  return (segment.wall.rooms ?? []).flatMap((roomId) => {
    const room = floor.rooms.find((candidate) => candidate.id === roomId);
    const roomWall = room ? getRoomWallForWall(room, segment.wall) : undefined;
    if (!room || !roomWall) return [];
    return segment.orientation === 'horizontal'
      ? [room.bounds.minX, room.bounds.maxX]
      : [room.bounds.minZ, room.bounds.maxZ];
  });
}

function getRoomWallsForSpan(
  floor: FloorDefinition,
  wall: WallDefinition,
  orientation: Axis,
  spanStart: number,
  spanEnd: number
): Array<{ id: string; wall: RoomWall }> {
  return (wall.rooms ?? []).flatMap((roomId) => {
    const room = floor.rooms.find((candidate) => candidate.id === roomId);
    const roomWall = room ? getRoomWallForWall(room, wall) : undefined;
    if (!roomWall || !room) return [];
    const roomStart =
      orientation === 'horizontal' ? room.bounds.minX : room.bounds.minZ;
    const roomEnd =
      orientation === 'horizontal' ? room.bounds.maxX : room.bounds.maxZ;
    if (
      roomStart <= spanStart + AXIS_EPSILON &&
      roomEnd >= spanEnd - AXIS_EPSILON
    ) {
      return [{ id: roomId, wall: roomWall }];
    }
    return [];
  });
}

function getRoomWallForWall(
  room: SemanticRoomDefinition,
  wall: WallDefinition
): RoomWall | undefined {
  const start = 'run' in wall ? wall.run.start : wall.segments[0]?.start;
  const end = 'run' in wall ? wall.run.end : wall.segments[0]?.end;
  if (!start || !end) return undefined;
  if (Math.abs(start.z - end.z) <= AXIS_EPSILON) {
    if (Math.abs(start.z - room.bounds.maxZ) <= AXIS_EPSILON) return 'north';
    if (Math.abs(start.z - room.bounds.minZ) <= AXIS_EPSILON) return 'south';
  }
  if (Math.abs(start.x - end.x) <= AXIS_EPSILON) {
    if (Math.abs(start.x - room.bounds.maxX) <= AXIS_EPSILON) return 'east';
    if (Math.abs(start.x - room.bounds.minX) <= AXIS_EPSILON) return 'west';
  }
  return undefined;
}

function uniqueRoomWalls(
  rooms: Array<{ id: string; wall: RoomWall }>
): Array<{ id: string; wall: RoomWall }> {
  const seen = new Set<string>();
  return rooms.filter((room) => {
    const key = `${room.id}:${room.wall}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createSegmentId(segment: CombinedWallSegment): string {
  const rooms = segment.rooms
    .map((room) => `${room.id}:${room.wall}`)
    .sort()
    .join('|');
  return [
    segment.orientation,
    formatPoint(segment.start),
    formatPoint(segment.end),
    rooms || 'none',
  ].join('|');
}

function formatPoint(point: { x: number; z: number }): string {
  return `${point.x.toFixed(3)},${point.z.toFixed(3)}`;
}

function formatKey(value: number): string {
  return value.toFixed(3);
}

function scaleFloorDefinition(
  floor: FloorDefinition,
  scale: number
): FloorDefinition {
  if (scale === 1) return floor;
  const scalePoint = (point: { x: number; z: number }) => ({
    x: point.x * scale,
    z: point.z * scale,
  });
  return {
    ...floor,
    outline: floor.outline.map(([x, z]) => [x * scale, z * scale]),
    rooms: floor.rooms.map((room) => ({
      ...room,
      bounds: {
        minX: room.bounds.minX * scale,
        maxX: room.bounds.maxX * scale,
        minZ: room.bounds.minZ * scale,
        maxZ: room.bounds.maxZ * scale,
      },
    })),
    walls: floor.walls.map((wall) => {
      if ('run' in wall) {
        return {
          ...wall,
          run: {
            ...wall.run,
            start: scalePoint(wall.run.start),
            end: scalePoint(wall.run.end),
            gaps: wall.run.gaps?.map((gap) => ({
              ...gap,
              start: gap.start * scale,
              end: gap.end * scale,
            })),
          },
        };
      }
      return {
        ...wall,
        segments: wall.segments.map((segment) => ({
          start: scalePoint(segment.start),
          end: scalePoint(segment.end),
        })),
      };
    }),
  };
}
