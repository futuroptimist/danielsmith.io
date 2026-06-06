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
  /** Optional rectangular floor voids that should not receive tile geometry. */
  readonly cutouts?: readonly Bounds2D[];
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

function getIntersection(a: Bounds2D, b: Bounds2D): Bounds2D | null {
  const minX = Math.max(a.minX, b.minX);
  const maxX = Math.min(a.maxX, b.maxX);
  const minZ = Math.max(a.minZ, b.minZ);
  const maxZ = Math.min(a.maxZ, b.maxZ);

  if (maxX - minX <= MIN_DIMENSION || maxZ - minZ <= MIN_DIMENSION) {
    return null;
  }

  return { minX, maxX, minZ, maxZ };
}

function subtractCutout(rect: Bounds2D, cutout: Bounds2D): Bounds2D[] {
  const overlap = getIntersection(rect, cutout);
  if (!overlap) {
    return [rect];
  }

  const pieces: Bounds2D[] = [];
  const pushPiece = (piece: Bounds2D) => {
    if (
      piece.maxX - piece.minX > MIN_DIMENSION &&
      piece.maxZ - piece.minZ > MIN_DIMENSION
    ) {
      pieces.push(piece);
    }
  };

  pushPiece({
    minX: rect.minX,
    maxX: rect.maxX,
    minZ: rect.minZ,
    maxZ: overlap.minZ,
  });
  pushPiece({
    minX: rect.minX,
    maxX: rect.maxX,
    minZ: overlap.maxZ,
    maxZ: rect.maxZ,
  });
  pushPiece({
    minX: rect.minX,
    maxX: overlap.minX,
    minZ: overlap.minZ,
    maxZ: overlap.maxZ,
  });
  pushPiece({
    minX: overlap.maxX,
    maxX: rect.maxX,
    minZ: overlap.minZ,
    maxZ: overlap.maxZ,
  });

  return pieces;
}

function applyCutouts(
  rect: Bounds2D,
  cutouts: readonly Bounds2D[]
): Bounds2D[] {
  return cutouts.reduce<Bounds2D[]>(
    (pieces, cutout) => {
      return pieces.flatMap((piece) => subtractCutout(piece, cutout));
    },
    [rect]
  );
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

    const roomRect = {
      minX: room.bounds.minX + inset,
      maxX: room.bounds.maxX - inset,
      minZ: room.bounds.minZ + inset,
      maxZ: room.bounds.maxZ - inset,
    };

    const pieces = applyCutouts(roomRect, options.cutouts ?? []);
    const material = resolveMaterial(room, options, defaultMaterial);

    pieces.forEach((piece, index) => {
      const width = piece.maxX - piece.minX;
      const depth = piece.maxZ - piece.minZ;

      if (width <= MIN_DIMENSION || depth <= MIN_DIMENSION) {
        return;
      }

      const geometry = new BoxGeometry(width, thickness, depth);
      applyLightmapUv2(geometry);

      const mesh = new Mesh(geometry, material);
      mesh.position.set(
        (piece.minX + piece.maxX) / 2,
        elevation - thickness / 2,
        (piece.minZ + piece.maxZ) / 2
      );
      mesh.name =
        pieces.length > 1
          ? `${room.name} Floor ${index + 1}`
          : `${room.name} Floor`;
      mesh.receiveShadow = true;

      group.add(mesh);
      tiles.push({ roomId: room.id, mesh });
    });
  });

  return { group, tiles };
}
