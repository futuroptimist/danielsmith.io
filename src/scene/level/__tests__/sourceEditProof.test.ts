import { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createSolidVisualizer } from '../../debug/solidVisualizer';
import { createWallSegmentMeshes } from '../../structures/wallSegmentsMesh';
import { generateWallSegmentInstances } from '../generateWalls';
import type { FloorDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

const floor: FloorDefinition = {
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
      ledColor: 0xeeeeee,
    },
  ],
  walls: [
    {
      id: 'left-west-wall',
      sourceId: sourceId('test.left.west_wall'),
      floorId: 'test',
      wallKind: 'wall',
      rooms: ['left'],
      run: { start: { x: 0, z: 0 }, end: { x: 0, z: 4 } },
    },
  ],
  floorSurfaces: [
    {
      id: 'left-floor',
      sourceId: sourceId('test.left.floor.main'),
      floorId: 'test',
      roomId: 'left',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
    },
    {
      id: 'right-floor',
      sourceId: sourceId('test.right.floor.main'),
      floorId: 'test',
      roomId: 'right',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
    },
  ],
};

const options = {
  coordinateScale: 1,
  baseElevation: 0,
  wallHeight: 3,
  wallThickness: 0.5,
  fenceHeight: 1,
  fenceThickness: 0.25,
  getRoomCategory: () => 'interior' as const,
};

const buildWalls = (definition: FloorDefinition) =>
  generateWallSegmentInstances(definition, options);

const hasWallSource = (definition: FloorDefinition, id: string) =>
  buildWalls(definition).some((wall) => wall.sourceId === id);

describe('declarative source edit proof', () => {
  it('adds wall mesh and collider output when a wall is added to source data', () => {
    const addedSourceId = sourceId('test.left_to_right.dividing_wall');
    const edited: FloorDefinition = {
      ...floor,
      walls: [
        ...floor.walls,
        {
          id: 'left-right-dividing-wall',
          sourceId: addedSourceId,
          floorId: 'test',
          wallKind: 'wall',
          rooms: ['left', 'right'],
          run: { start: { x: 4, z: 0 }, end: { x: 4, z: 4 } },
        },
      ],
    };

    expect(hasWallSource(floor, addedSourceId)).toBe(false);

    const instances = buildWalls(edited);
    const added = instances.find((wall) => wall.sourceId === addedSourceId);
    expect(added).toBeDefined();

    const colliders = instances.map((wall) => ({
      ...wall.collider,
      sourceId: wall.sourceId,
      sourceType: 'wall',
    }));
    expect(
      colliders.filter(
        (collider) =>
          collider.minX <= 4 &&
          collider.maxX >= 4 &&
          collider.minZ <= 2 &&
          collider.maxZ >= 2
      )
    ).toEqual([expect.objectContaining({ sourceId: addedSourceId })]);

    const material = new MeshBasicMaterial();
    const { group } = createWallSegmentMeshes({
      instances,
      getMaterial: () => material,
    });
    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(group);
    expect(visualizer.getSolidsBySourceId(addedSourceId)).toHaveLength(1);
    visualizer.dispose();
    material.dispose();
  });

  it('removes wall mesh and collider output when a wall is removed from source data', () => {
    const removedSourceId = sourceId('test.left.west_wall');
    const edited: FloorDefinition = {
      ...floor,
      walls: floor.walls.filter((wall) => wall.sourceId !== removedSourceId),
    };

    expect(hasWallSource(floor, removedSourceId)).toBe(true);
    expect(hasWallSource(edited, removedSourceId)).toBe(false);
  });

  it('keeps semantic room connections from creating or removing wall geometry', () => {
    const connected: FloorDefinition = {
      ...floor,
      roomConnections: [
        {
          id: 'left-to-right',
          sourceId: sourceId('test.left_to_right.connection'),
          floorId: 'test',
          rooms: ['left', 'right'],
          purpose: 'Authoring metadata only; geometry is declared by walls.',
        },
      ],
    };

    expect(buildWalls(connected)).toEqual(buildWalls(floor));
  });
});
