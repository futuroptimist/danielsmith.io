import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';

import type { RoomDefinition } from '../../assets/floorPlan';
import { applyLightmapUv2 } from '../lighting/bakedLightmaps';

export interface RoomFloorTile {
  readonly roomId: string;
  readonly mesh: Mesh;
}

export interface RoomFloorBuild {
  readonly group: Group;
  readonly tiles: RoomFloorTile[];
}

export interface RectangularFloorCutout {
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
  /** Rectangular openings to carve out of any intersecting room tile. */
  readonly cutouts?: RectangularFloorCutout[];
}

const DEFAULT_GROUP_NAME = 'RoomFloorTiles';
const DEFAULT_THICKNESS = 0.12;
const DEFAULT_INSET = 0;
const MIN_DIMENSION = 0.05;
const DEFAULT_COLOR = 0x2a3547;

function intersectCutout(
  bounds: RectangularFloorCutout,
  cutout: RectangularFloorCutout
): RectangularFloorCutout | null {
  const minX = Math.max(bounds.minX, cutout.minX);
  const maxX = Math.min(bounds.maxX, cutout.maxX);
  const minZ = Math.max(bounds.minZ, cutout.minZ);
  const maxZ = Math.min(bounds.maxZ, cutout.maxZ);

  if (maxX - minX <= MIN_DIMENSION || maxZ - minZ <= MIN_DIMENSION) {
    return null;
  }

  return { minX, maxX, minZ, maxZ };
}

function splitBoundsAroundCutout(
  bounds: RectangularFloorCutout,
  cutout: RectangularFloorCutout
): RectangularFloorCutout[] {
  const intersection = intersectCutout(bounds, cutout);
  if (!intersection) {
    return [bounds];
  }

  return [
    { ...bounds, maxX: intersection.minX },
    { ...bounds, minX: intersection.maxX },
    {
      minX: intersection.minX,
      maxX: intersection.maxX,
      minZ: bounds.minZ,
      maxZ: intersection.minZ,
    },
    {
      minX: intersection.minX,
      maxX: intersection.maxX,
      minZ: intersection.maxZ,
      maxZ: bounds.maxZ,
    },
  ].filter(
    (candidate) =>
      candidate.maxX - candidate.minX > MIN_DIMENSION &&
      candidate.maxZ - candidate.minZ > MIN_DIMENSION
  );
}

function getRoomTileBounds(
  room: RoomDefinition,
  inset: number,
  cutouts: readonly RectangularFloorCutout[]
): RectangularFloorCutout[] {
  const baseBounds = {
    minX: room.bounds.minX + inset,
    maxX: room.bounds.maxX - inset,
    minZ: room.bounds.minZ + inset,
    maxZ: room.bounds.maxZ - inset,
  };

  if (
    baseBounds.maxX - baseBounds.minX <= MIN_DIMENSION ||
    baseBounds.maxZ - baseBounds.minZ <= MIN_DIMENSION
  ) {
    return [];
  }

  return cutouts.reduce<RectangularFloorCutout[]>(
    (boundsList, cutout) =>
      boundsList.flatMap((bounds) => splitBoundsAroundCutout(bounds, cutout)),
    [baseBounds]
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

    const roomTileBounds = getRoomTileBounds(
      room,
      inset,
      options.cutouts ?? []
    );
    const material = resolveMaterial(room, options, defaultMaterial);

    roomTileBounds.forEach((bounds, index) => {
      const width = bounds.maxX - bounds.minX;
      const depth = bounds.maxZ - bounds.minZ;
      const geometry = new BoxGeometry(width, thickness, depth);
      applyLightmapUv2(geometry);

      const mesh = new Mesh(geometry, material);
      mesh.position.set(
        (bounds.minX + bounds.maxX) / 2,
        elevation - thickness / 2,
        (bounds.minZ + bounds.maxZ) / 2
      );
      mesh.name =
        roomTileBounds.length > 1
          ? `${room.name} Floor ${index + 1}`
          : `${room.name} Floor`;
      mesh.receiveShadow = true;

      group.add(mesh);
      tiles.push({ roomId: room.id, mesh });
    });
  });

  return { group, tiles };
}
