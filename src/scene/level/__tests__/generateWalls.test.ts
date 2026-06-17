import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  UPPER_FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  WALL_THICKNESS,
} from '../../../assets/floorPlan';
import { createWallSegmentInstances } from '../../../assets/floorPlan/wallSegments';
import { createWallSegmentMeshes } from '../../structures/wallSegmentsMesh';
import { generateWallInstances } from '../generateWalls';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import type { FloorDefinition } from '../schema';

const options = {
  scale: FLOOR_PLAN_SCALE,
  baseElevation: 0,
  wallHeight: 6,
  wallThickness: WALL_THICKNESS,
  fenceHeight: 2.4,
  fenceThickness: 0.28,
  getRoomCategory(roomId: string) {
    return roomId === 'backyard'
      ? ('exterior' as const)
      : ('interior' as const);
  },
};

const floor = (id: 'ground' | 'upper') => {
  const definition = PORTFOLIO_LEVEL.floors.find(
    (candidate) => candidate.id === id
  );
  if (!definition) throw new Error(`Missing test floor ${id}`);
  return definition;
};

const bounds = (instances: ReturnType<typeof generateWallInstances>) =>
  instances
    .map((instance) => ({
      collider: instance.collider,
      dimensions: instance.dimensions,
      isFence: instance.isFence,
    }))
    .sort(
      (a, b) =>
        a.collider.minX - b.collider.minX ||
        a.collider.minZ - b.collider.minZ ||
        a.collider.maxX - b.collider.maxX ||
        a.collider.maxZ - b.collider.maxZ
    );

describe('generateWallInstances', () => {
  it('matches legacy ground wall and fence bounds', () => {
    expect(bounds(generateWallInstances(floor('ground'), options))).toEqual(
      bounds(
        createWallSegmentInstances(FLOOR_PLAN, {
          ...options,
          floorId: 'ground',
        })
      )
    );
  });

  it('matches legacy upper wall bounds', () => {
    expect(bounds(generateWallInstances(floor('upper'), options))).toEqual(
      bounds(
        createWallSegmentInstances(UPPER_FLOOR_PLAN, {
          ...options,
          floorId: 'upper',
        })
      )
    );
  });

  it('adds and removes output when declarative wall data changes', () => {
    const ground = floor('ground');
    const withoutFirstWall: FloorDefinition = {
      ...ground,
      walls: ground.walls.slice(1),
    };
    expect(
      generateWallInstances(withoutFirstWall, options).length
    ).toBeLessThan(generateWallInstances(ground, options).length);
  });

  it('does not consume semantic room connections as wall geometry', () => {
    const ground = floor('ground');
    const withoutConnections: FloorDefinition = {
      ...ground,
      roomConnections: [],
    };
    expect(bounds(generateWallInstances(withoutConnections, options))).toEqual(
      bounds(generateWallInstances(ground, options))
    );
  });

  it('emits source IDs for every wall mesh', () => {
    const material = { dispose() {} } as never;
    const instances = generateWallInstances(floor('ground'), options);
    const { meshes } = createWallSegmentMeshes({
      instances,
      getMaterial: () => material,
    });
    expect(
      meshes.every((mesh) => typeof mesh.userData.levelSourceId === 'string')
    ).toBe(true);
    expect(
      meshes.every((mesh) => mesh.userData.levelSource?.sourceType === 'wall')
    ).toBe(true);
  });
});
