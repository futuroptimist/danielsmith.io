import type { Bounds2D, RoomCategory } from '../../assets/floorPlan';

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

export interface WallGapDefinition {
  start: number;
  end: number;
  purpose?: string;
}

export interface ExplicitWallSegmentDefinition {
  start: Point2D;
  end: Point2D;
}

export interface WallRunDefinition {
  start: Point2D;
  end: Point2D;
  gaps?: WallGapDefinition[];
}

interface WallDefinitionBase {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: LevelObjectId;
  wallKind: WallKind;
  height?: number;
  thickness?: number;
  rooms?: string[];
  purpose?: string;
}

export type WallDefinition = WallDefinitionBase &
  (
    | { segments: ExplicitWallSegmentDefinition[]; run?: never }
    | { run: WallRunDefinition; segments?: never }
  );

export interface FloorSurfaceDefinition {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: LevelObjectId;
  bounds: Bounds2D;
  roomId?: string;
  elevation?: number;
  purpose?: string;
}

export interface SafetyColliderDefinition {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: LevelObjectId;
  bounds: Bounds2D;
  purpose: string;
}

export interface SceneObjectColliderPolicy {
  kind: 'none' | 'footprint' | 'customBounds';
  bounds?: Bounds2D;
  purpose?: string;
}

export interface SceneObjectDefinition {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: LevelObjectId;
  kind: string;
  position: Point2D & { y?: number };
  orientation?: number;
  colliderPolicy?: SceneObjectColliderPolicy;
  roomId?: string;
}

export interface RoomConnectionDefinition {
  id: LevelObjectId;
  sourceId: LevelSourceId;
  floorId: LevelObjectId;
  rooms: [string, string];
  label?: string;
  purpose?: string;
}

export interface LevelValidationResult {
  errors: string[];
}

const TOMBSTONE_SOURCE_ID_PATTERNS = [
  '.former.',
  '.removed.',
  '.debugOnlyRemoval.',
];
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const EPSILON = 1e-6;

const getBoundsArea = (bounds: Bounds2D): number =>
  (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);

const getSegmentLength = (segment: ExplicitWallSegmentDefinition): number =>
  Math.hypot(segment.end.x - segment.start.x, segment.end.z - segment.start.z);

const addId = (
  errors: string[],
  ids: Set<string>,
  namespace: string,
  id: string
): void => {
  if (!ID_PATTERN.test(id)) {
    errors.push(
      `${namespace} id "${id}" must contain only letters, digits, _, or -.`
    );
  }

  if (ids.has(id)) {
    errors.push(`Duplicate ${namespace} id "${id}".`);
  }
  ids.add(id);
};

