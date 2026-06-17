import type {
  DoorwayDefinition,
  FloorPlanDefinition,
  RoomDefinition,
  RoomWall,
} from '../../assets/floorPlan';

import type {
  FloorDefinition,
  WallDefinition,
  WallRunDefinition,
} from './schema';

const isHorizontalRun = (run: WallRunDefinition): boolean =>
  run.start.z === run.end.z;
const isVerticalRun = (run: WallRunDefinition): boolean =>
  run.start.x === run.end.x;

const toDoorwayWall = (wall: RoomWall): RoomWall => wall;

const gapToDoorway = (
  run: WallRunDefinition,
  wall: RoomWall
): DoorwayDefinition[] => {
  if (!run.gaps || run.gaps.length === 0) {
    return [];
  }

  if (!isHorizontalRun(run) && !isVerticalRun(run)) {
    return [];
  }

  return run.gaps.map((gap) => ({
    wall: toDoorwayWall(wall),
    start: gap.start,
    end: gap.end,
  }));
};

const getLegacyDoorwaysForRoom = (
  walls: WallDefinition[],
  roomId: string
): DoorwayDefinition[] =>
  walls.flatMap((wall) => {
    if (!('run' in wall)) {
      return [];
    }

    return (wall.rooms ?? [])
      .filter((room) => room.roomId === roomId)
      .flatMap((room) => gapToDoorway(wall.run, room.wall));
  });

/**
 * Transitional adapter for legacy systems that still consume FloorPlanDefinition.
 *
 * Rooms are copied from declarative semantic rooms. Doorways are derived only
 * from intentional current-state gaps on wall runs so legacy room-wall helpers
 * can keep splitting wall segments; semantic roomConnections do not create or
 * remove geometry and are intentionally ignored here.
 */
export function compileLegacyFloorPlan(
  floor: FloorDefinition
): FloorPlanDefinition {
  const rooms: RoomDefinition[] = floor.rooms.map((room) => {
    const doorways = getLegacyDoorwaysForRoom(floor.walls, room.id);
    return {
      id: room.id,
      name: room.name,
      bounds: { ...room.bounds },
      ledColor: room.ledColor,
      category: room.category,
      ...(doorways.length > 0 ? { doorways } : {}),
    };
  });

  return {
    outline: floor.outline.map(([x, z]) => [x, z]),
    rooms,
  };
}
