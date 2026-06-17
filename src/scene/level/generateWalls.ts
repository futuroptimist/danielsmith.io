import type { FloorPlanDefinition } from '../../assets/floorPlan';
import {
  createWallSegmentInstances,
  type WallSegmentOptions,
} from '../../assets/floorPlan/wallSegments';

import { compileLegacyFloorPlan } from './compileLegacyFloorPlan';
import type {
  FloorDefinition,
  LevelDefinition,
  Point2D,
  WallDefinition,
} from './schema';

export type GenerateWallInstancesOptions = Omit<
  WallSegmentOptions,
  'floorId' | 'levelId'
> & {
  /** Multiplier applied when declarative source units differ from world units. */
  scale?: number;
};

const LENGTH_EPSILON = 1e-4;

export function generateWallInstances(
  floor: FloorDefinition,
  options: GenerateWallInstancesOptions
) {
  const plan = compileFloor(floor, options.scale ?? 1);
  return createWallSegmentInstances(plan, {
    ...options,
    floorId: floor.id,
  }).flatMap((instance) => {
    const sourceWall = findSourceWall(
      floor,
      instance.segment,
      options.scale ?? 1
    );
    return sourceWall ? [{ ...instance, sourceId: sourceWall.sourceId }] : [];
  });
}

function compileFloor(
  floor: FloorDefinition,
  scale: number
): FloorPlanDefinition {
  const level: LevelDefinition = {
    id: 'generated-wall-level',
    floors: [floor],
  };
  return scaleFloorPlan(
    compileLegacyFloorPlan(level, floor.id, {
      includeDoorwaysFromWallGaps: true,
    }),
    scale
  );
}

function findSourceWall(
  floor: FloorDefinition,
  segment: ReturnType<typeof createWallSegmentInstances>[number]['segment'],
  scale: number
): WallDefinition | undefined {
  const midpoint = {
    x: (segment.start.x + segment.end.x) / 2,
    z: (segment.start.z + segment.end.z) / 2,
  };
  return floor.walls.find((wall) => wallContainsPoint(wall, midpoint, scale));
}

function wallContainsPoint(
  wall: WallDefinition,
  point: Point2D,
  scale: number
): boolean {
  const segments =
    'segments' in wall && wall.segments
      ? wall.segments
      : 'run' in wall && wall.run
        ? [wall.run]
        : [];
  return segments.some((segment) =>
    pointOnSegment(
      scalePoint(segment.start, scale),
      scalePoint(segment.end, scale),
      point
    )
  );
}

function pointOnSegment(start: Point2D, end: Point2D, point: Point2D): boolean {
  const cross =
    (point.z - start.z) * (end.x - start.x) -
    (point.x - start.x) * (end.z - start.z);
  if (Math.abs(cross) > LENGTH_EPSILON) return false;
  return (
    point.x >= Math.min(start.x, end.x) - LENGTH_EPSILON &&
    point.x <= Math.max(start.x, end.x) + LENGTH_EPSILON &&
    point.z >= Math.min(start.z, end.z) - LENGTH_EPSILON &&
    point.z <= Math.max(start.z, end.z) + LENGTH_EPSILON
  );
}

function scalePoint(point: Point2D, scale: number): Point2D {
  return { x: point.x * scale, z: point.z * scale };
}

function scaleFloorPlan(
  plan: FloorPlanDefinition,
  scale: number
): FloorPlanDefinition {
  if (Math.abs(scale - 1) <= LENGTH_EPSILON) return plan;
  const scaleValue = (value: number) => value * scale;
  return {
    outline: plan.outline.map(([x, z]) => [scaleValue(x), scaleValue(z)]),
    rooms: plan.rooms.map((room) => ({
      ...room,
      bounds: {
        minX: scaleValue(room.bounds.minX),
        maxX: scaleValue(room.bounds.maxX),
        minZ: scaleValue(room.bounds.minZ),
        maxZ: scaleValue(room.bounds.maxZ),
      },
      doorways: room.doorways?.map((doorway) => ({
        ...doorway,
        start: scaleValue(doorway.start),
        end: scaleValue(doorway.end),
      })),
    })),
  };
}
