import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export interface Point2D {
  x: number;
  z: number;
}

export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

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

export type RoomCategory = 'interior' | 'exterior';

export interface SemanticRoomDefinition {
  id: string;
  sourceId: LevelSourceId;
  name: string;
  bounds: Bounds2D;
  ledColor: number;
  category?: RoomCategory;
}

export type WallKind = 'wall' | 'fence' | 'railing';

export type WallPurpose =
  | 'room-boundary'
  | 'exterior-boundary'
  | 'safety'
  | 'decorative'
  | string;

export interface WallSegmentDefinition {
  start: Point2D;
  end: Point2D;
}

export interface WallRunGapDefinition {
  start: number;
  end: number;
  label?: string;
}

export interface WallRunDefinition {
  start: Point2D;
  end: Point2D;
  /** Intentional current topology gaps such as open passages, not tombstones. */
  gaps?: WallRunGapDefinition[];
}

export type WallGeometryDefinition =
  | { segments: WallSegmentDefinition[]; run?: never }
  | { run: WallRunDefinition; segments?: never };

export type WallDefinition = WallGeometryDefinition & {
  id: string;
  sourceId: LevelSourceId;
  floorId: string;
  wallKind: WallKind;
  height?: number;
  thickness?: number;
  rooms?: string[];
  purpose?: WallPurpose;
};

export interface FloorSurfaceDefinition {
  id: string;
  sourceId: LevelSourceId;
  floorId: string;
  bounds: Bounds2D;
  roomId?: string;
  elevation?: number;
  purpose?: string;
}

export interface SafetyColliderDefinition {
  id: string;
  sourceId: LevelSourceId;
  floorId: string;
  bounds: Bounds2D;
  purpose: string;
}

export type ColliderPolicyDefinition =
  | { kind: 'none'; reason?: string }
  | { kind: 'footprint' }
  | { kind: 'bounds'; bounds: Bounds2D; purpose?: string };

