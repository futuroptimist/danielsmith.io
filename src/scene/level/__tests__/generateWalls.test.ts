import { MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  getCombinedWallSegments,
} from '../../../assets/floorPlan';
import { createWallSegmentInstances } from '../../../assets/floorPlan/wallSegments';
import { createWallSegmentMeshes } from '../../structures/wallSegmentsMesh';
import { generateWallInstancesFromLevel } from '../generateWalls';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import type { LevelDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const WALL_HEIGHT = 3.2;
const WALL_THICKNESS = 0.5;
const FENCE_HEIGHT = 1.2;
const FENCE_THICKNESS = 0.22;

const getRoomCategory = (roomId: string) =>
  roomId === 'backyard' ? ('exterior' as const) : ('interior' as const);

const legacyOptions = {
  baseElevation: 0,
  wallHeight: WALL_HEIGHT,
  wallThickness: WALL_THICKNESS,
  fenceHeight: FENCE_HEIGHT,
  fenceThickness: FENCE_THICKNESS,
  getRoomCategory,
};

const normalize = (instances: ReturnType<typeof createWallSegmentInstances>) =>
  instances
    .map((instance) => ({
      collider: roundRect(instance.collider),
      center: roundPoint(instance.center),
      dimensions: roundPoint(instance.dimensions),
      isFence: instance.isFence,
      isSharedInterior: instance.isSharedInterior,
      thickness: round(instance.thickness),
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
const roundPoint = <T extends Record<string, number>>(point: T) =>
  Object.fromEntries(
    Object.entries(point).map(([key, value]) => [key, round(value)])
  );
const roundRect = (rect: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}) => roundPoint(rect);

describe('generateWallInstancesFromLevel', () => {
  it('matches legacy generated wall and fence bounds for ground and upper floors', () => {
    expect(
      normalize(
        generateWallInstancesFromLevel(PORTFOLIO_LEVEL, {
          ...legacyOptions,
          floorId: 'ground',
          scale: FLOOR_PLAN_SCALE,
        })
      )
    ).toEqual(
      normalize(
        createWallSegmentInstances(FLOOR_PLAN, {
          ...legacyOptions,
          floorId: 'ground',
        })
      )
    );

    expect(
      normalize(
        generateWallInstancesFromLevel(PORTFOLIO_LEVEL, {
          ...legacyOptions,
          floorId: 'upper',
          scale: FLOOR_PLAN_SCALE,
        })
      )
    ).toEqual(
      normalize(
        createWallSegmentInstances(UPPER_FLOOR_PLAN, {
          ...legacyOptions,
          floorId: 'upper',
        })
      )
    );
  });

  it('adds wall source metadata to every generated mesh and collider', () => {
    const instances = generateWallInstancesFromLevel(PORTFOLIO_LEVEL, {
      ...legacyOptions,
      floorId: 'ground',
      scale: FLOOR_PLAN_SCALE,
    });
    const { meshes } = createWallSegmentMeshes({
      instances,
      getMaterial: () => new MeshStandardMaterial(),
    });

    expect(meshes.length).toBe(instances.length);
    expect(
      meshes.every((mesh) => typeof mesh.userData.levelSourceId === 'string')
    ).toBe(true);
    expect(instances.every((instance) => instance.sourceType === 'wall')).toBe(
      true
    );
    expect(
      instances.every((instance) => typeof instance.sourceId === 'string')
    ).toBe(true);
  });

  it('responds directly to declarative wall edits', () => {
    const extraWall = {
      id: 'fixture-wall',
      sourceId: assertLevelSourceId('ground.fixture.wall'),
      floorId: 'ground',
      wallKind: 'wall' as const,
      rooms: ['livingRoom'],
      segments: [{ start: { x: 0, z: 0 }, end: { x: 2, z: 0 } }],
    };
    const edited: LevelDefinition = {
      ...PORTFOLIO_LEVEL,
      floors: PORTFOLIO_LEVEL.floors.map((floor) =>
        floor.id === 'ground'
          ? { ...floor, walls: [...floor.walls, extraWall] }
          : floor
      ),
    };

    const before = generateWallInstancesFromLevel(PORTFOLIO_LEVEL, {
      ...legacyOptions,
      floorId: 'ground',
      scale: FLOOR_PLAN_SCALE,
    });
    const after = generateWallInstancesFromLevel(edited, {
      ...legacyOptions,
      floorId: 'ground',
      scale: FLOOR_PLAN_SCALE,
    });

    expect(after).toHaveLength(before.length + 1);
    expect(
      after.some((instance) => instance.sourceId === extraWall.sourceId)
    ).toBe(true);
  });

  it('ignores semantic room connections unless wall geometry changes', () => {
    const withoutConnections: LevelDefinition = {
      ...PORTFOLIO_LEVEL,
      floors: PORTFOLIO_LEVEL.floors.map((floor) => ({
        ...floor,
        roomConnections: [],
      })),
    };

    expect(
      normalize(
        generateWallInstancesFromLevel(withoutConnections, {
          ...legacyOptions,
          floorId: 'upper',
          scale: FLOOR_PLAN_SCALE,
        })
      )
    ).toEqual(
      normalize(
        generateWallInstancesFromLevel(PORTFOLIO_LEVEL, {
          ...legacyOptions,
          floorId: 'upper',
          scale: FLOOR_PLAN_SCALE,
        })
      )
    );
  });

  it('does not introduce wall skip lists or former-bounds production data', () => {
    const wallSegments = getCombinedWallSegments(FLOOR_PLAN);
    expect(wallSegments.length).toBeGreaterThan(0);
    expect(JSON.stringify(PORTFOLIO_LEVEL)).not.toMatch(
      /skip|former|removed|tombstone/i
    );
  });
});
