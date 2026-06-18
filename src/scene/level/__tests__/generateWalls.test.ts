import { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  WALL_THICKNESS,
} from '../../../assets/floorPlan';
import { createWallSegmentInstances } from '../../../assets/floorPlan/wallSegments';
import { createWallSegmentMeshes } from '../../structures/wallSegmentsMesh';
import { generateWallSegmentInstances } from '../generateWalls';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import type { FloorDefinition, LevelDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

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

const sourceId = (value: string) => assertLevelSourceId(value);

const sourceEditProofFloor = (): FloorDefinition => ({
  id: 'proof',
  name: 'Proof Floor',
  outline: [
    [0, 0],
    [8, 0],
    [8, 4],
    [0, 4],
  ],
  rooms: [
    {
      id: 'left',
      sourceId: sourceId('proof.left.room'),
      name: 'Left',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
      ledColor: 0xffffff,
    },
    {
      id: 'right',
      sourceId: sourceId('proof.right.room'),
      name: 'Right',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
      ledColor: 0xffffff,
    },
  ],
  walls: [
    {
      id: 'left-west-wall',
      sourceId: sourceId('proof.left.west_wall'),
      floorId: 'proof',
      wallKind: 'wall',
      rooms: ['left'],
      run: { start: { x: 0, z: 0 }, end: { x: 0, z: 4 } },
    },
    {
      id: 'divider-wall',
      sourceId: sourceId('proof.left_to_right.divider_wall'),
      floorId: 'proof',
      wallKind: 'wall',
      rooms: ['left', 'right'],
      run: { start: { x: 4, z: 0 }, end: { x: 4, z: 4 } },
    },
  ],
  floorSurfaces: [
    {
      id: 'left-floor',
      sourceId: sourceId('proof.left.floor.main'),
      floorId: 'proof',
      roomId: 'left',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
    },
    {
      id: 'right-floor',
      sourceId: sourceId('proof.right.floor.main'),
      floorId: 'proof',
      roomId: 'right',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
    },
  ],
});

const proofWallOptions = () => ({
  coordinateScale: 1,
  baseElevation: 0,
  wallHeight: 3,
  wallThickness: 0.25,
  fenceHeight: 1,
  fenceThickness: 0.1,
  getRoomCategory: () => 'interior' as const,
});

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

  it('adds stable source metadata to generated wall and fence meshes', () => {
    const material = new MeshBasicMaterial({ color: 0xffffff });
    const instances = [
      ...generateWallSegmentInstances(
        getFloor(PORTFOLIO_LEVEL, 'ground'),
        wallOptions()
      ),
      ...generateWallSegmentInstances(
        getFloor(PORTFOLIO_LEVEL, 'upper'),
        wallOptions(9)
      ),
    ];

    const { meshes } = createWallSegmentMeshes({
      instances,
      groupName: 'GeneratedWallMetadataTest',
      getMaterial: () => material,
    });

    expect(meshes).toHaveLength(instances.length);
    meshes.forEach((mesh, index) => {
      const sourceId = instances[index]?.sourceId;

      expect(typeof mesh.userData.levelSourceId).toBe('string');
      expect(mesh.userData.levelSourceId).toBe(sourceId);
      expect(mesh.userData.levelSource).toEqual({
        sourceId,
        sourceType: 'wall',
      });
    });

    material.dispose();
  });

  it('keeps production declarative wall data free of wall-removal escape hatches', () => {
    expect(JSON.stringify(PORTFOLIO_LEVEL)).not.toMatch(
      /skip|former|removed|tombstone/i
    );
  });

  it('regenerates wall meshes and colliders from direct source-data edits', () => {
    const floor = sourceEditProofFloor();
    const addedWallSourceId = sourceId('proof.right.east_wall');
    const withAddedWall: FloorDefinition = {
      ...floor,
      walls: [
        ...floor.walls,
        {
          id: 'right-east-wall',
          sourceId: addedWallSourceId,
          floorId: 'proof',
          wallKind: 'wall',
          rooms: ['right'],
          run: { start: { x: 8, z: 0 }, end: { x: 8, z: 4 } },
        },
      ],
    };

    const baseline = generateWallSegmentInstances(floor, proofWallOptions());
    const edited = generateWallSegmentInstances(
      withAddedWall,
      proofWallOptions()
    );

    expect(baseline.some((wall) => wall.sourceId === addedWallSourceId)).toBe(
      false
    );
    const generatedWall = edited.find(
      (wall) => wall.sourceId === addedWallSourceId
    );
    expect(generatedWall).toBeDefined();
    expect(generatedWall?.collider).toMatchObject({ minX: 8, maxX: 8.25 });

    const material = new MeshBasicMaterial({ color: 0xffffff });
    const { meshes } = createWallSegmentMeshes({
      instances: edited,
      getMaterial: () => material,
    });
    expect(
      meshes.some((mesh) => mesh.userData.levelSourceId === addedWallSourceId)
    ).toBe(true);
    material.dispose();
  });

  it('removes generated wall meshes and colliders after a direct source-data deletion', () => {
    const floor = sourceEditProofFloor();
    const removedSourceId = sourceId('proof.left_to_right.divider_wall');
    const withoutDivider: FloorDefinition = {
      ...floor,
      walls: floor.walls.filter((wall) => wall.sourceId !== removedSourceId),
    };

    const baseline = generateWallSegmentInstances(floor, proofWallOptions());
    const edited = generateWallSegmentInstances(
      withoutDivider,
      proofWallOptions()
    );

    expect(baseline.some((wall) => wall.sourceId === removedSourceId)).toBe(
      true
    );
    expect(edited.some((wall) => wall.sourceId === removedSourceId)).toBe(
      false
    );
  });

  it('does not create or remove wall geometry for semantic room connections', () => {
    const floor = sourceEditProofFloor();
    const withConnection: FloorDefinition = {
      ...floor,
      roomConnections: [
        {
          id: 'left-right-opening',
          sourceId: sourceId('proof.left_to_right.connection'),
          floorId: 'proof',
          rooms: ['left', 'right'],
        },
      ],
    };

    const baseline = generateWallSegmentInstances(floor, proofWallOptions());
    const edited = generateWallSegmentInstances(
      withConnection,
      proofWallOptions()
    );

    expect(edited.map(wallSignature).sort(compareSignatures)).toEqual(
      baseline.map(wallSignature).sort(compareSignatures)
    );
    expect(
      edited.some((wall) => wall.sourceId === 'proof.left_to_right.connection')
    ).toBe(false);
  });

  it('responds to declarative wall edits without consuming semantic connections', () => {
    const ground = getFloor(PORTFOLIO_LEVEL, 'ground');
    const withoutSouthWall: FloorDefinition = {
      ...ground,
      roomConnections: [
        ...(ground.roomConnections ?? []),
        {
          id: 'test-only-connection',
          sourceId: sourceId('ground.test_only.connection'),
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

    const removedSourceId = 'ground.living_room.south_wall';

    expect(
      baseline.some((instance) => instance.sourceId === removedSourceId)
    ).toBe(true);
    expect(
      edited.some((instance) => instance.sourceId === removedSourceId)
    ).toBe(false);
  });

  it('uses per-wall thickness when offsetting exterior wall instances', () => {
    const ground = getFloor(PORTFOLIO_LEVEL, 'ground');
    const customThickness = WALL_THICKNESS * 2;
    const thickenedSouthWall: FloorDefinition = {
      ...ground,
      walls: ground.walls.map((wall) =>
        wall.id === 'living-room-south-wall'
          ? { ...wall, thickness: customThickness }
          : wall
      ),
    };

    const sourceId = 'ground.living_room.south_wall';
    const baselineSouthWalls = generateWallSegmentInstances(
      ground,
      wallOptions()
    ).filter((instance) => instance.sourceId === sourceId);
    const thickenedSouthWalls = generateWallSegmentInstances(
      thickenedSouthWall,
      wallOptions()
    ).filter((instance) => instance.sourceId === sourceId);

    expect(thickenedSouthWalls).toHaveLength(baselineSouthWalls.length);
    expect(thickenedSouthWalls.length).toBeGreaterThan(0);
    thickenedSouthWalls.forEach((instance, index) => {
      expect(instance.thickness).toBe(customThickness);
      expect(instance.dimensions.depth).toBe(customThickness);
      expect(instance.center.z).toBeCloseTo(
        baselineSouthWalls[index].center.z -
          (customThickness - WALL_THICKNESS) / 2
      );
    });
  });

  it('rejects non-axis-aligned declarative walls instead of silently dropping them', () => {
    const ground = getFloor(PORTFOLIO_LEVEL, 'ground');
    const diagonalWall: FloorDefinition = {
      ...ground,
      walls: [
        ...ground.walls,
        {
          id: 'test-diagonal-wall',
          sourceId: sourceId('ground.test.diagonal_wall'),
          floorId: 'ground',
          rooms: ['livingRoom'],
          run: {
            start: { x: 0, z: 0 },
            end: { x: 1, z: 1 },
          },
        },
      ],
    };

    expect(() =>
      generateWallSegmentInstances(diagonalWall, wallOptions())
    ).toThrow(/test-diagonal-wall.*non-axis-aligned segment/);
  });
});
