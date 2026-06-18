import { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { WALL_THICKNESS } from '../../../assets/floorPlan';
import { createWallSegmentMeshes } from '../../structures/wallSegmentsMesh';
import { generateWallSegmentInstances } from '../generateWalls';
import type { FloorDefinition, RoomConnectionDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

const createProofFloor = (): FloorDefinition => ({
  id: 'proof',
  name: 'Proof floor',
  outline: [
    [0, 0],
    [8, 0],
    [8, 4],
    [0, 4],
  ],
  rooms: [
    {
      id: 'leftRoom',
      sourceId: sourceId('proof.left_room.room'),
      name: 'Left room',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
      ledColor: 0xffffff,
    },
    {
      id: 'rightRoom',
      sourceId: sourceId('proof.right_room.room'),
      name: 'Right room',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
      ledColor: 0xffffff,
    },
  ],
  walls: [
    {
      id: 'left-south-wall',
      sourceId: sourceId('proof.left_room.south_wall'),
      floorId: 'proof',
      wallKind: 'wall',
      rooms: ['leftRoom'],
      run: { start: { x: 0, z: 0 }, end: { x: 4, z: 0 } },
    },
  ],
  floorSurfaces: [
    {
      id: 'left-floor',
      sourceId: sourceId('proof.left_room.floor.main'),
      floorId: 'proof',
      roomId: 'leftRoom',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
    },
    {
      id: 'right-floor',
      sourceId: sourceId('proof.right_room.floor.main'),
      floorId: 'proof',
      roomId: 'rightRoom',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
    },
  ],
});

const wallOptions = {
  coordinateScale: 1,
  baseElevation: 0,
  wallHeight: 3,
  wallThickness: WALL_THICKNESS,
  fenceHeight: 1,
  fenceThickness: 0.2,
  getRoomCategory: () => 'interior' as const,
};

const renderWallSourceIds = (floor: FloorDefinition) => {
  const material = new MeshBasicMaterial();
  const instances = generateWallSegmentInstances(floor, wallOptions);
  const build = createWallSegmentMeshes({
    instances,
    groupName: 'SourceEditProofWalls',
    getMaterial: () => material,
  });

  return {
    instanceSourceIds: instances.map((instance) => String(instance.sourceId)),
    colliderSourceIds: instances.map((instance) => String(instance.sourceId)),
    meshSourceIds: build.meshes.map((mesh) =>
      String(mesh.userData.levelSourceId)
    ),
  };
};

describe('declarative source edit proof', () => {
  it('adds wall meshes and colliders when a wall is added to source data', () => {
    const floor = createProofFloor();
    const edited: FloorDefinition = {
      ...floor,
      walls: [
        ...floor.walls,
        {
          id: 'right-south-wall',
          sourceId: sourceId('proof.right_room.south_wall'),
          floorId: 'proof',
          wallKind: 'wall',
          rooms: ['rightRoom'],
          run: { start: { x: 4, z: 0 }, end: { x: 8, z: 0 } },
        },
      ],
    };

    const baseline = renderWallSourceIds(floor);
    const generated = renderWallSourceIds(edited);

    expect(baseline.meshSourceIds).not.toContain('proof.right_room.south_wall');
    expect(generated.meshSourceIds).toContain('proof.right_room.south_wall');
    expect(generated.colliderSourceIds).toContain(
      'proof.right_room.south_wall'
    );
  });

  it('removes wall meshes and colliders when a wall is removed from source data', () => {
    const floor = createProofFloor();
    const edited: FloorDefinition = { ...floor, walls: [] };

    const baseline = renderWallSourceIds(floor);
    const generated = renderWallSourceIds(edited);

    expect(baseline.meshSourceIds).toContain('proof.left_room.south_wall');
    expect(baseline.colliderSourceIds).toContain('proof.left_room.south_wall');
    expect(generated.meshSourceIds).not.toContain('proof.left_room.south_wall');
    expect(generated.colliderSourceIds).not.toContain(
      'proof.left_room.south_wall'
    );
  });

  it('does not treat semantic room connections as wall geometry', () => {
    const floor = createProofFloor();
    const connection: RoomConnectionDefinition = {
      id: 'left-to-right',
      sourceId: sourceId('proof.left_room_to_right_room.connection'),
      floorId: 'proof',
      rooms: ['leftRoom', 'rightRoom'],
      purpose: 'Narrative adjacency only; geometry stays in walls.',
    };
    const edited: FloorDefinition = {
      ...floor,
      roomConnections: [connection],
    };

    expect(renderWallSourceIds(edited)).toEqual(renderWallSourceIds(floor));
  });
});
