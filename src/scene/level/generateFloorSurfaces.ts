import type { Bounds2D, RoomDefinition } from '../../assets/floorPlan';
import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  createRoomFloorTiles,
  type RoomFloorBuild,
  type RoomFloorCutout,
  type RoomFloorOptions,
} from '../structures/floorTiles';

import type { FloorDefinition, FloorSurfaceDefinition } from './schema';

export interface FloorSurfaceGenerationOptions
  extends Omit<RoomFloorOptions, 'includeExterior' | 'cutoutsByRoom'> {
  readonly scale?: number;
  readonly cutoutsBySurfaceId?: Readonly<Record<string, RoomFloorCutout[]>>;
}

export interface GeneratedFloorSurfaceTile {
  readonly surfaceId: string;
  readonly sourceId: FloorSurfaceDefinition['sourceId'];
  readonly roomId?: string;
  readonly mesh: RoomFloorBuild['tiles'][number]['mesh'];
  readonly bounds: Bounds2D;
}

export interface GeneratedFloorSurfaceBuild {
  readonly group: RoomFloorBuild['group'];
  readonly tiles: GeneratedFloorSurfaceTile[];
}

const scaleBounds = (bounds: Bounds2D, scale: number): Bounds2D => ({
  minX: bounds.minX * scale,
  maxX: bounds.maxX * scale,
  minZ: bounds.minZ * scale,
  maxZ: bounds.maxZ * scale,
});

const makeRoomSurfaceKey = (surface: FloorSurfaceDefinition): string =>
  `${surface.roomId ?? surface.id}:${surface.id}`;

export function generateFloorSurfaces(
  floor: FloorDefinition,
  options: FloorSurfaceGenerationOptions = {}
): GeneratedFloorSurfaceBuild {
  const {
    cutoutsBySurfaceId,
    scale = FLOOR_PLAN_SCALE,
    ...roomFloorOptions
  } = options;
  const roomNames = new Map(floor.rooms.map((room) => [room.id, room.name]));
  const surfacesByKey = new Map<string, FloorSurfaceDefinition>();

  const surfaceRooms: RoomDefinition[] = floor.floorSurfaces.map((surface) => {
    const roomId = surface.roomId ?? surface.id;
    const key = makeRoomSurfaceKey(surface);
    surfacesByKey.set(key, surface);

    return {
      id: key,
      name: roomNames.get(roomId) ?? surface.id,
      bounds: scaleBounds(surface.bounds, scale),
      ledColor: 0,
    };
  });

  const surfaceIds = new Set(floor.floorSurfaces.map((surface) => surface.id));
  const unknownCutoutSurfaceIds = Object.keys(cutoutsBySurfaceId ?? {}).filter(
    (surfaceId) => !surfaceIds.has(surfaceId)
  );

  if (unknownCutoutSurfaceIds.length > 0) {
    console.warn(
      `Ignoring cutouts for unknown floor surface IDs: ${unknownCutoutSurfaceIds.join(
        ', '
      )}.`
    );
  }

  const cutoutsByRoom = Object.fromEntries(
    floor.floorSurfaces.map((surface) => [
      makeRoomSurfaceKey(surface),
      cutoutsBySurfaceId?.[surface.id] ?? [],
    ])
  );

  const build = createRoomFloorTiles(surfaceRooms, {
    ...roomFloorOptions,
    cutoutsByRoom,
    // Surface definitions are already production-filtered; keep synthetic rooms renderable.
    includeExterior: true,
  });

  const tiles = build.tiles.map((tile): GeneratedFloorSurfaceTile => {
    const surface = surfacesByKey.get(tile.roomId);
    if (!surface) {
      throw new Error(
        `Generated floor tile references unknown surface "${tile.roomId}".`
      );
    }

    tile.mesh.userData.levelSourceId = surface.sourceId;
    tile.mesh.userData.levelSource = {
      sourceId: surface.sourceId,
      sourceType: 'floorSurface',
      purpose: surface.purpose,
    };

    return {
      surfaceId: surface.id,
      sourceId: surface.sourceId,
      roomId: surface.roomId,
      mesh: tile.mesh,
      bounds: tile.bounds,
    };
  });

  return { group: build.group, tiles };
}
