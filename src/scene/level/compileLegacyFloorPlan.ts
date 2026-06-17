import type {
  DoorwayDefinition,
  FloorPlanDefinition,
  RoomWall,
} from '../../assets/floorPlan';

import {
  assertValidLevelDefinition,
  type FloorDefinition,
  type LevelDefinition,
  type SemanticRoomDefinition,
  type WallDefinition,
} from './schema';

const AXIS_EPSILON = 1e-6;

export interface CompileLegacyFloorPlanOptions {
  includeDoorwaysFromWallGaps?: boolean;
}

export function compileLegacyFloorPlan(
  level: LevelDefinition,
  floorId: string,
  options: CompileLegacyFloorPlanOptions = {}
): FloorPlanDefinition {
  assertValidLevelDefinition(level);
  const floor = level.floors.find((candidate) => candidate.id === floorId);
  if (!floor)
    throw new Error(`Level "${level.id}" does not contain floor "${floorId}".`);

  return {
    outline: floor.outline,
    rooms: floor.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      bounds: room.bounds,
      ledColor: room.ledColor,
      category: room.category,
      doorways: options.includeDoorwaysFromWallGaps
        ? deriveDoorwaysFromWallGaps(floor, room)
        : undefined,
    })),
  };
}

function deriveDoorwaysFromWallGaps(
  floor: FloorDefinition,
  room: SemanticRoomDefinition
): DoorwayDefinition[] | undefined {
  const doorways = floor.walls.flatMap((wall) =>
    getDoorwaysForWall(room, wall)
  );
  return doorways.length > 0 ? doorways : undefined;
}

function getDoorwaysForWall(
  room: SemanticRoomDefinition,
  wall: WallDefinition
): DoorwayDefinition[] {
  if (!('run' in wall) || !wall.rooms?.includes(room.id) || !wall.run.gaps)
    return [];

  const roomWall = getRoomWallForRun(room, wall.run);
  if (!roomWall) return [];

  return wall.run.gaps.map((gap) => ({
    wall: roomWall,
    start: gap.start,
    end: gap.end,
  }));
}

function getRoomWallForRun(
  room: SemanticRoomDefinition,
  run: WallDefinition['run']
): RoomWall | undefined {
  if (Math.abs(run.start.z - run.end.z) <= AXIS_EPSILON) {
    if (Math.abs(run.start.z - room.bounds.maxZ) <= AXIS_EPSILON)
      return 'north';
    if (Math.abs(run.start.z - room.bounds.minZ) <= AXIS_EPSILON)
      return 'south';
  }

  if (Math.abs(run.start.x - run.end.x) <= AXIS_EPSILON) {
    if (Math.abs(run.start.x - room.bounds.maxX) <= AXIS_EPSILON) return 'east';
    if (Math.abs(run.start.x - room.bounds.minX) <= AXIS_EPSILON) return 'west';
  }

  return undefined;
}
