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

export type RoomCategory = 'interior' | 'exterior';

export interface RoomDefinition {
  id: string;
  name: string;
  bounds: Bounds2D;
  ledColor: number;
  doorways?: DoorwayDefinition[];
  category?: RoomCategory;
}

export interface FloorPlanDefinition {
  outline: Array<[number, number]>;
  rooms: RoomDefinition[];
}

export const FLOOR_PLAN_SCALE = Math.SQRT2 * Math.SQRT2;

const scaleValue = (value: number): number => value * FLOOR_PLAN_SCALE;

const scaleFloorPlanDefinition = (
  plan: FloorPlanDefinition
): FloorPlanDefinition => ({
  outline: plan.outline.map(([x, z]) => [scaleValue(x), scaleValue(z)]),
  rooms: plan.rooms.map((room) => ({
    ...room,
    bounds: {
      minX: scaleValue(room.bounds.minX),
      maxX: scaleValue(room.bounds.maxX),
      minZ: scaleValue(room.bounds.minZ),
      maxZ: scaleValue(room.bounds.maxZ),
    },
    doorways: room.doorways?.map((doorway) => ({
      ...doorway,
      start: scaleValue(doorway.start),
      end: scaleValue(doorway.end),
    })),
  })),
});

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

const DOOR_WIDTH = 4;
const DOOR_HALF_WIDTH = DOOR_WIDTH / 2;

const livingToKitchenDoorCenter = -9;
const livingToStudioDoorCenter = 7.5;
const kitchenToBackyardDoorCenter = -9;
const studioToBackyardDoorCenter = 7.5;
const kitchenToStudioDoorCenterZ = 2;

const doorwayRange = (center: number) => ({
  start: center - DOOR_HALF_WIDTH,
  end: center + DOOR_HALF_WIDTH,
});

const BASE_FLOOR_PLAN: FloorPlanDefinition = {
  outline: [
    [-16, -16],
    [16, -16],
    [16, 16],
    [-16, 16],
  ],
  rooms: [
    {
      id: 'livingRoom',
      name: 'Living Room',
      bounds: { minX: -16, maxX: 16, minZ: -16, maxZ: -4 },
      ledColor: 0x4cf889,
      doorways: [
        {
          wall: 'north',
          ...doorwayRange(livingToKitchenDoorCenter),
        },
        {
          wall: 'north',
          ...doorwayRange(livingToStudioDoorCenter),
        },
      ],
    },
    {
      id: 'studio',
      name: 'Studio',
      bounds: { minX: -2, maxX: 16, minZ: -4, maxZ: 8 },
      ledColor: 0x58c4ff,
      doorways: [
        {
          wall: 'south',
          ...doorwayRange(livingToStudioDoorCenter),
        },
        {
          wall: 'west',
          ...doorwayRange(kitchenToStudioDoorCenterZ),
        },
        {
          wall: 'north',
          ...doorwayRange(studioToBackyardDoorCenter),
        },
      ],
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      bounds: { minX: -16, maxX: -2, minZ: -4, maxZ: 8 },
      ledColor: 0xffb347,
      doorways: [
        {
          wall: 'south',
          ...doorwayRange(livingToKitchenDoorCenter),
        },
        {
          wall: 'east',
          ...doorwayRange(kitchenToStudioDoorCenterZ),
        },
        {
          wall: 'north',
          ...doorwayRange(kitchenToBackyardDoorCenter),
        },
      ],
    },
    {
      id: 'backyard',
      name: 'Backyard',
      bounds: { minX: -16, maxX: 16, minZ: 8, maxZ: 16 },
      ledColor: 0x274f37,
      doorways: [
        {
          wall: 'south',
          ...doorwayRange(kitchenToBackyardDoorCenter),
        },
        {
          wall: 'south',
          ...doorwayRange(studioToBackyardDoorCenter),
        },
      ],
      category: 'exterior',
    },
  ],
};

const UPPER_FLOOR_BASE_PLAN: FloorPlanDefinition = {
  outline: [
    [-14, -16],
    [14, -16],
    [14, 14],
    [-14, 14],
  ],
  rooms: [
    {
      id: 'upperLanding',
      name: 'Upper Landing',
      bounds: { minX: 2, maxX: 10.4, minZ: -16, maxZ: -8 },
      ledColor: 0xffba52,
      doorways: [
        {
          wall: 'west',
          ...doorwayRange(-12),
        },
        {
          wall: 'north',
          ...doorwayRange(6.2),
        },
      ],
    },
    {
      id: 'creatorsStudio',
      name: 'Creators Studio',
      bounds: { minX: -10, maxX: 2, minZ: -16, maxZ: 0 },
      ledColor: 0x7bd5ff,
      doorways: [
        {
          wall: 'east',
          ...doorwayRange(-12),
        },
        {
          wall: 'east',
          ...doorwayRange(-4),
        },
      ],
    },
    {
      id: 'loftLibrary',
      name: 'Loft Library',
      bounds: { minX: 2, maxX: 12, minZ: -8, maxZ: 6 },
      ledColor: 0xc3a7ff,
      doorways: [
        {
          wall: 'south',
          ...doorwayRange(6.2),
        },
        {
          wall: 'west',
          ...doorwayRange(-4),
        },
        {
          wall: 'north',
          ...doorwayRange(4),
        },
      ],
    },
    {
      id: 'focusPods',
      name: 'Focus Pods',
      bounds: { minX: -10, maxX: 12, minZ: 6, maxZ: 14 },
      ledColor: 0x9cf7c7,
      doorways: [
        {
          wall: 'south',
          ...doorwayRange(4),
        },
      ],
    },
  ],
};

export const FLOOR_PLAN: FloorPlanDefinition =
  scaleFloorPlanDefinition(BASE_FLOOR_PLAN);

export const UPPER_FLOOR_PLAN: FloorPlanDefinition = scaleFloorPlanDefinition(
  UPPER_FLOOR_BASE_PLAN
);

export interface FloorPlanLevel {
  id: string;
  name: string;
  plan: FloorPlanDefinition;
}

export const FLOOR_PLAN_LEVELS: FloorPlanLevel[] = [
  { id: 'ground', name: 'Ground Floor', plan: FLOOR_PLAN },
  { id: 'upper', name: 'Upper Floor', plan: UPPER_FLOOR_PLAN },
];

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

export function getCombinedWallSegments(
  plan: FloorPlanDefinition
): CombinedWallSegment[] {
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
        (segment) =>
          segment.start <= start + epsilon && segment.end >= end - epsilon
      );
      if (covering.length === 0) {
        continue;
      }
      combined.push({
        orientation: 'horizontal',
        start: { x: start, z: Number(zKey) },
        end: { x: end, z: Number(zKey) },
        rooms: covering.map((segment) => ({
          id: segment.roomId,
          wall: segment.wall,
        })),
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
        (segment) =>
          segment.start <= start + epsilon && segment.end >= end - epsilon
      );
      if (covering.length === 0) {
        continue;
      }
      combined.push({
        orientation: 'vertical',
        start: { x: Number(xKey), z: start },
        end: { x: Number(xKey), z: end },
        rooms: covering.map((segment) => ({
          id: segment.roomId,
          wall: segment.wall,
        })),
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
