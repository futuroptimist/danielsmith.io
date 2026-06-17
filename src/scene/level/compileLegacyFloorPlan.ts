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
    outline: floor.outline.map(([x, z]) => [x, z]),
    rooms: floor.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      bounds: { ...room.bounds },
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

  return wall.run.gaps.flatMap((gap) => {
    const doorwayRange = projectGapToDoorwayRange(wall.run, gap.start, gap.end);
    if (
      !doorwayRange ||
      !doorwayOverlapsRoomWall(room, roomWall, doorwayRange)
    ) {
      return [];
    }

    return [{ wall: roomWall, ...doorwayRange }];
  });
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

function projectGapToDoorwayRange(
  run: WallDefinition['run'],
  gapStart: number,
  gapEnd: number
): Pick<DoorwayDefinition, 'start' | 'end'> | undefined {
  const deltaX = run.end.x - run.start.x;
  const deltaZ = run.end.z - run.start.z;
  const runLength = Math.hypot(deltaX, deltaZ);
  if (runLength <= AXIS_EPSILON) return undefined;

  const startRatio = gapStart / runLength;
  const endRatio = gapEnd / runLength;
  const projectedStart = {
    x: run.start.x + deltaX * startRatio,
    z: run.start.z + deltaZ * startRatio,
  };
  const projectedEnd = {
    x: run.start.x + deltaX * endRatio,
    z: run.start.z + deltaZ * endRatio,
  };

  if (Math.abs(deltaZ) <= AXIS_EPSILON) {
    return normalizeDoorwayRange(projectedStart.x, projectedEnd.x);
  }

  if (Math.abs(deltaX) <= AXIS_EPSILON) {
    return normalizeDoorwayRange(projectedStart.z, projectedEnd.z);
  }

  return undefined;
}

function normalizeDoorwayRange(
  start: number,
  end: number
): Pick<DoorwayDefinition, 'start' | 'end'> {
  return {
    start: roundDoorwayCoordinate(Math.min(start, end)),
    end: roundDoorwayCoordinate(Math.max(start, end)),
  };
}

function roundDoorwayCoordinate(value: number): number {
  return Number(value.toFixed(12));
}

function doorwayOverlapsRoomWall(
  room: SemanticRoomDefinition,
  wall: RoomWall,
  doorway: Pick<DoorwayDefinition, 'start' | 'end'>
): boolean {
  const bounds =
    wall === 'north' || wall === 'south'
      ? { min: room.bounds.minX, max: room.bounds.maxX }
      : { min: room.bounds.minZ, max: room.bounds.maxZ };

  return (
    doorway.end > bounds.min + AXIS_EPSILON &&
    doorway.start < bounds.max - AXIS_EPSILON
  );
}
