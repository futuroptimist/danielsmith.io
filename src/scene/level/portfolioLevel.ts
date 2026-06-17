import type { DoorwayDefinition, RoomWall } from '../../assets/floorPlan';

import type {
  Bounds2D,
  FloorDefinition,
  LevelDefinition,
  RoomCategory,
  SemanticRoomDefinition,
  WallDefinition,
} from './schema';
import { assertLevelSourceId } from './sourceIds';

type RoomSeed = Omit<SemanticRoomDefinition, 'sourceId'> & {
  doorways?: DoorwayDefinition[];
};

const DOOR_WIDTH = 4;
const DOOR_HALF_WIDTH = DOOR_WIDTH / 2;
const WALL_ORDER: RoomWall[] = ['north', 'east', 'south', 'west'];

const sourceId = (value: string) => assertLevelSourceId(value);
const doorwayRange = (center: number) => ({
  start: center - DOOR_HALF_WIDTH,
  end: center + DOOR_HALF_WIDTH,
});

const livingToKitchenDoorCenter = -9;
const livingToStudioDoorCenter = 7.5;
const kitchenToBackyardDoorCenter = -9;
const studioToBackyardDoorCenter = 7.5;
const kitchenToStudioDoorCenterZ = 2;
const upperLandingToCreatorsStudioDoorway = { start: -16, end: -13.07 };
const upperLandingToLoftLibraryDoorway = { start: 2, end: 8.2 };

