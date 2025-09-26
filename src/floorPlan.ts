export type RoomWall = 'north' | 'south' | 'east' | 'west';

export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DoorwayDefinition {
  wall: RoomWall;
  start: number;
  end: number;
}

export interface RoomDefinition {
  id: string;
  name: string;
  bounds: Bounds2D;
  ledColor: number;
  doorways?: DoorwayDefinition[];
}

export interface FloorPlanDefinition {
  outline: Array<[number, number]>;
  rooms: RoomDefinition[];
}

export interface RoomWallSegment {
  roomId: string;
  wall: RoomWall;
  orientation: 'horizontal' | 'vertical';
  start: { x: number; z: number };
  end: { x: number; z: number };
}

export interface CombinedWallSegment {
  orientation: 'horizontal' | 'vertical';
  start: { x: number; z: number };
  end: { x: number; z: number };
  rooms: Array<{ id: string; wall: RoomWall }>;
}

export const WALL_THICKNESS = 0.5;

const DOOR_CENTER_X = -6;
const DOOR_WIDTH = 3;
const DOOR_HALF_WIDTH = DOOR_WIDTH / 2;

const livingRoomDoorwayStart = DOOR_CENTER_X - DOOR_HALF_WIDTH;
const livingRoomDoorwayEnd = DOOR_CENTER_X + DOOR_HALF_WIDTH;

export const FLOOR_PLAN: FloorPlanDefinition = {
  outline: [
    [-10, -28],
    [10, -28],
    [10, 0],
    [-2, 0],
    [-2, 24],
    [-10, 24],
  ],
  rooms: [
    {
      id: 'livingRoom',
      name: 'Living Room',
      bounds: { minX: -10, maxX: 10, minZ: -28, maxZ: 0 },
      ledColor: 0x4cf889,
      doorways: [
        {
          wall: 'north',
          start: livingRoomDoorwayStart,
          end: livingRoomDoorwayEnd,
        },
      ],
    },
    {
      id: 'studio',
      name: 'Studio',
      bounds: { minX: -10, maxX: -2, minZ: 0, maxZ: 24 },
      ledColor: 0x58c4ff,
      doorways: [
        {
          wall: 'south',
          start: livingRoomDoorwayStart,
          end: livingRoomDoorwayEnd,
        },
      ],
    },
  ],
};

const WALL_ORDER: RoomWall[] = ['north', 'east', 'south', 'west'];

function sortDoorways(doorways: DoorwayDefinition[] = []): DoorwayDefinition[] {
  return [...doorways].sort((a, b) => a.start - b.start);
}

function segmentRange(
  start: number,
  end: number,
  doorways: DoorwayDefinition[]
): Array<{ start: number; end: number }> {
  if (doorways.length === 0) {
    return start === end ? [] : [{ start, end }];
  }

  const sorted = sortDoorways(doorways);
  const segments: Array<{ start: number; end: number }> = [];
  let cursor = start;

  for (const doorway of sorted) {
    const doorwayStart = Math.max(start, Math.min(end, doorway.start));
    const doorwayEnd = Math.max(start, Math.min(end, doorway.end));

    if (doorwayStart > doorwayEnd) {
      continue;
    }

    if (doorwayStart > cursor) {
      segments.push({ start: cursor, end: doorwayStart });
    }

    cursor = doorwayEnd;
  }

  if (cursor < end) {
    segments.push({ start: cursor, end });
  }

  return segments.filter((segment) => segment.end - segment.start > 1e-3);
}

