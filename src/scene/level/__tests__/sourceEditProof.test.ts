import { describe, expect, it } from 'vitest';

import { WALL_THICKNESS } from '../../../assets/floorPlan';
import { generateFloorSurfaces } from '../generateFloorSurfaces';
import { generateWallSegmentInstances } from '../generateWalls';
import type { FloorDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

const testFloor = (): FloorDefinition => ({
  id: 'test',
  name: 'Test Floor',
  outline: [
    [0, 0],
    [8, 0],
    [8, 4],
    [0, 4],
  ],
  rooms: [
    {
      id: 'left',
      sourceId: sourceId('test.left.room'),
      name: 'Left',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
      ledColor: 0xffffff,
    },
    {
      id: 'right',
      sourceId: sourceId('test.right.room'),
      name: 'Right',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
      ledColor: 0xffffff,
    },
  ],
  walls: [
    {
      id: 'left-north-wall',
      sourceId: sourceId('test.left.north_wall'),
      floorId: 'test',
      wallKind: 'wall',
      rooms: ['left'],
      run: { start: { x: 0, z: 4 }, end: { x: 4, z: 4 } },
    },
    {
      id: 'right-north-wall',
      sourceId: sourceId('test.right.north_wall'),
      floorId: 'test',
      wallKind: 'wall',
      rooms: ['right'],
      run: { start: { x: 4, z: 4 }, end: { x: 8, z: 4 } },
    },
  ],
  floorSurfaces: [
    {
      id: 'left-floor',
      sourceId: sourceId('test.left.floor_surface'),
      floorId: 'test',
      roomId: 'left',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
    },
    {
      id: 'right-floor',
      sourceId: sourceId('test.right.floor_surface'),
      floorId: 'test',
      roomId: 'right',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
    },
  ],
});

const options = {
  coordinateScale: 1,
  baseElevation: 0,
  wallHeight: 3,
  wallThickness: WALL_THICKNESS,
  fenceHeight: 1,
  fenceThickness: 0.25,
  getRoomCategory: () => 'interior' as const,
};

describe('declarative source edit proof', () => {
  it('adds and removes generated wall meshes and colliders from wall source data', () => {
    const base = testFloor();
    const addedSourceId = sourceId('test.left.south_wall');
    const withWall: FloorDefinition = {
      ...base,
      walls: [
        ...base.walls,
        {
          id: 'left-south-wall',
          sourceId: addedSourceId,
          floorId: 'test',
          wallKind: 'wall',
          rooms: ['left'],
          run: { start: { x: 0, z: 0 }, end: { x: 4, z: 0 } },
        },
      ],
    };

    const baseline = generateWallSegmentInstances(base, options);
    const added = generateWallSegmentInstances(withWall, options);
    const removedAgain = generateWallSegmentInstances(
      {
        ...withWall,
        walls: withWall.walls.filter((wall) => wall.sourceId !== addedSourceId),
      },
      options
    );

    expect(baseline.some((wall) => wall.sourceId === addedSourceId)).toBe(
      false
    );
    expect(added.some((wall) => wall.sourceId === addedSourceId)).toBe(true);
    expect(
      added.find((wall) => wall.sourceId === addedSourceId)?.collider
    ).toMatchObject({
      minX: -0.25,
      maxX: 4.25,
      minZ: -0.5,
      maxZ: 0,
    });
    expect(removedAgain.some((wall) => wall.sourceId === addedSourceId)).toBe(
      false
    );
  });

  it('keeps semantic room connections from generating or removing wall geometry', () => {
    const base = testFloor();
    const connected: FloorDefinition = {
      ...base,
      roomConnections: [
        {
          id: 'left-to-right',
          sourceId: sourceId('test.left_to_right.connection'),
          floorId: 'test',
          rooms: ['left', 'right'],
          purpose: 'semantic adjacency only',
        },
      ],
    };

    expect(generateWallSegmentInstances(connected, options)).toEqual(
      generateWallSegmentInstances(base, options)
    );
  });

  it('adds floor surface output from floorSurface source data', () => {
    const base = testFloor();
    const extraSourceId = sourceId('test.threshold.floor_surface');
    const withSurface: FloorDefinition = {
      ...base,
      floorSurfaces: [
        ...base.floorSurfaces,
        {
          id: 'threshold-floor',
          sourceId: extraSourceId,
          floorId: 'test',
          bounds: { minX: 3.75, maxX: 4.25, minZ: 1, maxZ: 3 },
          purpose: 'authoring proof threshold surface',
        },
      ],
    };

    const baseline = generateFloorSurfaces(base, { scale: 1 });
    const edited = generateFloorSurfaces(withSurface, { scale: 1 });

    expect(baseline.tiles.some((tile) => tile.sourceId === extraSourceId)).toBe(
      false
    );
    expect(edited.tiles.some((tile) => tile.sourceId === extraSourceId)).toBe(
      true
    );
  });
});
