import type {
  DoorwayDefinition,
  FloorPlanDefinition,
  RoomWall,
} from '../../assets/floorPlan';

import type {
  FloorDefinition,
  SemanticRoomDefinition,
  WallDefinition,
  WallRunGeometry,
} from './schema';
import { validateFloorDefinition } from './schema';

const EPSILON = 1e-6;

/**
 * Transitional adapter from declarative floor data to the legacy room-first
 * FloorPlanDefinition shape. Doorways are derived from intentional current-state
 * gaps in wall runs only for compatibility with old consumers; roomConnections
 * remain semantic and do not create or remove geometry.
 */
export function compileLegacyFloorPlan(
  floor: FloorDefinition
): FloorPlanDefinition {
  validateFloorDefinition(floor);

  return {
    outline: floor.outline.map(([x, z]) => [x, z]),
    rooms: floor.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      bounds: { ...room.bounds },
      ledColor: room.ledColor,
      category: room.category,
      doorways: deriveDoorways(room, floor.walls),
    })),
  };
}

function deriveDoorways(
  room: SemanticRoomDefinition,
  walls: WallDefinition[]
): DoorwayDefinition[] | undefined {
  const doorways = walls.flatMap((wall) => {
    const roomWall = wall.rooms?.find((entry) => entry.id === room.id)?.wall;
    if (!roomWall || wall.geometry.kind !== 'run') return [];
    return gapsToDoorways(roomWall, wall.geometry);
  });

  if (doorways.length === 0) return undefined;
  return doorways.sort(
    (a, b) => a.wall.localeCompare(b.wall) || a.start - b.start
  );
}

function gapsToDoorways(
  wall: RoomWall,
  run: WallRunGeometry
): DoorwayDefinition[] {
  if (!run.gaps || run.gaps.length === 0) return [];
  const horizontal = Math.abs(run.end.x - run.start.x) > EPSILON;
  const axisMatchesWall =
    wall === 'north' || wall === 'south' ? horizontal : !horizontal;
  if (!axisMatchesWall) return [];
  return run.gaps.map((gap) => ({ wall, start: gap.start, end: gap.end }));
}
