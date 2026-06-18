import type { MeshStandardMaterial, Texture } from 'three';

import type { Bounds2D, RoomDefinition } from '../../assets/floorPlan';
import {
  createRoomFloorTiles,
  type RoomFloorBuild,
  type RoomFloorCutout,
} from '../structures/floorTiles';

import type { FloorDefinition, FloorSurfaceDefinition } from './schema';

export interface FloorSurfaceBuildOptions {
  readonly elevation?: number;
  readonly inset?: number;
  readonly thickness?: number;
  readonly material?: MeshStandardMaterial;
  readonly materialFactory?: (
    surface: FloorSurfaceDefinition
  ) => MeshStandardMaterial;
  readonly lightMap?: Texture;
  readonly lightMapIntensity?: number;
  readonly groupName?: string;
  readonly cutouts?: RoomFloorCutout[];
  readonly cutoutsBySurface?: Readonly<Record<string, RoomFloorCutout[]>>;
}

export interface GeneratedFloorSurfaceTile {
  readonly surfaceId: string;
  readonly sourceId: string;
  readonly roomId?: string;
  readonly mesh: RoomFloorBuild['tiles'][number]['mesh'];
  readonly bounds: Bounds2D;
}

export interface GeneratedFloorSurfaceBuild {
  readonly group: RoomFloorBuild['group'];
  readonly tiles: GeneratedFloorSurfaceTile[];
}

const toRoomDefinition = (surface: FloorSurfaceDefinition): RoomDefinition => ({
  id: surface.id,
  name: surface.id,
  bounds: surface.bounds,
  ledColor: 0xffffff,
});

export function generateFloorSurfaceTiles(
  floor: FloorDefinition,
  options: FloorSurfaceBuildOptions = {}
): GeneratedFloorSurfaceBuild {
  const surfaceById = new Map(
    floor.floorSurfaces.map((surface) => [surface.id, surface])
  );
  const cutoutsByRoom = Object.fromEntries(
    floor.floorSurfaces.map((surface) => [
      surface.id,
      [
        ...(options.cutouts ?? []),
        ...(options.cutoutsBySurface?.[surface.id] ?? []),
      ],
    ])
  );
  const build = createRoomFloorTiles(
    floor.floorSurfaces.map(toRoomDefinition),
    {
      elevation: options.elevation,
      inset: options.inset,
      thickness: options.thickness,
      material: options.material,
      materialFactory: options.materialFactory
        ? (room) => options.materialFactory!(surfaceById.get(room.id)!)
        : undefined,
      lightMap: options.lightMap,
      lightMapIntensity: options.lightMapIntensity,
      groupName: options.groupName,
      includeExterior: true,
      cutoutsByRoom,
    }
  );

  return {
    group: build.group,
    tiles: build.tiles.map((tile) => {
      const surface = surfaceById.get(tile.roomId);
      if (!surface) {
        throw new Error(
          `Generated tile references unknown floor surface "${tile.roomId}".`
        );
      }

      tile.mesh.userData.levelSourceId = surface.sourceId;
      tile.mesh.userData.levelSource = {
        sourceId: surface.sourceId,
        sourceType: 'floorSurface',
        ...(surface.purpose ? { purpose: surface.purpose } : {}),
      };

      return {
        surfaceId: surface.id,
        sourceId: surface.sourceId,
        roomId: surface.roomId,
        mesh: tile.mesh,
        bounds: tile.bounds,
      };
    }),
  };
}
