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
  /**
   * Intentional current topology gaps such as open passages, not tombstones.
   * Gap start/end are local distances measured from run.start toward run.end.
   */
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
  | { kind: 'solid'; reason?: string }
  | { kind: 'decorativeNoCollision'; reason: string }
  | { kind: 'interactionOnly'; reason?: string }
  | { kind: 'custom'; purpose?: string }
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
  purpose?: string;
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

const FORBIDDEN_SOURCE_ID_PARTS = ['former', 'removed', 'debugonlyremoval'];
const LENGTH_EPSILON = 1e-6;
const LEGACY_DOORWAY_MIN_WIDTH = 1.2;
const AXIS_EPSILON = 1e-6;

export function validateLevelDefinition(
  level: LevelDefinition
): LevelValidationResult {
  const errors: string[] = [];
  const sourceIds = new Map<string, string>();
  const floorIds = new Set<string>();

  if (level.floors.length === 0) {
    errors.push(`level "${level.id}" requires at least one floor.`);
  }

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
    const sourceIdParts = rawSourceId
      .split('.')
      .map((part) => part.toLowerCase());
    if (
      FORBIDDEN_SOURCE_ID_PARTS.some((part) => sourceIdParts.includes(part))
    ) {
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
    const roomsById = new Map<string, SemanticRoomDefinition>();
    const wallIds = new Set<string>();
    const surfaceIds = new Set<string>();
    const safetyIds = new Set<string>();
    const objectIds = new Set<string>();
    const connectionIds = new Set<string>();

    validateOutline(floor.outline, `floor "${floor.id}" outline`, errors);

    floor.rooms.forEach((room) => {
      addNamespaceId(`room on floor ${floor.id}`, room.id, roomIds);
      roomsById.set(room.id, room);
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
      if (!object.kind.trim())
        errors.push(`scene object "${object.id}" requires a kind.`);
      validateSceneObjectPosition(object, errors, roomsById);
      validateColliderPolicy(object, errors);
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
  const values = [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ];
  if (!values.every(Number.isFinite)) {
    errors.push(`${label} must use finite coordinates.`);
    return;
  }

  if (
    bounds.maxX - bounds.minX <= LENGTH_EPSILON ||
    bounds.maxZ - bounds.minZ <= LENGTH_EPSILON
  ) {
    errors.push(`${label} must have positive area.`);
  }
}

function validateOutline(
  outline: FloorDefinition['outline'],
  label: string,
  errors: string[]
): void {
  if (outline.length < 3) {
    errors.push(`${label} requires at least three points.`);
  }

  outline.forEach((point, index) => {
    if (!isFiniteOutlinePoint(point)) {
      errors.push(`${label} point ${index} must use finite coordinates.`);
    }
  });

  const validPoints = outline.filter(isFiniteOutlinePoint);
  const uniquePoints = new Set(validPoints.map(([x, z]) => `${x}:${z}`));
  if (uniquePoints.size !== validPoints.length) {
    errors.push(`${label} must not contain repeated points.`);
  }
}

function validateWallGeometry(wall: WallDefinition, errors: string[]): void {
  const hasSegments = 'segments' in wall && wall.segments !== undefined;
  const hasRun = 'run' in wall && wall.run !== undefined;

  if (hasSegments && hasRun) {
    errors.push(
      `wall "${wall.id}" must define either segments or a run, not both.`
    );
    return;
  }

  if (hasSegments) {
    if (!Array.isArray(wall.segments)) {
      errors.push(`wall "${wall.id}" segments must be an array.`);
      return;
    }

    if (wall.segments.length === 0)
      errors.push(`wall "${wall.id}" requires at least one segment.`);
    wall.segments.forEach((segment, index) => {
      if (!segmentUsesFiniteCoordinates(segment)) {
        errors.push(
          `wall "${wall.id}" segment ${index} must use finite coordinates.`
        );
        return;
      }
      if (getSegmentLength(segment) <= LENGTH_EPSILON)
        errors.push(
          `wall "${wall.id}" segment ${index} must have positive length.`
        );
    });
    return;
  }

  if (!hasRun) {
    errors.push(`wall "${wall.id}" requires either segments or a run.`);
    return;
  }

  if (!segmentUsesFiniteCoordinates(wall.run)) {
    errors.push(`wall "${wall.id}" run must use finite coordinates.`);
    return;
  }

  if (getSegmentLength(wall.run) <= LENGTH_EPSILON) {
    errors.push(`wall "${wall.id}" run must have positive length.`);
  }
  validateWallRunGaps(wall, errors);
}

function validateWallRunGaps(wall: WallDefinition, errors: string[]): void {
  if (!('run' in wall) || !wall.run.gaps) return;

  if (!Array.isArray(wall.run.gaps)) {
    errors.push(`wall "${wall.id}" gaps must be an array.`);
    return;
  }

  const runLength = getSegmentLength(wall.run);
  if (!isAxisAlignedRun(wall.run)) {
    errors.push(`wall "${wall.id}" gaps require an axis-aligned run.`);
    return;
  }

  const validGaps: WallRunGapDefinition[] = [];
  wall.run.gaps.forEach((gap, index) => {
    if (!isFiniteWallRunGap(gap)) {
      errors.push(
        `wall "${wall.id}" gap ${index} must use finite coordinates.`
      );
      return;
    }

    validGaps.push(gap);
  });

  const sortedGaps = [...validGaps].sort((a, b) => a.start - b.start);
  sortedGaps.forEach((gap, index) => {
    if (gap.end - gap.start <= LENGTH_EPSILON) {
      errors.push(`wall "${wall.id}" gap ${index} must have positive length.`);
      return;
    }

    if (gap.end - gap.start + LENGTH_EPSILON < LEGACY_DOORWAY_MIN_WIDTH) {
      errors.push(
        `wall "${wall.id}" gap ${index} must be at least ${LEGACY_DOORWAY_MIN_WIDTH} units wide.`
      );
    }

    if (gap.start < -LENGTH_EPSILON || gap.end > runLength + LENGTH_EPSILON) {
      errors.push(`wall "${wall.id}" gap ${index} must stay within the run.`);
    }

    const previousGap = sortedGaps[index - 1];
    if (previousGap && gap.start < previousGap.end - LENGTH_EPSILON) {
      errors.push(
        `wall "${wall.id}" gap ${index} must not overlap another gap.`
      );
    }
  });
}

function isFiniteWallRunGap(gap: unknown): gap is WallRunGapDefinition {
  return (
    isRecord(gap) && Number.isFinite(gap.start) && Number.isFinite(gap.end)
  );
}

function isAxisAlignedRun(run: WallRunDefinition): boolean {
  return (
    Math.abs(run.start.z - run.end.z) <= AXIS_EPSILON ||
    Math.abs(run.start.x - run.end.x) <= AXIS_EPSILON
  );
}

function isFiniteOutlinePoint(point: unknown): point is [number, number] {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1])
  );
}

