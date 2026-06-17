import type { Bounds2D, RoomCategory, RoomWall } from '../../assets/floorPlan';

import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export interface Point2D {
  x: number;
  z: number;
}

export type LevelObjectId = string;

export interface LevelDefinition {
  id: LevelObjectId;
  floors: FloorDefinition[];
}

export interface FloorDefinition {
  id: LevelObjectId;
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
  id: LevelObjectId;
  sourceId: LevelSourceId;
  name: string;
  bounds: Bounds2D;
  ledColor: number;
  category?: RoomCategory;
}

export type WallKind = 'wall' | 'fence' | 'railing';

export interface WallSegmentGeometry {
  kind: 'segment';
  start: Point2D;
  end: Point2D;
}

export interface WallRunGap {
  start: number;
  end: number;
  /** Optional current-topology intent label, such as doorway or open passage. */
  purpose?: string;
}

export interface WallRunGeometry {
  kind: 'run';
  start: Point2D;
  end: Point2D;
  /** Intentional current-state openings in the run, measured along the run axis. */
  gaps?: WallRunGap[];
}

export type WallGeometry = WallSegmentGeometry | WallRunGeometry;

export interface WallRoomReference {
  id: string;
  wall?: RoomWall;
}

export interface WallDefinition {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: string;
  geometry: WallGeometry;
  wallKind: WallKind;
  height?: number;
  thickness?: number;
  rooms?: WallRoomReference[];
  purpose?: string;
}

export interface FloorSurfaceDefinition {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: string;
  bounds: Bounds2D;
  roomId?: string;
  elevation?: number;
  purpose?: string;
}

export interface SafetyColliderDefinition {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: string;
  bounds: Bounds2D;
  purpose: string;
}

export interface ColliderPolicyDefinition {
  kind: 'none' | 'footprint' | 'customBounds';
  bounds?: Bounds2D;
  purpose?: string;
}

export interface SceneObjectDefinition {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: string;
  kind: string;
  position: Point2D & { y?: number };
  orientation?: number;
  colliderPolicy?: ColliderPolicyDefinition;
  roomId?: string;
}

export interface RoomConnectionDefinition {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: string;
  rooms: [string, string];
  label?: string;
  purpose?: string;
}

const FORBIDDEN_SOURCE_ID_PARTS = [
  '.former.',
  '.removed.',
  '.debugOnlyRemoval.',
];
const EPSILON = 1e-6;

export function validateLevelDefinition(level: LevelDefinition): void {
  const sourceIds = new Set<string>();
  const floorIds = new Set<string>();
  assertUniqueId(level.id, new Set(), 'level');

  level.floors.forEach((floor) => {
    assertUniqueId(floor.id, floorIds, 'floor');
    validateFloorDefinition(floor, sourceIds);
  });
}