export function getRoomWallSegments(room: RoomDefinition): RoomWallSegment[] {
  const { bounds } = room;
  const segments: RoomWallSegment[] = [];

  const getDoorwaysForWall = (wall: RoomWall) =>
    room.doorways?.filter((doorway) => doorway.wall === wall) ?? [];

  for (const wall of WALL_ORDER) {
    switch (wall) {
      case 'north': {
        const ranges = segmentRange(
          bounds.minX,
          bounds.maxX,
          getDoorwaysForWall('north')
        );
        for (const range of ranges) {
          segments.push({
            roomId: room.id,
            wall,
            orientation: 'horizontal',
            start: { x: range.start, z: bounds.maxZ },
            end: { x: range.end, z: bounds.maxZ },
          });
        }
        break;
      }
      case 'south': {
        const ranges = segmentRange(
          bounds.minX,
          bounds.maxX,
          getDoorwaysForWall('south')
        );
        for (const range of ranges) {
          segments.push({
            roomId: room.id,
            wall,
            orientation: 'horizontal',
            start: { x: range.start, z: bounds.minZ },
            end: { x: range.end, z: bounds.minZ },
          });
        }
        break;
      }
      case 'east': {
        const ranges = segmentRange(
          bounds.minZ,
          bounds.maxZ,
          getDoorwaysForWall('east')
        );
        for (const range of ranges) {
          segments.push({
            roomId: room.id,
            wall,
            orientation: 'vertical',
            start: { x: bounds.maxX, z: range.start },
            end: { x: bounds.maxX, z: range.end },
          });
        }
        break;
      }
      case 'west': {
        const ranges = segmentRange(
          bounds.minZ,
          bounds.maxZ,
          getDoorwaysForWall('west')
        );
        for (const range of ranges) {
          segments.push({
            roomId: room.id,
            wall,
            orientation: 'vertical',
            start: { x: bounds.minX, z: range.start },
            end: { x: bounds.minX, z: range.end },
          });
        }
        break;
      }
    }
  }

  return segments;
}

function normalizeNumber(value: number): string {
  return value.toFixed(3);
}

export function getCombinedWallSegments(plan: FloorPlanDefinition): CombinedWallSegment[] {
  const horizontal = new Map<
    string,
    Array<{ start: number; end: number; roomId: string; wall: RoomWall }>
  >();
  const vertical = new Map<
    string,
    Array<{ start: number; end: number; roomId: string; wall: RoomWall }>
  >();

  for (const room of plan.rooms) {
    const segments = getRoomWallSegments(room);
    for (const segment of segments) {
      if (segment.orientation === 'horizontal') {
        const startX = Math.min(segment.start.x, segment.end.x);
        const endX = Math.max(segment.start.x, segment.end.x);
        if (endX - startX <= 1e-6) {
          continue;
        }
        const key = normalizeNumber(segment.start.z);
        const list = horizontal.get(key) ?? [];
        list.push({
          start: startX,
          end: endX,
          roomId: segment.roomId,
          wall: segment.wall,
        });
        horizontal.set(key, list);
      } else {
        const startZ = Math.min(segment.start.z, segment.end.z);
        const endZ = Math.max(segment.start.z, segment.end.z);
        if (endZ - startZ <= 1e-6) {
          continue;
        }
        const key = normalizeNumber(segment.start.x);
        const list = vertical.get(key) ?? [];
        list.push({
          start: startZ,
          end: endZ,
          roomId: segment.roomId,
          wall: segment.wall,
        });
        vertical.set(key, list);
      }
    }
  }

  const combined: CombinedWallSegment[] = [];
  const epsilon = 1e-5;

  for (const [zKey, segments] of horizontal.entries()) {
    const breakpoints = new Set<number>();
    segments.forEach((segment) => {
      breakpoints.add(segment.start);
      breakpoints.add(segment.end);
    });
    const sorted = [...breakpoints].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const start = sorted[i];
      const end = sorted[i + 1];
      if (end - start <= epsilon) {
        continue;
      }
      const covering = segments.filter(
        (segment) => segment.start <= start + epsilon && segment.end >= end - epsilon
      );
      if (covering.length === 0) {
        continue;
      }
      combined.push({
        orientation: 'horizontal',
        start: { x: start, z: Number(zKey) },
        end: { x: end, z: Number(zKey) },
        rooms: covering.map((segment) => ({ id: segment.roomId, wall: segment.wall })),
      });
    }
  }

  for (const [xKey, segments] of vertical.entries()) {
    const breakpoints = new Set<number>();
    segments.forEach((segment) => {
      breakpoints.add(segment.start);
      breakpoints.add(segment.end);
    });
    const sorted = [...breakpoints].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const start = sorted[i];
      const end = sorted[i + 1];
      if (end - start <= epsilon) {
        continue;
      }
      const covering = segments.filter(
        (segment) => segment.start <= start + epsilon && segment.end >= end - epsilon
      );
      if (covering.length === 0) {
        continue;
      }
      combined.push({
        orientation: 'vertical',
        start: { x: Number(xKey), z: start },
        end: { x: Number(xKey), z: end },
        rooms: covering.map((segment) => ({ id: segment.roomId, wall: segment.wall })),
      });
    }
  }

  return combined;
}

export function getFloorBounds(plan: FloorPlanDefinition): Bounds2D {
  const bounds: Bounds2D = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };

  for (const [x, z] of plan.outline) {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  }

  return bounds;
}
