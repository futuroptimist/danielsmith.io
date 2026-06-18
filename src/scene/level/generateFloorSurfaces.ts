import { MeshStandardMaterial, Texture } from 'three';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import { createFloorSurfaceTiles } from '../structures/floorTiles';
import type { RoomFloorBuild, RoomFloorCutout } from '../structures/floorTiles';

import type { FloorDefinition, FloorSurfaceDefinition } from './schema';

export interface FloorSurfaceGenerationOptions {
  readonly elevation?: number;
  readonly thickness?: number;
  readonly material?: MeshStandardMaterial;
  readonly materialFactory?: (
    surface: FloorSurfaceDefinition
  ) => MeshStandardMaterial;
  readonly lightMap?: Texture;
  readonly lightMapIntensity?: number;
  readonly groupName?: string;
  readonly includeExterior?: boolean;
  readonly coordinateScale?: number;
  readonly cutouts?: RoomFloorCutout[];
  readonly cutoutsByRoom?: Readonly<Record<string, RoomFloorCutout[]>>;
  readonly cutoutsBySurface?: Readonly<Record<string, RoomFloorCutout[]>>;
}

export function generateFloorSurfaceTiles(
  floor: FloorDefinition,
  options: FloorSurfaceGenerationOptions = {}
): RoomFloorBuild {
  const coordinateScale = options.coordinateScale ?? FLOOR_PLAN_SCALE;
  const exteriorRoomIds = new Set(
    floor.rooms
      .filter((room) => room.category === 'exterior')
      .map((room) => room.id)
  );

  return createFloorSurfaceTiles(
    floor.floorSurfaces
      .filter(
        (surface) =>
          options.includeExterior ||
          !surface.roomId ||
          !exteriorRoomIds.has(surface.roomId)
      )
      .map((surface) => ({
        ...surface,
        bounds: scaleBounds(surface.bounds, coordinateScale),
      })),
    options
  );
}

const scaleBounds = (
  bounds: FloorSurfaceDefinition['bounds'],
  scale: number
): FloorSurfaceDefinition['bounds'] => ({
  minX: bounds.minX * scale,
  maxX: bounds.maxX * scale,
  minZ: bounds.minZ * scale,
  maxZ: bounds.maxZ * scale,
});
