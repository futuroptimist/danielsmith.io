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

    const width = room.bounds.maxX - room.bounds.minX - inset * 2;
    const depth = room.bounds.maxZ - room.bounds.minZ - inset * 2;

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
      (room.bounds.minX + room.bounds.maxX) / 2,
      elevation - thickness / 2,
      (room.bounds.minZ + room.bounds.maxZ) / 2
    );
    mesh.name = `${room.name} Floor`;
    mesh.receiveShadow = true;

    group.add(mesh);
    tiles.push({ roomId: room.id, mesh });
  });

  return { group, tiles };
}
