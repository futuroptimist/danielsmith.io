import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  WALL_THICKNESS,
} from '../../../assets/floorPlan';
import { createWallSegmentInstances } from '../../../assets/floorPlan/wallSegments';
import { generateWallSegmentInstances } from '../generateWalls';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import type { FloorDefinition, LevelDefinition } from '../schema';

const wallOptions = (baseElevation = 0) => ({
  coordinateScale: FLOOR_PLAN_SCALE,
  baseElevation,
  wallHeight: 6,
  wallThickness: WALL_THICKNESS,
  fenceHeight: 2.4,
  fenceThickness: 0.28,
  getRoomCategory: (roomId: string) =>
    roomId === 'backyard' ? ('exterior' as const) : ('interior' as const),
});

const wallSignature = (
  instance: ReturnType<typeof generateWallSegmentInstances>[number]
) => ({
  collider: roundBounds(instance.collider),
  dimensions: {
    width: round(instance.dimensions.width),
    height: round(instance.dimensions.height),
    depth: round(instance.dimensions.depth),
  },
  isFence: instance.isFence,
});

function round(value: number): number {
  return Number(value.toFixed(6));
}

function roundBounds(bounds: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}) {
  return {
    minX: round(bounds.minX),
    maxX: round(bounds.maxX),
    minZ: round(bounds.minZ),
    maxZ: round(bounds.maxZ),
  };
}

function compareSignatures(
  a: ReturnType<typeof wallSignature>,
  b: ReturnType<typeof wallSignature>
): number {
  return JSON.stringify(a).localeCompare(JSON.stringify(b));
}

function getFloor(level: LevelDefinition, floorId: string): FloorDefinition {
  const floor = level.floors.find((candidate) => candidate.id === floorId);
  if (!floor) throw new Error(`Missing test floor ${floorId}.`);
  return floor;
}

describe('generateWallSegmentInstances', () => {
  it('matches legacy ground wall and fence bounds while using declarative source IDs', () => {
    const generated = generateWallSegmentInstances(
      getFloor(PORTFOLIO_LEVEL, 'ground'),
      wallOptions()
    );
    const legacy = createWallSegmentInstances(FLOOR_PLAN, {
      floorId: 'ground',
      ...wallOptions(),
    });

    expect(generated.map(wallSignature).sort(compareSignatures)).toEqual(
      legacy.map(wallSignature).sort(compareSignatures)
    );
    expect(generated.every((instance) => instance.sourceId)).toBe(true);
    expect(generated.map((instance) => instance.sourceId)).toContain(
      'ground.living_room.south_wall'
    );
  });

  it('matches legacy upper wall bounds without legacy room-doorway generation', () => {
    const generated = generateWallSegmentInstances(
      getFloor(PORTFOLIO_LEVEL, 'upper'),
      wallOptions(9)
    );
    const legacy = createWallSegmentInstances(UPPER_FLOOR_PLAN, {
      floorId: 'upper',
      ...wallOptions(9),
    });

    expect(generated.map(wallSignature).sort(compareSignatures)).toEqual(
      legacy.map(wallSignature).sort(compareSignatures)
    );
  });

  it('responds to declarative wall edits without consuming semantic connections', () => {
    const ground = getFloor(PORTFOLIO_LEVEL, 'ground');
    const withoutSouthWall: FloorDefinition = {
      ...ground,
      roomConnections: [
        ...(ground.roomConnections ?? []),
        {
          id: 'test-only-connection',
          sourceId: 'ground.test_only.connection' as never,
          floorId: 'ground',
          rooms: ['livingRoom', 'studio'],
        },
      ],
      walls: ground.walls.filter(
        (wall) => wall.id !== 'living-room-south-wall'
      ),
    };

    const baseline = generateWallSegmentInstances(ground, wallOptions());
    const edited = generateWallSegmentInstances(
      withoutSouthWall,
      wallOptions()
    );

    expect(edited).toHaveLength(baseline.length - 1);
    expect(
      edited.some(
        (instance) => instance.sourceId === 'ground.living_room.south_wall'
      )
    ).toBe(false);
  });
});