const addSourceId = (
  errors: string[],
  sourceIds: Set<string>,
  sourceId: string
): void => {
  try {
    assertLevelSourceId(sourceId);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  for (const pattern of TOMBSTONE_SOURCE_ID_PATTERNS) {
    if (sourceId.includes(pattern)) {
      errors.push(
        `Level source ID "${sourceId}" must not contain tombstone marker "${pattern}".`
      );
    }
  }

  if (sourceIds.has(sourceId)) {
    errors.push(`Duplicate level source ID "${sourceId}".`);
  }
  sourceIds.add(sourceId);
};

export const validateLevelDefinition = (
  level: LevelDefinition
): LevelValidationResult => {
  const errors: string[] = [];
  const sourceIds = new Set<string>();
  const levelIds = new Set<string>();
  const floorIds = new Set<string>();

  addId(errors, levelIds, 'level', level.id);

  for (const floor of level.floors) {
    addId(errors, floorIds, 'floor', floor.id);
    const roomIds = new Set<string>();
    const wallIds = new Set<string>();
    const surfaceIds = new Set<string>();
    const safetyIds = new Set<string>();
    const objectIds = new Set<string>();
    const connectionIds = new Set<string>();

    for (const room of floor.rooms) {
      addId(errors, roomIds, `floor "${floor.id}" room`, room.id);
      addSourceId(errors, sourceIds, room.sourceId);
      if (getBoundsArea(room.bounds) <= EPSILON) {
        errors.push(`Room "${room.id}" must have positive bounds area.`);
      }
    }

    for (const wall of floor.walls) {
      addId(errors, wallIds, `floor "${floor.id}" wall`, wall.id);
      addSourceId(errors, sourceIds, wall.sourceId);
      if (wall.floorId !== floor.id)
        errors.push(
          `Wall "${wall.id}" references missing floor "${wall.floorId}".`
        );
      wall.rooms?.forEach((roomId) => {
        if (!roomIds.has(roomId))
          errors.push(`Wall "${wall.id}" references missing room "${roomId}".`);
      });
      if ('segments' in wall) {
        if (wall.segments.length === 0)
          errors.push(`Wall "${wall.id}" must include at least one segment.`);
        wall.segments.forEach((segment, index) => {
          if (getSegmentLength(segment) <= EPSILON)
            errors.push(
              `Wall "${wall.id}" segment ${index} must have positive length.`
            );
        });
      } else {
        const length = getSegmentLength(wall.run);
        if (length <= EPSILON)
          errors.push(`Wall "${wall.id}" run must have positive length.`);
        wall.run.gaps?.forEach((gap, index) => {
          if (gap.end - gap.start <= EPSILON)
            errors.push(
              `Wall "${wall.id}" gap ${index} must have positive length.`
            );
        });
      }
    }

    for (const surface of floor.floorSurfaces) {
      addId(
        errors,
        surfaceIds,
        `floor "${floor.id}" floor surface`,
        surface.id
      );
      addSourceId(errors, sourceIds, surface.sourceId);
      if (surface.floorId !== floor.id)
        errors.push(
          `Floor surface "${surface.id}" references missing floor "${surface.floorId}".`
        );
      if (surface.roomId && !roomIds.has(surface.roomId))
        errors.push(
          `Floor surface "${surface.id}" references missing room "${surface.roomId}".`
        );
      if (getBoundsArea(surface.bounds) <= EPSILON)
        errors.push(
          `Floor surface "${surface.id}" must have positive bounds area.`
        );
    }

    for (const collider of floor.safetyColliders ?? []) {
      addId(
        errors,
        safetyIds,
        `floor "${floor.id}" safety collider`,
        collider.id
      );
      addSourceId(errors, sourceIds, collider.sourceId);
      if (collider.floorId !== floor.id)
        errors.push(
          `Safety collider "${collider.id}" references missing floor "${collider.floorId}".`
        );
      if (getBoundsArea(collider.bounds) <= EPSILON)
        errors.push(
          `Safety collider "${collider.id}" must have positive bounds area.`
        );
      if (collider.purpose.trim().length === 0)
        errors.push(`Safety collider "${collider.id}" must declare a purpose.`);
    }

    for (const object of floor.sceneObjects ?? []) {
      addId(errors, objectIds, `floor "${floor.id}" scene object`, object.id);
      addSourceId(errors, sourceIds, object.sourceId);
      if (object.floorId !== floor.id)
        errors.push(
          `Scene object "${object.id}" references missing floor "${object.floorId}".`
        );
      if (object.roomId && !roomIds.has(object.roomId))
        errors.push(
          `Scene object "${object.id}" references missing room "${object.roomId}".`
        );
      if (
        object.colliderPolicy?.kind === 'customBounds' &&
        !object.colliderPolicy.bounds
      ) {
        errors.push(
          `Scene object "${object.id}" custom collider policy requires bounds.`
        );
      }
    }

    for (const connection of floor.roomConnections ?? []) {
      addId(
        errors,
        connectionIds,
        `floor "${floor.id}" room connection`,
        connection.id
      );
      addSourceId(errors, sourceIds, connection.sourceId);
      if (connection.floorId !== floor.id)
        errors.push(
          `Room connection "${connection.id}" references missing floor "${connection.floorId}".`
        );
      connection.rooms.forEach((roomId) => {
        if (!roomIds.has(roomId))
          errors.push(
            `Room connection "${connection.id}" references missing room "${roomId}".`
          );
      });
    }
  }

  return { errors };
};

export const assertValidLevelDefinition = (level: LevelDefinition): void => {
  const result = validateLevelDefinition(level);
  if (result.errors.length > 0) {
    throw new Error(
      `Invalid level definition:\n- ${result.errors.join('\n- ')}`
    );
  }
};
