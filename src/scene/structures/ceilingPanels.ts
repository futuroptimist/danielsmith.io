import {
  BoxGeometry,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Texture,
} from 'three';

import type { RoomDefinition } from '../../assets/floorPlan';
import { applyLightmapUv2 } from '../lighting/bakedLightmaps';

export interface RoomCeilingPanel {
  readonly roomId: string;
  readonly mesh: Mesh;
}

export interface RoomCeilingBuild {
  readonly group: Group;
  readonly panels: RoomCeilingPanel[];
}

export interface RoomCeilingOptions {
  /** Height where the panel should sit (center position). */
  readonly height?: number;
  /** Amount of inset from each wall to avoid intersecting trim/lighting. */
  readonly inset?: number;
  /** Physical thickness of the ceiling slab. */
  readonly thickness?: number;
  /**
   * Opacity for the ceiling material. Defaults to a low value so ceilings do not
   * visually occlude the ground floor from the top-down camera. Set to 1 for
   * fully opaque.
   */
  readonly opacity?: number;
  /**
   * Controls how much of the room LED color should influence the ceiling tint.
   * Values are clamped between 0 and 1.
   */
  readonly tintIntensity?: number;
  /** Shared material cloned per panel. */
  readonly material?: MeshStandardMaterial;
  /** Optional factory for bespoke materials per room. */
  readonly materialFactory?: (room: RoomDefinition) => MeshStandardMaterial;
  /** Optional baked lightmap applied to each ceiling panel. */
  readonly lightMap?: Texture;
  /** Intensity multiplier applied to the ceiling lightmap. */
  readonly lightMapIntensity?: number;
}

const DEFAULT_HEIGHT = 5.85;
const DEFAULT_INSET = 0.9;
const MIN_DIMENSION = 0.1;
const DEFAULT_THICKNESS = 0.3;
const BASE_COLOR = 0x1f2636;
const DEFAULT_TINT_INTENSITY = 0.28;
const DEFAULT_OPACITY = 0.08;

function applyLightMapOptions(
  material: MeshStandardMaterial,
  options: RoomCeilingOptions
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

function createMaterial(
  room: RoomDefinition,
  options: RoomCeilingOptions,
  defaultMaterial: MeshStandardMaterial
): MeshStandardMaterial {
  if (options.materialFactory) {
    const material = options.materialFactory(room);
    const opacity = MathUtils.clamp(options.opacity ?? DEFAULT_OPACITY, 0, 1);
    material.transparent = opacity < 1;
    material.opacity = opacity;
    // Transparent ceilings should not write depth so they don't occlude content below.
    material.depthWrite = !material.transparent ? true : false;
    applyLightMapOptions(material, options);
    return material;
  }
  if (options.material) {
    const material = options.material.clone();
    const opacity = MathUtils.clamp(options.opacity ?? DEFAULT_OPACITY, 0, 1);
    material.transparent = opacity < 1;
    material.opacity = opacity;
    material.depthWrite = !material.transparent ? true : false;
    applyLightMapOptions(material, options);
    return material;
  }

  const tint = MathUtils.clamp(
    options.tintIntensity ?? DEFAULT_TINT_INTENSITY,
    0,
    1
  );
  const material = defaultMaterial.clone();
  const color = new Color(BASE_COLOR);
  const ledColor = new Color(room.ledColor);
  color.lerp(ledColor, tint);
  material.color.copy(color);
  const opacity = MathUtils.clamp(options.opacity ?? DEFAULT_OPACITY, 0, 1);
  material.transparent = opacity < 1;
  material.opacity = opacity;
  material.depthWrite = !material.transparent ? true : false;
  applyLightMapOptions(material, options);
  return material;
}

export function createRoomCeilingPanels(
  rooms: RoomDefinition[],
  options: RoomCeilingOptions = {}
): RoomCeilingBuild {
  const group = new Group();
  group.name = 'GroundFloorCeilings';

  const panels: RoomCeilingPanel[] = [];
  const inset = Math.max(options.inset ?? DEFAULT_INSET, 0);
  const thickness = Math.max(
    options.thickness ?? DEFAULT_THICKNESS,
    MIN_DIMENSION
  );
  const height = options.height ?? DEFAULT_HEIGHT;
  const defaultMaterial =
    options.material ??
    new MeshStandardMaterial({
      color: BASE_COLOR,
      roughness: 0.6,
      metalness: 0.12,
      transparent: (options.opacity ?? DEFAULT_OPACITY) < 1,
      opacity: MathUtils.clamp(options.opacity ?? DEFAULT_OPACITY, 0, 1),
    });
  // See-through ceilings must not occlude geometry below.
  defaultMaterial.depthWrite = !defaultMaterial.transparent ? true : false;

  rooms.forEach((room) => {
    if (room.category === 'exterior') {
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
      createMaterial(room, options, defaultMaterial)
    );
    mesh.position.set(
      (room.bounds.minX + room.bounds.maxX) / 2,
      height,
      (room.bounds.minZ + room.bounds.maxZ) / 2
    );
    mesh.name = `${room.name} Ceiling`;
    mesh.receiveShadow = true;

    group.add(mesh);
    panels.push({ roomId: room.id, mesh });
  });

  return { group, panels };
}
