import type { RectCollider } from '../../systems/collision';
import {
  type DoorwayDefinition,
  type FloorPlanDefinition,
  type RoomDefinition,
  type RoomWall,
  WALL_THICKNESS,
} from '../floorPlan';

export type DoorwayAxis = 'horizontal' | 'vertical';

export interface NormalizedDoorway {
  axis: DoorwayAxis;
  width: number;
  center: { x: number; z: number };
}

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

const DOOR_KEY_PRECISION = 3;

const toDoorwayAxis = (wall: RoomWall): DoorwayAxis =>
  wall === 'north' || wall === 'south' ? 'horizontal' : 'vertical';

function normalizeDoorway(
  roomBounds: RoomDefinition['bounds'],
  doorway: DoorwayDefinition
): NormalizedDoorway {
  const axis = toDoorwayAxis(doorway.wall);
  const width = Math.abs(doorway.end - doorway.start);

  if (axis === 'horizontal') {
    const centerX = (doorway.start + doorway.end) / 2;
    const centerZ =
      doorway.wall === 'north' ? roomBounds.maxZ : roomBounds.minZ;
    return { axis, width, center: { x: centerX, z: centerZ } };
  }

  const centerZ = (doorway.start + doorway.end) / 2;
  const centerX = doorway.wall === 'east' ? roomBounds.maxX : roomBounds.minX;
  return { axis, width, center: { x: centerX, z: centerZ } };
}

const doorwayKey = (doorway: NormalizedDoorway): string =>
  [
    doorway.axis,
    doorway.center.x.toFixed(DOOR_KEY_PRECISION),
    doorway.center.z.toFixed(DOOR_KEY_PRECISION),
    doorway.width.toFixed(DOOR_KEY_PRECISION),
  ].join('|');

const sortDoorways = (doorways: NormalizedDoorway[]): NormalizedDoorway[] =>
  [...doorways].sort((a, b) => {
    if (a.axis !== b.axis) {
      return a.axis === 'horizontal' ? -1 : 1;
    }
    if (a.center.z !== b.center.z) {
      return a.center.z - b.center.z;
    }
    if (a.center.x !== b.center.x) {
      return a.center.x - b.center.x;
    }
    return a.width - b.width;
  });

export function getNormalizedDoorways(
  plan: FloorPlanDefinition
): NormalizedDoorway[] {
  const accumulator = new Map<string, NormalizedDoorway>();
  plan.rooms.forEach((room) => {
    room.doorways?.forEach((doorway) => {
      const normalized = normalizeDoorway(room.bounds, doorway);
      const key = doorwayKey(normalized);
      if (!accumulator.has(key)) {
        accumulator.set(key, normalized);
      }
    });
  });
  return sortDoorways(Array.from(accumulator.values()));
}

export interface DoorwayPassageZone {
  doorway: NormalizedDoorway;
  bounds: RectCollider;
}

export interface DoorwayPassageZoneOptions {
  depth?: number;
  padding?: number;
  epsilon?: number;
}

const DEFAULT_PASSAGE_OPTIONS: Required<DoorwayPassageZoneOptions> = {
  depth: WALL_THICKNESS * 2,
  padding: 0.9,
  epsilon: 1e-4,
};

export function getDoorwayPassageZones(
  plan: FloorPlanDefinition,
  options: DoorwayPassageZoneOptions = {}
): DoorwayPassageZone[] {
  const { depth, padding, epsilon } = {
    ...DEFAULT_PASSAGE_OPTIONS,
    ...options,
  };
  const halfDepth = depth / 2;

  return getNormalizedDoorways(plan)
    .map((doorway) => {
      const halfWidth = doorway.width / 2;
      if (doorway.axis === 'horizontal') {
        const minX = doorway.center.x - halfWidth - padding;
        const maxX = doorway.center.x + halfWidth + padding;
        const minZ = doorway.center.z - halfDepth - epsilon;
        const maxZ = doorway.center.z + halfDepth + epsilon;
        if (maxX <= minX || maxZ <= minZ) {
          return null;
        }
        return {
          doorway,
          bounds: { minX, maxX, minZ, maxZ },
        } satisfies DoorwayPassageZone;
      }

      const minX = doorway.center.x - halfDepth - epsilon;
      const maxX = doorway.center.x + halfDepth + epsilon;
      const minZ = doorway.center.z - halfWidth - padding;
      const maxZ = doorway.center.z + halfWidth + padding;
      if (maxX <= minX || maxZ <= minZ) {
        return null;
      }
      return {
        doorway,
        bounds: { minX, maxX, minZ, maxZ },
      } satisfies DoorwayPassageZone;
    })
    .filter((zone): zone is DoorwayPassageZone => zone !== null);
}

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