const groundRooms: RoomSeed[] = [
  {
    id: 'livingRoom',
    name: 'Living Room',
    bounds: { minX: -16, maxX: 16, minZ: -16, maxZ: -4 },
    ledColor: 0x4cf889,
    doorways: [
      { wall: 'north', ...doorwayRange(livingToKitchenDoorCenter) },
      { wall: 'north', ...doorwayRange(livingToStudioDoorCenter) },
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    bounds: { minX: -2, maxX: 16, minZ: -4, maxZ: 8 },
    ledColor: 0x58c4ff,
    doorways: [
      { wall: 'south', ...doorwayRange(livingToStudioDoorCenter) },
      { wall: 'west', ...doorwayRange(kitchenToStudioDoorCenterZ) },
      { wall: 'north', ...doorwayRange(studioToBackyardDoorCenter) },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    bounds: { minX: -16, maxX: -2, minZ: -4, maxZ: 8 },
    ledColor: 0xffb347,
    doorways: [
      { wall: 'south', ...doorwayRange(livingToKitchenDoorCenter) },
      { wall: 'east', ...doorwayRange(kitchenToStudioDoorCenterZ) },
      { wall: 'north', ...doorwayRange(kitchenToBackyardDoorCenter) },
    ],
  },
  {
    id: 'backyard',
    name: 'Backyard',
    bounds: { minX: -16, maxX: 16, minZ: 8, maxZ: 16 },
    ledColor: 0x274f37,
    doorways: [
      { wall: 'south', ...doorwayRange(kitchenToBackyardDoorCenter) },
      { wall: 'south', ...doorwayRange(studioToBackyardDoorCenter) },
    ],
    category: 'exterior',
  },
];

const upperRooms: RoomSeed[] = [
  {
    id: 'upperLanding',
    name: 'Upper Landing',
    bounds: { minX: 2, maxX: 10.4, minZ: -16, maxZ: -8 },
    ledColor: 0xffba52,
    doorways: [
      { wall: 'west', ...upperLandingToCreatorsStudioDoorway },
      { wall: 'north', ...upperLandingToLoftLibraryDoorway },
    ],
  },
  {
    id: 'creatorsStudio',
    name: 'Creators Studio',
    bounds: { minX: -10, maxX: 2, minZ: -16, maxZ: 0 },
    ledColor: 0x7bd5ff,
    doorways: [
      { wall: 'east', ...upperLandingToCreatorsStudioDoorway },
      { wall: 'east', ...doorwayRange(-4) },
    ],
  },
  {
    id: 'loftLibrary',
    name: 'Loft Library',
    bounds: { minX: 2, maxX: 12, minZ: -8, maxZ: 6 },
    ledColor: 0xc3a7ff,
    doorways: [
      { wall: 'south', ...upperLandingToLoftLibraryDoorway },
      { wall: 'west', ...doorwayRange(-4) },
      { wall: 'north', ...doorwayRange(4) },
    ],
  },
  {
    id: 'focusPods',
    name: 'Focus Pods',
    bounds: { minX: -10, maxX: 12, minZ: 6, maxZ: 14 },
    ledColor: 0x9cf7c7,
    doorways: [{ wall: 'south', ...doorwayRange(4) }],
  },
];

function toSemanticRooms(
  floorId: string,
  rooms: RoomSeed[]
): SemanticRoomDefinition[] {
  return rooms.map((seed) => {
    const room: Omit<SemanticRoomDefinition, 'sourceId'> = {
      id: seed.id,
      name: seed.name,
      bounds: seed.bounds,
      ledColor: seed.ledColor,
      category: seed.category,
    };

    return {
      ...room,
      sourceId: sourceId(`${floorId}.${toSourcePart(room.id)}.room`),
    };
  });
}

function createFloorSurfaces(floorId: string, rooms: RoomSeed[]) {
  return rooms.map((room) => ({
    id: `${room.id}-floor-surface`,
    sourceId: sourceId(`${floorId}.${toSourcePart(room.id)}.floor_surface`),
    floorId,
    roomId: room.id,
    bounds: { ...room.bounds },
    purpose: room.category === 'exterior' ? 'exterior-floor' : 'room-floor',
  }));
}

function createWalls(floorId: string, rooms: RoomSeed[]): WallDefinition[] {
  return rooms.flatMap((room) =>
    WALL_ORDER.map((wall) => ({
      id: `${room.id}-${wall}-wall`,
      sourceId: sourceId(`${floorId}.${toSourcePart(room.id)}.${wall}_wall`),
      floorId,
      wallKind: room.category === 'exterior' ? 'fence' : 'wall',
      rooms: [room.id],
      purpose:
        room.category === 'exterior' ? 'exterior-boundary' : 'room-boundary',
      run: createWallRun(
        room.bounds,
        wall,
        room.doorways?.filter((doorway) => doorway.wall === wall)
      ),
    }))
  );
}

function createWallRun(
  bounds: Bounds2D,
  wall: RoomWall,
  doorways: DoorwayDefinition[] = []
) {
  const gaps = doorways.map((doorway) => ({
    start:
      Math.min(doorway.start, doorway.end) - getWallAxisStart(bounds, wall),
    end: Math.max(doorway.start, doorway.end) - getWallAxisStart(bounds, wall),
    label: 'current-open-passage',
  }));

  const run = (() => {
    switch (wall) {
      case 'north':
        return {
          start: { x: bounds.minX, z: bounds.maxZ },
          end: { x: bounds.maxX, z: bounds.maxZ },
        };
      case 'south':
        return {
          start: { x: bounds.minX, z: bounds.minZ },
          end: { x: bounds.maxX, z: bounds.minZ },
        };
      case 'east':
        return {
          start: { x: bounds.maxX, z: bounds.minZ },
          end: { x: bounds.maxX, z: bounds.maxZ },
        };
      case 'west':
        return {
          start: { x: bounds.minX, z: bounds.minZ },
          end: { x: bounds.minX, z: bounds.maxZ },
        };
    }
  })();

  return gaps.length > 0 ? { ...run, gaps } : run;
}

function getWallAxisStart(bounds: Bounds2D, wall: RoomWall): number {
  return wall === 'north' || wall === 'south' ? bounds.minX : bounds.minZ;
}

function toSourcePart(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function createFloor(
  id: 'ground' | 'upper',
  name: string,
  outline: Array<[number, number]>,
  rooms: RoomSeed[]
): FloorDefinition {
  return {
    id,
    name,
    outline,
    rooms: toSemanticRooms(id, rooms),
    walls: createWalls(id, rooms),
    floorSurfaces: createFloorSurfaces(id, rooms),
    roomConnections: createRoomConnections(id, rooms),
  };
}

function createRoomConnections(floorId: string, rooms: RoomSeed[]) {
  const pairs = new Map<string, [string, string]>();
  rooms.forEach((room) => {
    room.doorways?.forEach((doorway) => {
      const neighbor = rooms.find(
        (candidate) =>
          candidate.id !== room.id &&
          candidate.doorways?.some(
            (candidateDoorway) =>
              candidateDoorway.wall === oppositeWall(doorway.wall) &&
              rangesOverlap(doorway, candidateDoorway)
          )
      );
      if (!neighbor) return;
      const sorted = [room.id, neighbor.id].sort() as [string, string];
      pairs.set(sorted.map(toSourcePart).join('__'), sorted);
    });
  });

  return [...pairs.entries()].map(([key, roomsForConnection]) => ({
    id: `${key.replace('__', '-')}-connection`,
    sourceId: sourceId(`${floorId}.${key.replace('__', '.')}.connection`),
    floorId,
    rooms: roomsForConnection,
    purpose: 'documentation-only-adjacency',
  }));
}

function oppositeWall(wall: RoomWall): RoomWall {
  return { north: 'south', south: 'north', east: 'west', west: 'east' }[wall];
}

function rangesOverlap(a: DoorwayDefinition, b: DoorwayDefinition): boolean {
  return Math.min(a.end, b.end) - Math.max(a.start, b.start) > 0;
}

export const PORTFOLIO_LEVEL: LevelDefinition = {
  id: 'portfolio-home',
  floors: [
    createFloor(
      'ground',
      'Ground Floor',
      [
        [-16, -16],
        [16, -16],
        [16, 16],
        [-16, 16],
      ],
      groundRooms
    ),
    createFloor(
      'upper',
      'Upper Floor',
      [
        [-14, -16],
        [14, -16],
        [14, 14],
        [-14, 14],
      ],
      upperRooms
    ),
  ],
};

export const PORTFOLIO_LEVEL_ROOM_CATEGORIES: Record<
  string,
  RoomCategory | undefined
> = Object.fromEntries(
  [...groundRooms, ...upperRooms].map((room) => [room.id, room.category])
);