function segmentUsesFiniteCoordinates(
  segment: WallSegmentDefinition | unknown
): segment is WallSegmentDefinition {
  if (
    !isRecord(segment) ||
    !isFinitePoint(segment.start) ||
    !isFinitePoint(segment.end)
  ) {
    return false;
  }

  return true;
}

function isFinitePoint(point: unknown): point is Point2D {
  return (
    isRecord(point) && Number.isFinite(point.x) && Number.isFinite(point.z)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getSegmentLength(segment: WallSegmentDefinition): number {
  return Math.hypot(
    segment.end.x - segment.start.x,
    segment.end.z - segment.start.z
  );
}

function validateSceneObjectPosition(
  object: SceneObjectDefinition,
  errors: string[],
  roomsById: ReadonlyMap<string, SemanticRoomDefinition>
): void {
  const values = [object.position.x, object.position.z];
  if (object.position.y !== undefined) values.push(object.position.y);
  if (object.orientation !== undefined) values.push(object.orientation);
  if (!values.every(Number.isFinite)) {
    errors.push(
      `scene object "${object.id}" position/orientation must use finite values.`
    );
    return;
  }

  const room = object.roomId ? roomsById.get(object.roomId) : undefined;
  if (room && !pointIsWithinBounds(object.position, room.bounds)) {
    errors.push(
      `scene object "${object.id}" position must stay within room "${room.id}" bounds.`
    );
  }
}

function validateColliderPolicy(
  object: SceneObjectDefinition,
  errors: string[]
): void {
  const policy = object.colliderPolicy;
  if (!policy) return;
  if (policy.kind === 'bounds') {
    validateBounds(
      policy.bounds,
      `scene object "${object.id}" collider bounds`,
      errors
    );
  }
  if (policy.kind === 'decorativeNoCollision' && !policy.reason.trim()) {
    errors.push(
      `scene object "${object.id}" decorativeNoCollision policy requires a reason.`
    );
  }
  if (policy.kind === 'custom' && !policy.purpose?.trim()) {
    errors.push(
      `scene object "${object.id}" custom collider policy requires a purpose.`
    );
  }
}

function pointIsWithinBounds(point: Point2D, bounds: Bounds2D): boolean {
  return (
    point.x >= bounds.minX - LENGTH_EPSILON &&
    point.x <= bounds.maxX + LENGTH_EPSILON &&
    point.z >= bounds.minZ - LENGTH_EPSILON &&
    point.z <= bounds.maxZ + LENGTH_EPSILON
  );
}
