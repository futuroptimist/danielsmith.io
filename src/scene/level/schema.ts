import type { Bounds2D, RoomCategory, RoomWall } from '../../assets/floorPlan';

import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type Point2D = { x: number; z: number };
export type RectangleBounds = Bounds2D;

export interface LevelDefinition {
  id: string;
  floors: FloorDefinition[];
}

export interface FloorDefinition {
  id: string;
  name: string;
  outline: Array<[number, number]>;
  rooms: SemanticRoomDefinition[];
  walls: WallDefinition[];
  floorSurfaces: FloorSurfaceDefinition[];
  safetyColliders?: SafetyColliderDefinition[];
  sceneObjects?: SceneObjectDefinition[];
  roomConnections?: RoomConnectionDefinition[];
}

export interface SemanticRoomDefinition {
  id: string;
  sourceId: LevelSourceId;
  name: string;
  bounds: RectangleBounds;
  ledColor: number;
  category?: RoomCategory;
}

export interface WallRoomReference {
  roomId: string;
  wall: RoomWall;
}

export interface WallSegmentDefinition {
  start: Point2D;
  end: Point2D;
}

export interface WallRunGapDefinition {
  start: number;
  end: number;
  purpose?: string;
}

export interface WallRunDefinition {
  start: Point2D;
  end: Point2D;
  /** Intentional current-state openings; transitional compilers may emit legacy doorways. */
  gaps?: WallRunGapDefinition[];
}

export type WallGeometryDefinition =
  | { segments: WallSegmentDefinition[]; run?: never }
  | { run: WallRunDefinition; segments?: never };

export type WallDefinition = WallGeometryDefinition & {
  id: string;
  sourceId: LevelSourceId;
  floorId: string;
  wallKind: 'wall' | 'fence' | 'railing';
  height?: number;
  thickness?: number;
  rooms?: WallRoomReference[];
  purpose?: string;
};

export interface FloorSurfaceDefinition {
  id: string;
  sourceId: LevelSourceId;
  floorId: string;
  bounds: RectangleBounds;
  roomId?: string;
  elevation?: number;
  purpose?: string;
}

export interface SafetyColliderDefinition {
  id: string;
  sourceId: LevelSourceId;
  floorId: string;
  bounds: RectangleBounds;
  purpose: string;
}

export interface SceneObjectColliderPolicy {
  kind: 'none' | 'footprint' | 'customBounds';
  bounds?: RectangleBounds;
  purpose?: string;
}

export interface SceneObjectDefinition {
  id: string;
  sourceId: LevelSourceId;
  floorId: string;
  kind: string;
  position: Point2D & { y?: number };
  orientation?: number;
  colliderPolicy?: SceneObjectColliderPolicy;
  roomId?: string;
}

export interface RoomConnectionDefinition {
  id: string;
  sourceId: LevelSourceId;
  floorId: string;
  rooms: [string, string, ...string[]];
  label?: string;
  purpose?: string;
}

const TOMBSTONE_SOURCE_ID_PARTS = [
  '.former.',
  '.removed.',
  '.debugOnlyRemoval.',
];
const MIN_POSITIVE = 1e-6;

const isPositiveArea = (bounds: RectangleBounds): boolean =>
  bounds.maxX - bounds.minX > MIN_POSITIVE &&
  bounds.maxZ - bounds.minZ > MIN_POSITIVE;

const segmentLength = (segment: WallSegmentDefinition): number =>
  Math.hypot(segment.end.x - segment.start.x, segment.end.z - segment.start.z);

const runLength = (run: WallRunDefinition): number =>
  segmentLength({ start: run.start, end: run.end });

