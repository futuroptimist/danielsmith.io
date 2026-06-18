import { MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { generateFloorSurfaceTiles } from '../generateFloorSurfaces';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';

const getFloor = (floorId: string) => {
  const floor = PORTFOLIO_LEVEL.floors.find(
    (candidate) => candidate.id === floorId
  );
  if (!floor) throw new Error(`Missing floor ${floorId}`);
  return floor;
};

const containsPoint = (
  tile: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number } },
  x: number,
  z: number
) =>
  tile.bounds.minX <= x &&
  tile.bounds.maxX >= x &&
  tile.bounds.minZ <= z &&
  tile.bounds.maxZ >= z;

describe('generateFloorSurfaceTiles', () => {
  it('assigns source metadata to every generated floor tile mesh', () => {
    const build = generateFloorSurfaceTiles(getFloor('ground'), {
      material: new MeshStandardMaterial(),
    });

    expect(build.tiles.length).toBeGreaterThan(0);
    expect(build.tiles.every((tile) => typeof tile.sourceId === 'string')).toBe(
      true
    );
    expect(
      build.tiles.every(
        (tile) =>
          tile.mesh.userData.levelSourceId === tile.sourceId &&
          tile.mesh.userData.levelSource.sourceType === 'floorSurface'
      )
    ).toBe(true);
  });

  it('uses stable semantic source IDs for portfolio floor surfaces', () => {
    const sourceIds = PORTFOLIO_LEVEL.floors.flatMap((floor) =>
      floor.floorSurfaces.map((surface) => String(surface.sourceId))
    );

    expect(sourceIds).toEqual(
      expect.arrayContaining([
        'ground.livingRoom.floor.main',
        'upper.upperLanding.floor.main',
        'upper.upperLanding.floor.stairEdgePiece',
      ])
    );
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
  });

  it('editing a declarative floor surface changes generated output', () => {
    const floor = getFloor('ground');
    const baseline = generateFloorSurfaceTiles(floor, {
      material: new MeshStandardMaterial(),
    });
    const edited = generateFloorSurfaceTiles(
      {
        ...floor,
        floorSurfaces: floor.floorSurfaces.map((surface) =>
          surface.id === 'livingRoom-floor-surface'
            ? {
                ...surface,
                bounds: { ...surface.bounds, maxX: surface.bounds.maxX - 2 },
              }
            : surface
        ),
      },
      { material: new MeshStandardMaterial() }
    );

    const baselineLiving = baseline.tiles.find(
      (tile) => tile.sourceId === 'ground.livingRoom.floor.main'
    );
    const editedLiving = edited.tiles.find(
      (tile) => tile.sourceId === 'ground.livingRoom.floor.main'
    );

    expect(editedLiving?.bounds.maxX).toBe(
      (baselineLiving?.bounds.maxX ?? 0) - 2 * FLOOR_PLAN_SCALE
    );
  });

  it('preserves current upper stairwell void and egress floor coverage', () => {
    const stairwellVoid = {
      minX: 10.62,
      maxX: 15.9,
      minZ: -31.9,
      maxZ: -24.2,
    };
    const cutoutsByRoom = {
      upperLanding: [
        { minX: 9.3, maxX: 15.5, minZ: -31.1, maxZ: -25.9 },
        { minX: 9.3, maxX: 15.5, minZ: -25.9, maxZ: -24.2 },
        { minX: 9.3, maxX: 10.62, minZ: -24.2, maxZ: -16 },
        stairwellVoid,
      ],
    };
    const build = generateFloorSurfaceTiles(getFloor('upper'), {
      material: new MeshStandardMaterial(),
      cutoutsByRoom,
    });

    expect(build.tiles.some((tile) => containsPoint(tile, 11, -28))).toBe(
      false
    );
    expect(build.tiles.some((tile) => containsPoint(tile, 8, -20))).toBe(true);
    expect(build.tiles.some((tile) => containsPoint(tile, 0, -12))).toBe(true);
  });
});
