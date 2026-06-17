import type {
  DoorwayDefinition,
  FloorPlanDefinition,
  RoomWall,
} from '../../assets/floorPlan';

import {
  assertValidLevelDefinition,
  type FloorDefinition,
  type LevelDefinition,
  type WallRunDefinition,
} from './schema';

interface CompileLegacyFloorPlanOptions {
  level?: LevelDefinition;
}

const EPSILON = 1e-6;

const nearlyEqual = (a: number, b: number): boolean =>
  Math.abs(a - b) <= EPSILON;

const normalizeRange = (
  start: number,
  end: number
): Pick<DoorwayDefinition, 'start' | 'end'> =>
  start <= end ? { start, end } : { start: end, end: start };

const getDoorwayFromRunGap = (
  run: WallRunDefinition,
  gap: { start: number; end: number },
  room: FloorDefinition['rooms'][number]
): DoorwayDefinition | null => {
  const { bounds } = room;
  const horizontal = nearlyEqual(run.start.z, run.end.z);
  const vertical = nearlyEqual(run.start.x, run.end.x);

  if (horizontal) {
    if (nearlyEqual(run.start.z, bounds.maxZ)) {
      return { wall: 'north', ...normalizeRange(gap.start, gap.end) };
    }
    if (nearlyEqual(run.start.z, bounds.minZ)) {
      return { wall: 'south', ...normalizeRange(gap.start, gap.end) };
    }
  }

  if (vertical) {
    if (nearlyEqual(run.start.x, bounds.maxX)) {
      return { wall: 'east', ...normalizeRange(gap.start, gap.end) };
    }
    if (nearlyEqual(run.start.x, bounds.minX)) {
      return { wall: 'west', ...normalizeRange(gap.start, gap.end) };
    }
  }

  return null;
};

const sortDoorways = (doorways: DoorwayDefinition[]): DoorwayDefinition[] => {
  const wallOrder: Record<RoomWall, number> = {
    north: 0,
    east: 1,
    south: 2,
    west: 3,
  };
  return [...doorways].sort(
    (a, b) => wallOrder[a.wall] - wallOrder[b.wall] || a.start - b.start
  );
};

/**
 * Transitional adapter from declarative floor data to the legacy room-focused
 * FloorPlanDefinition shape. Doorways are inferred only from current wall-run
 * gaps when a gap lies on one of the referenced room bounds; semantic
 * roomConnections are intentionally ignored because they are not geometry.
 */
export const compileLegacyFloorPlan = (
  floor: FloorDefinition,
  options: CompileLegacyFloorPlanOptions = {}
): FloorPlanDefinition => {
  if (options.level) {
    assertValidLevelDefinition(options.level);
  }

  const doorwaysByRoomId = new Map<string, DoorwayDefinition[]>();
  floor.rooms.forEach((room) => doorwaysByRoomId.set(room.id, []));

  for (const wall of floor.walls) {
    if (!('run' in wall) || !wall.run.gaps || wall.run.gaps.length === 0) {
      continue;
    }

    for (const roomId of wall.rooms ?? []) {
      const room = floor.rooms.find((candidate) => candidate.id === roomId);
      if (!room) continue;

      for (const gap of wall.run.gaps) {
        const doorway = getDoorwayFromRunGap(wall.run, gap, room);
        if (doorway) {
          doorwaysByRoomId.get(room.id)?.push(doorway);
        }
      }
    }
  }

  return {
    outline: floor.outline.map(([x, z]) => [x, z]),
    rooms: floor.rooms.map((room) => {
      const doorways = sortDoorways(doorwaysByRoomId.get(room.id) ?? []);
      return {
        id: room.id,
        name: room.name,
        bounds: { ...room.bounds },
        ledColor: room.ledColor,
        ...(doorways.length > 0 ? { doorways } : {}),
        ...(room.category ? { category: room.category } : {}),
      };
    }),
  };
};
