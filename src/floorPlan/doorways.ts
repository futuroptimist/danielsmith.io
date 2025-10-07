import type { RectCollider } from '../collision';
import {
  type DoorwayDefinition,
  type FloorPlanDefinition,
  type RoomDefinition,
  type RoomWall,
  WALL_THICKNESS,
} from '../floorPlan';

export interface DoorwayClearanceZone {
  roomId: string;
  wall: RoomWall;
  doorway: DoorwayDefinition;
  bounds: RectCollider;
}

export interface DoorwayClearanceOptions {
  /** Depth to reserve inside the room for each doorway threshold. */
  depth?: number;
  /** Extra clearance on each horizontal side of the doorway opening. */
  sidePadding?: number;
  /** Comparison epsilon to avoid floating point issues. */
  epsilon?: number;
}

const DEFAULT_OPTIONS: Required<DoorwayClearanceOptions> = {
  depth: WALL_THICKNESS * 2,
  sidePadding: 0.6,
  epsilon: 1e-4,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function getDoorwayClearanceZones(
  plan: FloorPlanDefinition,
  options: DoorwayClearanceOptions = {}
): DoorwayClearanceZone[] {
  const { depth, sidePadding, epsilon } = { ...DEFAULT_OPTIONS, ...options };

  const zones: DoorwayClearanceZone[] = [];

  const normalizeRange = (doorway: DoorwayDefinition) => {
    const start = Math.min(doorway.start, doorway.end);
    const end = Math.max(doorway.start, doorway.end);
    return { start, end };
  };

  const createZone = (
    room: RoomDefinition,
    doorway: DoorwayDefinition
  ): RectCollider | null => {
    const range = normalizeRange(doorway);
    const paddedStart = range.start - sidePadding;
    const paddedEnd = range.end + sidePadding;

    switch (doorway.wall) {
      case 'north': {
        const maxZ = room.bounds.maxZ + epsilon;
        const minZ = clamp(room.bounds.maxZ - depth, room.bounds.minZ, maxZ);
        if (maxZ - minZ <= epsilon) {
          return null;
        }
        return {
          minX: clamp(paddedStart, room.bounds.minX, room.bounds.maxX),
          maxX: clamp(paddedEnd, room.bounds.minX, room.bounds.maxX),
          minZ,
          maxZ,
        };
      }
      case 'south': {
        const minZ = room.bounds.minZ - epsilon;
        const maxZ = clamp(room.bounds.minZ + depth, minZ, room.bounds.maxZ);
        if (maxZ - minZ <= epsilon) {
          return null;
        }
        return {
          minX: clamp(paddedStart, room.bounds.minX, room.bounds.maxX),
          maxX: clamp(paddedEnd, room.bounds.minX, room.bounds.maxX),
          minZ,
          maxZ,
        };
      }
      case 'east': {
        const maxX = room.bounds.maxX + epsilon;
        const minX = clamp(room.bounds.maxX - depth, room.bounds.minX, maxX);
        if (maxX - minX <= epsilon) {
          return null;
        }
        return {
          minX,
          maxX,
          minZ: clamp(paddedStart, room.bounds.minZ, room.bounds.maxZ),
          maxZ: clamp(paddedEnd, room.bounds.minZ, room.bounds.maxZ),
        };
      }
      case 'west': {
        const minX = room.bounds.minX - epsilon;
        const maxX = clamp(room.bounds.minX + depth, minX, room.bounds.maxX);
        if (maxX - minX <= epsilon) {
          return null;
        }
        return {
          minX,
          maxX,
          minZ: clamp(paddedStart, room.bounds.minZ, room.bounds.maxZ),
          maxZ: clamp(paddedEnd, room.bounds.minZ, room.bounds.maxZ),
        };
      }
      default:
        return null;
    }
  };

  plan.rooms.forEach((room) => {
    room.doorways?.forEach((doorway) => {
      const bounds = createZone(room, doorway);
      if (!bounds) {
        return;
      }
      if (
        bounds.maxX - bounds.minX <= epsilon ||
        bounds.maxZ - bounds.minZ <= epsilon
      ) {
        return;
      }
      zones.push({ roomId: room.id, wall: doorway.wall, doorway, bounds });
    });
  });

  return zones;
}
