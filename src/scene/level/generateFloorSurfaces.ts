import {
  createFloorSurfaceTiles,
  type FloorSurfaceOptions,
  type RoomFloorBuild,
} from '../structures/floorTiles';

import type { FloorDefinition, FloorSurfaceDefinition } from './schema';

export interface GenerateFloorSurfacesOptions extends FloorSurfaceOptions {
  readonly floorId?: string;
  readonly coordinateScale?: number;
}

const getSurfacesForFloor = (
  floor: FloorDefinition,
  floorId?: string
): FloorSurfaceDefinition[] => {
  if (!floorId || floor.id === floorId) {
    return [...floor.floorSurfaces];
  }

  return [];
};

export function generateFloorSurfaces(
  floor: FloorDefinition,
  options: GenerateFloorSurfacesOptions = {}
): RoomFloorBuild {
  const coordinateScale = options.coordinateScale ?? 1;
  const surfaces = getSurfacesForFloor(floor, options.floorId).map(
    (surface) => ({
      ...surface,
      bounds: {
        minX: surface.bounds.minX * coordinateScale,
        maxX: surface.bounds.maxX * coordinateScale,
        minZ: surface.bounds.minZ * coordinateScale,
        maxZ: surface.bounds.maxZ * coordinateScale,
      },
      elevation:
        typeof surface.elevation === 'number'
          ? surface.elevation * coordinateScale
          : undefined,
    })
  );

  return createFloorSurfaceTiles(surfaces, {
    ...options,
  });
}
