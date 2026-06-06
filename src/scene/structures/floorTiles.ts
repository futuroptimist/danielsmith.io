import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';

import type { Bounds2D, RoomDefinition } from '../../assets/floorPlan';
import { applyLightmapUv2 } from '../lighting/bakedLightmaps';

export interface RoomFloorTile {
  readonly roomId: string;
  readonly mesh: Mesh;
  readonly bounds: Bounds2D;
}

export interface RoomFloorBuild {
  readonly group: Group;
  readonly tiles: RoomFloorTile[];
}

export interface RoomFloorCutout {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
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
  /** World-space openings removed from every room tile. */
  readonly cutouts?: RoomFloorCutout[];
  /** World-space openings removed only from a matching room id. */
  readonly cutoutsByRoom?: Readonly<Record<string, RoomFloorCutout[]>>;
}

const DEFAULT_GROUP_NAME = 'RoomFloorTiles';
const DEFAULT_THICKNESS = 0.12;
const DEFAULT_INSET = 0;
const MIN_DIMENSION = 0.05;
const DEFAULT_COLOR = 0x2a3547;

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

const hasPositiveArea = (bounds: Bounds2D): boolean =>
  bounds.maxX - bounds.minX > MIN_DIMENSION &&
  bounds.maxZ - bounds.minZ > MIN_DIMENSION;

const clipCutoutToBounds = (
  bounds: Bounds2D,
  cutout: RoomFloorCutout
): Bounds2D | null => {
  const overlap = {
    minX: Math.max(bounds.minX, cutout.minX),
    maxX: Math.min(bounds.maxX, cutout.maxX),
    minZ: Math.max(bounds.minZ, cutout.minZ),
    maxZ: Math.min(bounds.maxZ, cutout.maxZ),
  };

  return hasPositiveArea(overlap) ? overlap : null;
};

const subtractCutout = (
  bounds: Bounds2D,
  cutout: RoomFloorCutout
): Bounds2D[] => {
  const overlap = clipCutoutToBounds(bounds, cutout);
  if (!overlap) {
    return [bounds];
  }

  const pieces: Bounds2D[] = [
    {
      minX: bounds.minX,
      maxX: overlap.minX,
      minZ: bounds.minZ,
      maxZ: bounds.maxZ,
    },
    {
      minX: overlap.maxX,
      maxX: bounds.maxX,
      minZ: bounds.minZ,
      maxZ: bounds.maxZ,
    },
    {
      minX: overlap.minX,
      maxX: overlap.maxX,
      minZ: bounds.minZ,
      maxZ: overlap.minZ,
    },
    {
      minX: overlap.minX,
      maxX: overlap.maxX,
      minZ: overlap.maxZ,
      maxZ: bounds.maxZ,
    },
  ];

  return pieces.filter(hasPositiveArea);
};

const getRoomTileBounds = (
  room: RoomDefinition,
  options: RoomFloorOptions,
  inset: number
): Bounds2D[] => {
  const roomBounds = {
    minX: room.bounds.minX + inset,
    maxX: room.bounds.maxX - inset,
    minZ: room.bounds.minZ + inset,
    maxZ: room.bounds.maxZ - inset,
  };

  if (!hasPositiveArea(roomBounds)) {
    return [];
  }

  const cutouts = [
    ...(options.cutouts ?? []),
    ...(options.cutoutsByRoom?.[room.id] ?? []),
  ];

  return cutouts.reduce<Bounds2D[]>(
    (pieces, cutout) =>
      pieces.flatMap((piece) => subtractCutout(piece, cutout)),
    [roomBounds]
  );
};

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

    getRoomTileBounds(room, options, inset).forEach((bounds, index) => {
      const width = bounds.maxX - bounds.minX;
      const depth = bounds.maxZ - bounds.minZ;
      const geometry = new BoxGeometry(width, thickness, depth);
      applyLightmapUv2(geometry);

      const mesh = new Mesh(
        geometry,
        resolveMaterial(room, options, defaultMaterial)
      );
      mesh.position.set(
        (bounds.minX + bounds.maxX) / 2,
        elevation - thickness / 2,
        (bounds.minZ + bounds.maxZ) / 2
      );
      mesh.name =
        index === 0 ? `${room.name} Floor` : `${room.name} Floor ${index + 1}`;
      mesh.receiveShadow = true;

      group.add(mesh);
      tiles.push({ roomId: room.id, mesh, bounds });
    });
  });

  return { group, tiles };
}
