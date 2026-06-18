import { MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { createSolidVisualizer } from '../../debug/solidVisualizer';
import { generateFloorSurfaces } from '../generateFloorSurfaces';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import type { FloorDefinition } from '../schema';

const getFloor = (id: string): FloorDefinition => {
  const floor = PORTFOLIO_LEVEL.floors.find((candidate) => candidate.id === id);
  if (!floor) throw new Error(`Missing floor ${id}`);
  return floor;
};

const containsPoint = (
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  point: { x: number; z: number }
): boolean =>
  point.x >= bounds.minX &&
  point.x <= bounds.maxX &&
  point.z >= bounds.minZ &&
  point.z <= bounds.maxZ;

const scaled = (value: number): number => value * FLOOR_PLAN_SCALE;

describe('generateFloorSurfaces', () => {
  it('adds floor source metadata to every generated tile mesh', () => {
    const build = generateFloorSurfaces(getFloor('ground'), {
      material: new MeshStandardMaterial(),
      coordinateScale: FLOOR_PLAN_SCALE,
    });

    expect(build.tiles.length).toBeGreaterThan(0);
    for (const tile of build.tiles) {
      expect(typeof tile.sourceId).toBe('string');
      expect(tile.mesh.userData.levelSourceId).toBe(tile.sourceId);
      expect(tile.mesh.userData.levelSource).toEqual({
        sourceId: tile.sourceId,
        sourceType: 'floorSurface',
        purpose: 'room-floor',
      });
    }
  });

  it('lets debug solids find generated floors by source ID', () => {
    const build = generateFloorSurfaces(getFloor('ground'), {
      material: new MeshStandardMaterial(),
      coordinateScale: FLOOR_PLAN_SCALE,
    });
    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(build.group);

    expect(
      visualizer.getSolidsBySourceId('ground.living_room.floor.main')
    ).toHaveLength(1);
  });

  it('keeps source IDs valid and unique for floor surfaces', () => {
    const sourceIds = PORTFOLIO_LEVEL.floors.flatMap((floor) =>
      floor.floorSurfaces.map((surface) => String(surface.sourceId))
    );

    expect(sourceIds).toContain('ground.living_room.floor.main');
    expect(sourceIds).toContain('upper.upper_landing.floor.main');
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
  });

  it('regenerates changed output when a floor surface fixture changes', () => {
    const floor = getFloor('ground');
    const changed: FloorDefinition = {
      ...floor,
      floorSurfaces: floor.floorSurfaces.map((surface) =>
        surface.id === 'living-room-floor-main'
          ? {
              ...surface,
              bounds: { ...surface.bounds, maxX: surface.bounds.maxX - 2 },
            }
          : surface
      ),
    };

    const original = generateFloorSurfaces(floor, {
      material: new MeshStandardMaterial(),
      coordinateScale: FLOOR_PLAN_SCALE,
    });
    const updated = generateFloorSurfaces(changed, {
      material: new MeshStandardMaterial(),
      coordinateScale: FLOOR_PLAN_SCALE,
    });

    expect(updated.tiles[0].bounds.maxX).toBe(
      original.tiles[0].bounds.maxX - 4
    );
  });

  it('preserves upper stairwell void and landing egress samples with generator-owned cutouts', () => {
    const stairwellVoid = {
      minX: scaled(4.65),
      maxX: scaled(7.95),
      minZ: scaled(-15.95),
      maxZ: scaled(-12.1),
    };
    const egressSample = { x: scaled(4.25), z: scaled(-11) };
    const librarySample = { x: scaled(5), z: scaled(-6) };
    const build = generateFloorSurfaces(getFloor('upper'), {
      material: new MeshStandardMaterial(),
      coordinateScale: FLOOR_PLAN_SCALE,
      cutoutsByRoom: { upperLanding: [stairwellVoid] },
    });

    expect(
      build.tiles.some((tile) =>
        containsPoint(tile.bounds, { x: scaled(6), z: scaled(-14) })
      )
    ).toBe(false);
    expect(
      build.tiles.some((tile) => containsPoint(tile.bounds, egressSample))
    ).toBe(true);
    expect(
      build.tiles.some((tile) => containsPoint(tile.bounds, librarySample))
    ).toBe(true);
  });
});
