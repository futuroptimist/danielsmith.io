import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';

import type { Bounds2D, RoomDefinition } from '../../assets/floorPlan';
import { applyLightmapUv2 } from '../lighting/bakedLightmaps';

export interface RoomFloorTile {
  readonly roomId: string;
  readonly mesh: Mesh;
}

export interface RoomFloorBuild {
  readonly group: Group;
  readonly tiles: RoomFloorTile[];
}

export interface RoomFloorOptions {
  /** Height of the tile's top surface. */
  readonly elevation?: number;
  /** Amount to inset from each wall. */
  readonly inset?: number;
  /** Physical thickness of the floor tile. */
  readonly thickness?: number;
  /** Optional material shared by every tile. */
  readonly material?: MeshStandardMaterial;
  /** Optional factory for bespoke materials per room. */
  readonly materialFactory?: (room: RoomDefinition) => MeshStandardMaterial;
  /** Optional baked lightmap assigned to each tile. */
  readonly lightMap?: Texture;
  /** Intensity multiplier applied to the baked lightmap. */
  readonly lightMapIntensity?: number;
  /** Override the name assigned to the root group. */
  readonly groupName?: string;
  /** When true, exterior rooms receive tiles too. */
  readonly includeExterior?: boolean;
  /** Optional rectangular voids to cut from individual room tiles. */
  readonly cutoutsByRoom?: Partial<Record<string, Bounds2D[]>>;
}

const DEFAULT_GROUP_NAME = 'RoomFloorTiles';
const DEFAULT_THICKNESS = 0.12;
const DEFAULT_INSET = 0;
const MIN_DIMENSION = 0.05;
const DEFAULT_COLOR = 0x2a3547;

interface TileBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

function intersectBounds(a: TileBounds, b: Bounds2D): TileBounds | null {
  const minX = Math.max(a.minX, b.minX);
  const maxX = Math.min(a.maxX, b.maxX);
  const minZ = Math.max(a.minZ, b.minZ);
  const maxZ = Math.min(a.maxZ, b.maxZ);

  if (maxX - minX <= MIN_DIMENSION || maxZ - minZ <= MIN_DIMENSION) {
    return null;
  }

  return { minX, maxX, minZ, maxZ };
}

function subtractCutout(tile: TileBounds, cutout: Bounds2D): TileBounds[] {
  const intersection = intersectBounds(tile, cutout);
  if (!intersection) {
    return [tile];
  }

  return [
    // West side.
    {
      minX: tile.minX,
      maxX: intersection.minX,
      minZ: tile.minZ,
      maxZ: tile.maxZ,
    },
    // East side.
    {
      minX: intersection.maxX,
      maxX: tile.maxX,
      minZ: tile.minZ,
      maxZ: tile.maxZ,
    },
    // South side, between the west/east side strips.
    {
      minX: intersection.minX,
      maxX: intersection.maxX,
      minZ: tile.minZ,
      maxZ: intersection.minZ,
    },
    // North side, between the west/east side strips.
    {
      minX: intersection.minX,
      maxX: intersection.maxX,
      minZ: intersection.maxZ,
      maxZ: tile.maxZ,
    },
  ].filter(
    (candidate) =>
      candidate.maxX - candidate.minX > MIN_DIMENSION &&
      candidate.maxZ - candidate.minZ > MIN_DIMENSION
  );
}

function applyRoomCutouts(
  roomTile: TileBounds,
  cutouts: readonly Bounds2D[]
): TileBounds[] {
  return cutouts.reduce<TileBounds[]>(
    (tiles, cutout) => tiles.flatMap((tile) => subtractCutout(tile, cutout)),
    [roomTile]
  );
}

function applyLightMapOptions(
  material: MeshStandardMaterial,
  options: RoomFloorOptions
) {
  if (options.lightMap) {
    material.lightMap = options.lightMap;
    const rawIntensity =
      options.lightMapIntensity ?? material.lightMapIntensity ?? 1;
    material.lightMapIntensity = Math.max(0, rawIntensity);
  } else if (typeof options.lightMapIntensity === 'number') {
    material.lightMapIntensity = Math.max(0, options.lightMapIntensity);
  }
}

function resolveMaterial(
  room: RoomDefinition,
  options: RoomFloorOptions,
  defaultMaterial: MeshStandardMaterial
): MeshStandardMaterial {
  if (options.materialFactory) {
    const customMaterial = options.materialFactory(room);
    applyLightMapOptions(customMaterial, options);
    return customMaterial;
  }

  if (options.material) {
    applyLightMapOptions(options.material, options);
    return options.material;
  }

  applyLightMapOptions(defaultMaterial, options);
  return defaultMaterial;
}

export function createRoomFloorTiles(
  rooms: RoomDefinition[],
  options: RoomFloorOptions = {}
): RoomFloorBuild {
  const group = new Group();
  group.name = options.groupName ?? DEFAULT_GROUP_NAME;

  const tiles: RoomFloorTile[] = [];
  const inset = Math.max(options.inset ?? DEFAULT_INSET, 0);
  const thickness = Math.max(
    options.thickness ?? DEFAULT_THICKNESS,
    MIN_DIMENSION
  );
  const elevation = options.elevation ?? 0;

  const defaultMaterial =
    options.material ??
    new MeshStandardMaterial({
      color: DEFAULT_COLOR,
      roughness: 0.58,
      metalness: 0.18,
    });

  rooms.forEach((room) => {
    if (!options.includeExterior && room.category === 'exterior') {
      return;
    }

    const roomTile = {
      minX: room.bounds.minX + inset,
      maxX: room.bounds.maxX - inset,
      minZ: room.bounds.minZ + inset,
      maxZ: room.bounds.maxZ - inset,
    };
    const roomTiles = applyRoomCutouts(
      roomTile,
      options.cutoutsByRoom?.[room.id] ?? []
    );

    roomTiles.forEach((tile, tileIndex) => {
      const width = tile.maxX - tile.minX;
      const depth = tile.maxZ - tile.minZ;

      if (width <= MIN_DIMENSION || depth <= MIN_DIMENSION) {
        return;
      }

      const geometry = new BoxGeometry(width, thickness, depth);
      applyLightmapUv2(geometry);

      const mesh = new Mesh(
        geometry,
        resolveMaterial(room, options, defaultMaterial)
      );
      mesh.position.set(
        (tile.minX + tile.maxX) / 2,
        elevation - thickness / 2,
        (tile.minZ + tile.maxZ) / 2
      );
      mesh.name =
        roomTiles.length > 1
          ? `${room.name} Floor ${tileIndex + 1}`
          : `${room.name} Floor`;
      mesh.receiveShadow = true;

      group.add(mesh);
      tiles.push({ roomId: room.id, mesh });
    });
  });

  return { group, tiles };
}