export function validateFloorDefinition(
  floor: FloorDefinition,
  sourceIds = new Set<string>()
): void {
  const namespaceIds = {
    room: new Set<string>(),
    wall: new Set<string>(),
    floorSurface: new Set<string>(),
    safetyCollider: new Set<string>(),
    sceneObject: new Set<string>(),
    roomConnection: new Set<string>(),
  };
  const roomIds = new Set(floor.rooms.map((room) => room.id));

  floor.rooms.forEach((room) => {
    assertUniqueId(room.id, namespaceIds.room, 'room');
    assertSourceId(room.sourceId, sourceIds);
    assertPositiveBounds(room.bounds, `room "${room.id}"`);
  });

  floor.walls.forEach((wall) => {
    assertUniqueId(wall.id, namespaceIds.wall, 'wall');
    assertSourceId(wall.sourceId, sourceIds);
    assertFloorReference(wall.floorId, floor.id, `wall "${wall.id}"`);
    assertPositiveWallGeometry(wall);
    wall.rooms?.forEach((room) =>
      assertRoomReference(room.id, roomIds, `wall "${wall.id}"`)
    );
  });

  floor.floorSurfaces.forEach((surface) => {
    assertUniqueId(surface.id, namespaceIds.floorSurface, 'floor surface');
    assertSourceId(surface.sourceId, sourceIds);
    assertFloorReference(
      surface.floorId,
      floor.id,
      `floor surface "${surface.id}"`
    );
    assertPositiveBounds(surface.bounds, `floor surface "${surface.id}"`);
    if (surface.roomId)
      assertRoomReference(
        surface.roomId,
        roomIds,
        `floor surface "${surface.id}"`
      );
  });

  floor.safetyColliders?.forEach((collider) => {
    assertUniqueId(collider.id, namespaceIds.safetyCollider, 'safety collider');
    assertSourceId(collider.sourceId, sourceIds);
    assertFloorReference(
      collider.floorId,
      floor.id,
      `safety collider "${collider.id}"`
    );
    assertPositiveBounds(collider.bounds, `safety collider "${collider.id}"`);
    if (collider.purpose.trim().length === 0)
      throw new Error(`safety collider "${collider.id}" requires a purpose.`);
  });

  floor.sceneObjects?.forEach((object) => {
    assertUniqueId(object.id, namespaceIds.sceneObject, 'scene object');
    assertSourceId(object.sourceId, sourceIds);
    assertFloorReference(
      object.floorId,
      floor.id,
      `scene object "${object.id}"`
    );
    if (object.roomId)
      assertRoomReference(
        object.roomId,
        roomIds,
        `scene object "${object.id}"`
      );
    if (object.colliderPolicy?.kind === 'customBounds') {
      if (!object.colliderPolicy.bounds)
        throw new Error(
          `scene object "${object.id}" custom collider policy requires bounds.`
        );
      assertPositiveBounds(
        object.colliderPolicy.bounds,
        `scene object "${object.id}" custom collider`
      );
    }
  });

  floor.roomConnections?.forEach((connection) => {
    assertUniqueId(
      connection.id,
      namespaceIds.roomConnection,
      'room connection'
    );
    assertSourceId(connection.sourceId, sourceIds);
    assertFloorReference(
      connection.floorId,
      floor.id,
      `room connection "${connection.id}"`
    );
    connection.rooms.forEach((roomId) =>
      assertRoomReference(roomId, roomIds, `room connection "${connection.id}"`)
    );
  });
}

function assertUniqueId(id: string, ids: Set<string>, label: string): void {
  if (id.trim().length === 0)
    throw new Error(`${label} IDs must not be empty.`);
  if (ids.has(id)) throw new Error(`Duplicate ${label} ID "${id}".`);
  ids.add(id);
}

function assertSourceId(sourceId: LevelSourceId, sourceIds: Set<string>): void {
  assertLevelSourceId(sourceId);
  FORBIDDEN_SOURCE_ID_PARTS.forEach((part) => {
    if (sourceId.includes(part))
      throw new Error(
        `Source ID "${sourceId}" contains forbidden tombstone marker "${part}".`
      );
  });
  if (sourceIds.has(sourceId))
    throw new Error(`Duplicate source ID "${sourceId}".`);
  sourceIds.add(sourceId);
}

function assertFloorReference(
  actual: string,
  expected: string,
  label: string
): void {
  if (actual !== expected)
    throw new Error(
      `${label} references floor "${actual}" but belongs to floor "${expected}".`
    );
}

function assertRoomReference(
  roomId: string,
  roomIds: Set<string>,
  label: string
): void {
  if (!roomIds.has(roomId))
    throw new Error(`${label} references missing room "${roomId}".`);
}

function assertPositiveBounds(bounds: Bounds2D, label: string): void {
  if (
    bounds.maxX - bounds.minX <= EPSILON ||
    bounds.maxZ - bounds.minZ <= EPSILON
  ) {
    throw new Error(`${label} must have positive area.`);
  }
}

function assertPositiveWallGeometry(wall: WallDefinition): void {
  const { start, end } = wall.geometry;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  if (Math.hypot(dx, dz) <= EPSILON)
    throw new Error(`wall "${wall.id}" must have positive length.`);
  if (wall.geometry.kind === 'run') {
    const horizontal = Math.abs(dx) > EPSILON && Math.abs(dz) <= EPSILON;
    const vertical = Math.abs(dz) > EPSILON && Math.abs(dx) <= EPSILON;
    if (!horizontal && !vertical)
      throw new Error(`wall "${wall.id}" runs must be axis-aligned.`);
    const min = horizontal
      ? Math.min(start.x, end.x)
      : Math.min(start.z, end.z);
    const max = horizontal
      ? Math.max(start.x, end.x)
      : Math.max(start.z, end.z);
    wall.geometry.gaps?.forEach((gap) => {
      if (gap.end - gap.start <= EPSILON)
        throw new Error(`wall "${wall.id}" gap must have positive length.`);
      if (gap.start < min - EPSILON || gap.end > max + EPSILON)
        throw new Error(`wall "${wall.id}" gap must stay within the wall run.`);
    });
  }
}