export interface SceneObjectDefinition {
  id: string;
  sourceId: LevelSourceId;
  floorId: string;
  kind: string;
  position: Point2D & { y?: number };
  orientation?: number;
  colliderPolicy?: ColliderPolicyDefinition;
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

export interface LevelValidationResult {
  errors: string[];
}

const FORBIDDEN_SOURCE_ID_PARTS = [
  '.former.',
  '.removed.',
  '.debugOnlyRemoval.',
];
const LENGTH_EPSILON = 1e-6;

export function validateLevelDefinition(
  level: LevelDefinition
): LevelValidationResult {
  const errors: string[] = [];
  const sourceIds = new Map<string, string>();
  const floorIds = new Set<string>();

  const addNamespaceId = (namespace: string, id: string, ids: Set<string>) => {
    if (ids.has(id)) {
      errors.push(`Duplicate ${namespace} id "${id}".`);
    }
    ids.add(id);
  };

  const addSourceId = (sourceId: LevelSourceId, owner: string) => {
    try {
      assertLevelSourceId(sourceId);
    } catch (error) {
      errors.push(`${owner} has invalid sourceId: ${(error as Error).message}`);
    }

    const rawSourceId = sourceId as string;
    if (FORBIDDEN_SOURCE_ID_PARTS.some((part) => rawSourceId.includes(part))) {
      errors.push(
        `${owner} sourceId "${rawSourceId}" uses forbidden tombstone wording.`
      );
    }

    const existing = sourceIds.get(rawSourceId);
    if (existing) {
      errors.push(
        `Duplicate sourceId "${rawSourceId}" used by ${existing} and ${owner}.`
      );
    }
    sourceIds.set(rawSourceId, owner);
  };

  for (const floor of level.floors) {
    if (floorIds.has(floor.id)) {
      errors.push(`Duplicate floor id "${floor.id}".`);
    }
    floorIds.add(floor.id);

    const roomIds = new Set<string>();
    const wallIds = new Set<string>();
    const surfaceIds = new Set<string>();
    const safetyIds = new Set<string>();
    const objectIds = new Set<string>();
    const connectionIds = new Set<string>();

    floor.rooms.forEach((room) => {
      addNamespaceId(`room on floor ${floor.id}`, room.id, roomIds);
      addSourceId(room.sourceId, `room "${room.id}"`);
      validateBounds(room.bounds, `room "${room.id}" bounds`, errors);
    });

    floor.walls.forEach((wall) => {
      addNamespaceId(`wall on floor ${floor.id}`, wall.id, wallIds);
      addSourceId(wall.sourceId, `wall "${wall.id}"`);
      if (wall.floorId !== floor.id) {
        errors.push(
          `wall "${wall.id}" floorId "${wall.floorId}" does not match floor "${floor.id}".`
        );
      }
      wall.rooms?.forEach((roomId) => {
        if (!roomIds.has(roomId))
          errors.push(`wall "${wall.id}" references missing room "${roomId}".`);
      });
      validateWallGeometry(wall, errors);
    });

    floor.floorSurfaces.forEach((surface) => {
      addNamespaceId(
        `floor surface on floor ${floor.id}`,
        surface.id,
        surfaceIds
      );
      addSourceId(surface.sourceId, `floor surface "${surface.id}"`);
      if (surface.floorId !== floor.id)
        errors.push(
          `floor surface "${surface.id}" floorId "${surface.floorId}" does not match floor "${floor.id}".`
        );
      if (surface.roomId && !roomIds.has(surface.roomId))
        errors.push(
          `floor surface "${surface.id}" references missing room "${surface.roomId}".`
        );
      validateBounds(
        surface.bounds,
        `floor surface "${surface.id}" bounds`,
        errors
      );
    });

    floor.safetyColliders?.forEach((collider) => {
      addNamespaceId(
        `safety collider on floor ${floor.id}`,
        collider.id,
        safetyIds
      );
      addSourceId(collider.sourceId, `safety collider "${collider.id}"`);
      if (!collider.purpose.trim())
        errors.push(`safety collider "${collider.id}" requires a purpose.`);
      if (collider.floorId !== floor.id)
        errors.push(
          `safety collider "${collider.id}" floorId "${collider.floorId}" does not match floor "${floor.id}".`
        );
      validateBounds(
        collider.bounds,
        `safety collider "${collider.id}" bounds`,
        errors
      );
    });

    floor.sceneObjects?.forEach((object) => {
      addNamespaceId(`scene object on floor ${floor.id}`, object.id, objectIds);
      addSourceId(object.sourceId, `scene object "${object.id}"`);
      if (object.floorId !== floor.id)
        errors.push(
          `scene object "${object.id}" floorId "${object.floorId}" does not match floor "${floor.id}".`
        );
      if (object.roomId && !roomIds.has(object.roomId))
        errors.push(
          `scene object "${object.id}" references missing room "${object.roomId}".`
        );
      if (object.colliderPolicy?.kind === 'bounds') {
        validateBounds(
          object.colliderPolicy.bounds,
          `scene object "${object.id}" collider bounds`,
          errors
        );
      }
    });

    floor.roomConnections?.forEach((connection) => {
      addNamespaceId(
        `room connection on floor ${floor.id}`,
        connection.id,
        connectionIds
      );
      addSourceId(connection.sourceId, `room connection "${connection.id}"`);
      if (connection.floorId !== floor.id)
        errors.push(
          `room connection "${connection.id}" floorId "${connection.floorId}" does not match floor "${floor.id}".`
        );
      connection.rooms.forEach((roomId) => {
        if (!roomIds.has(roomId))
          errors.push(
            `room connection "${connection.id}" references missing room "${roomId}".`
          );
      });
    });
  }

  return { errors };
}

export function assertValidLevelDefinition(level: LevelDefinition): void {
  const result = validateLevelDefinition(level);
  if (result.errors.length > 0) {
    throw new Error(
      `Invalid level definition:\n- ${result.errors.join('\n- ')}`
    );
  }
}

function validateBounds(
  bounds: Bounds2D,
  label: string,
  errors: string[]
): void {
  if (
    bounds.maxX - bounds.minX <= LENGTH_EPSILON ||
    bounds.maxZ - bounds.minZ <= LENGTH_EPSILON
  ) {
    errors.push(`${label} must have positive area.`);
  }
}

function validateWallGeometry(wall: WallDefinition, errors: string[]): void {
  if ('segments' in wall) {
    if (wall.segments.length === 0)
      errors.push(`wall "${wall.id}" requires at least one segment.`);
    wall.segments.forEach((segment, index) => {
      if (getSegmentLength(segment) <= LENGTH_EPSILON)
        errors.push(
          `wall "${wall.id}" segment ${index} must have positive length.`
        );
    });
    return;
  }

  if (getSegmentLength(wall.run) <= LENGTH_EPSILON) {
    errors.push(`wall "${wall.id}" run must have positive length.`);
  }
  wall.run.gaps?.forEach((gap, index) => {
    if (gap.end - gap.start <= LENGTH_EPSILON)
      errors.push(`wall "${wall.id}" gap ${index} must have positive length.`);
  });
}

function getSegmentLength(segment: WallSegmentDefinition): number {
  return Math.hypot(
    segment.end.x - segment.start.x,
    segment.end.z - segment.start.z
  );
}
