import { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { UPPER_FLOOR_PLAN } from '../../../assets/floorPlan';
import { createRoomFloorTiles } from '../../structures/floorTiles';
import { generateFloorSurfaceTiles } from '../generateFloorSurfaces';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import type { FloorDefinition } from '../schema';

const getFloor = (floorId: string): FloorDefinition => {
  const floor = PORTFOLIO_LEVEL.floors.find(
    (candidate) => candidate.id === floorId
  );
  if (!floor) throw new Error(`Missing floor ${floorId}.`);
  return floor;
};

const signature = (tile: {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}) => JSON.stringify(tile.bounds);

const containsPoint = (
  tile: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number } },
  point: { x: number; z: number }
): boolean =>
  point.x >= tile.bounds.minX &&
  point.x <= tile.bounds.maxX &&
  point.z >= tile.bounds.minZ &&
  point.z <= tile.bounds.maxZ;

describe('generateFloorSurfaceTiles', () => {
  it('generates current ground floor tiles from declarative floor surfaces with source metadata', () => {
    const material = new MeshBasicMaterial();
    const generated = generateFloorSurfaceTiles(getFloor('ground'), {
      material,
    });
    const legacy = createRoomFloorTiles(
      getFloor('ground').rooms.map((room) => ({ ...room, doorways: [] })),
      { material }
    );

    expect(generated.tiles.map(signature).sort()).toEqual(
      legacy.tiles.map(signature).sort()
    );
    expect(
      generated.tiles.every((tile) => tile.mesh.userData.levelSourceId)
    ).toBe(true);
    expect(generated.tiles.map((tile) => tile.sourceId)).toContain(
      'ground.livingRoom.floor.main'
    );
    generated.tiles.forEach((tile) => {
      expect(tile.mesh.userData.levelSource).toMatchObject({
        sourceId: tile.sourceId,
        sourceType: 'floorSurface',
      });
    });
  });

  it('responds to declarative floor surface edits', () => {
    const ground = getFloor('ground');
    const edited: FloorDefinition = {
      ...ground,
      floorSurfaces: ground.floorSurfaces.map((surface) =>
        surface.id === 'living-room-main-floor'
          ? {
              ...surface,
              bounds: { ...surface.bounds, maxX: surface.bounds.maxX - 2 },
            }
          : surface
      ),
    };

    expect(
      generateFloorSurfaceTiles(edited).tiles.map(signature).sort()
    ).not.toEqual(
      generateFloorSurfaceTiles(ground).tiles.map(signature).sort()
    );
  });

  it('keeps upper stairwell samples void while egress samples remain covered', () => {
    const upper = getFloor('upper');
    const cutout = { minX: 8.9, maxX: 10.4, minZ: -16, maxZ: -8 };
    const generated = generateFloorSurfaceTiles(upper, {
      cutoutsBySurface: {
        'upper-landing-main-floor': [cutout],
        'upper-landing-stair-edge-floor': [cutout],
      },
    });

    expect(
      generated.tiles.some((tile) => containsPoint(tile, { x: 9.6, z: -12 }))
    ).toBe(false);
    expect(
      generated.tiles.some((tile) => containsPoint(tile, { x: 3, z: -12 }))
    ).toBe(true);
    expect(
      generated.tiles.some((tile) => containsPoint(tile, { x: 0, z: -12 }))
    ).toBe(true);
    expect(generated.tiles.map((tile) => tile.sourceId)).toContain(
      'upper.upperLanding.floor.main'
    );
    expect(upper.floorSurfaces.map((surface) => surface.sourceId)).toContain(
      'upper.upperLanding.floor.stairEdgePiece'
    );
    expect(
      UPPER_FLOOR_PLAN.rooms.some((room) => room.id === 'upperLanding')
    ).toBe(true);
  });
});