const assertUnique = (ids: string[], label: string): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate ${label} ID "${id}".`);
    }
    seen.add(id);
  }
};

const validateSourceId = (sourceId: LevelSourceId): void => {
  assertLevelSourceId(sourceId);
  if (TOMBSTONE_SOURCE_ID_PARTS.some((part) => sourceId.includes(part))) {
    throw new Error(`Level source ID "${sourceId}" looks like tombstone data.`);
  }
};

export function validateLevelDefinition(level: LevelDefinition): void {
  assertUnique(
    level.floors.map((floor) => floor.id),
    'floor'
  );

  const sourceIds: string[] = [];
  for (const floor of level.floors) {
    assertUnique(
      floor.rooms.map((room) => room.id),
      `${floor.id} room`
    );
    assertUnique(
      floor.walls.map((wall) => wall.id),
      `${floor.id} wall`
    );
    assertUnique(
      floor.floorSurfaces.map((surface) => surface.id),
      `${floor.id} floor surface`
    );
    assertUnique(
      (floor.safetyColliders ?? []).map((collider) => collider.id),
      `${floor.id} safety collider`
    );
    assertUnique(
      (floor.sceneObjects ?? []).map((object) => object.id),
      `${floor.id} scene object`
    );
    assertUnique(
      (floor.roomConnections ?? []).map((connection) => connection.id),
      `${floor.id} room connection`
    );

    const roomIds = new Set(floor.rooms.map((room) => room.id));
    const addSourceId = (sourceId: LevelSourceId) => {
      validateSourceId(sourceId);
      sourceIds.push(sourceId);
    };

    floor.rooms.forEach((room) => addSourceId(room.sourceId));

    for (const wall of floor.walls) {
      addSourceId(wall.sourceId);
      if (wall.floorId !== floor.id)
        throw new Error(
          `Wall "${wall.id}" references floor "${wall.floorId}".`
        );
      if ('segments' in wall) {
        if (wall.segments.length === 0)
          throw new Error(`Wall "${wall.id}" requires segments.`);
        wall.segments.forEach((segment) => {
          if (segmentLength(segment) <= MIN_POSITIVE)
            throw new Error(`Wall "${wall.id}" has a zero-length segment.`);
        });
      } else if (runLength(wall.run) <= MIN_POSITIVE) {
        throw new Error(`Wall "${wall.id}" has a zero-length run.`);
      }
      wall.rooms?.forEach(({ roomId }) => {
        if (!roomIds.has(roomId))
          throw new Error(
            `Wall "${wall.id}" references missing room "${roomId}".`
          );
      });
    }

    for (const surface of floor.floorSurfaces) {
      addSourceId(surface.sourceId);
      if (!isPositiveArea(surface.bounds))
        throw new Error(`Floor surface "${surface.id}" has zero area.`);
      if (surface.roomId && !roomIds.has(surface.roomId))
        throw new Error(
          `Floor surface "${surface.id}" references missing room "${surface.roomId}".`
        );
    }

    for (const collider of floor.safetyColliders ?? []) {
      addSourceId(collider.sourceId);
      if (!isPositiveArea(collider.bounds))
        throw new Error(`Safety collider "${collider.id}" has zero area.`);
      if (collider.purpose.trim().length === 0)
        throw new Error(`Safety collider "${collider.id}" requires purpose.`);
    }

    for (const object of floor.sceneObjects ?? []) {
      addSourceId(object.sourceId);
      if (object.roomId && !roomIds.has(object.roomId))
        throw new Error(
          `Scene object "${object.id}" references missing room "${object.roomId}".`
        );
      if (
        object.colliderPolicy?.kind === 'customBounds' &&
        (!object.colliderPolicy.bounds ||
          !isPositiveArea(object.colliderPolicy.bounds))
      ) {
        throw new Error(
          `Scene object "${object.id}" custom collider bounds require positive area.`
        );
      }
    }

    for (const connection of floor.roomConnections ?? []) {
      addSourceId(connection.sourceId);
      connection.rooms.forEach((roomId) => {
        if (!roomIds.has(roomId))
          throw new Error(
            `Room connection "${connection.id}" references missing room "${roomId}".`
          );
      });
    }
  }

  assertUnique(sourceIds, 'source');
}
