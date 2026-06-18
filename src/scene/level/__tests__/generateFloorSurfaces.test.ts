import { MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { generateFloorSurfaces } from '../generateFloorSurfaces';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';

const getFloor = (floorId: string) => {
  const floor = PORTFOLIO_LEVEL.floors.find(
    (candidate) => candidate.id === floorId
  );
  if (!floor) throw new Error(`Missing floor ${floorId}`);
  return floor;
};

const sampleCoveredBy = (
  tiles: ReturnType<typeof generateFloorSurfaces>['tiles'],
  x: number,
  z: number
): boolean =>
  tiles.some(
    (tile) =>
      tile.bounds.minX <= x &&
      tile.bounds.maxX >= x &&
      tile.bounds.minZ <= z &&
      tile.bounds.maxZ >= z
  );

describe('generateFloorSurfaces', () => {
  it('adds source metadata to every generated floor tile', () => {
    const build = generateFloorSurfaces(getFloor('ground'), {
      material: new MeshStandardMaterial(),
      scale: 1,
    });

    expect(build.tiles.length).toBeGreaterThan(0);
    expect(
      build.tiles.every(
        (tile) => typeof tile.mesh.userData.levelSourceId === 'string'
      )
    ).toBe(true);
    expect(
      build.tiles.every(
        (tile) => tile.mesh.userData.levelSource?.sourceType === 'floorSurface'
      )
    ).toBe(true);
  });

  it('uses the expected stable floor surface source IDs', () => {
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

  it('regenerates changed bounds when source floor surfaces are edited', () => {
    const floor = getFloor('ground');
    const baseline = generateFloorSurfaces(floor, { scale: 1 }).tiles.find(
      (tile) => tile.sourceId === 'ground.livingRoom.floor.main'
    );
    const editedFloor = {
      ...floor,
      floorSurfaces: floor.floorSurfaces.map((surface) =>
        surface.sourceId === 'ground.livingRoom.floor.main'
          ? {
              ...surface,
              bounds: { ...surface.bounds, maxX: surface.bounds.maxX - 2 },
            }
          : surface
      ),
    };
    const edited = generateFloorSurfaces(editedFloor, { scale: 1 }).tiles.find(
      (tile) => tile.sourceId === 'ground.livingRoom.floor.main'
    );

    expect(edited?.bounds.maxX).toBe((baseline?.bounds.maxX ?? 0) - 2);
  });

  it('keeps the source-backed upper stairwell void open while preserving egress samples', () => {
    const upper = getFloor('upper');
    const build = generateFloorSurfaces(upper, {
      scale: 1,
      cutoutsBySurfaceId: {
        'upperLanding-floor-main': [
          { minX: 4.65, maxX: 7.75, minZ: -15.95, maxZ: -8 },
          { minX: 7.75, maxX: 7.95, minZ: -16, maxZ: -15.95 },
        ],
      },
    });

    expect(sampleCoveredBy(build.tiles, 6.2, -12)).toBe(false);
    expect(sampleCoveredBy(build.tiles, 3, -12)).toBe(true);
    expect(sampleCoveredBy(build.tiles, 8.5, -12)).toBe(true);
    expect(sampleCoveredBy(build.tiles, 6.2, -15.975)).toBe(true);
  });
});
