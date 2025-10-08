import { BoxGeometry, Color, Group, MathUtils, Mesh, MeshStandardMaterial } from 'three';

import type { RoomDefinition } from '../floorPlan';
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
   * Controls how much of the room LED color should influence the ceiling tint.
   * Values are clamped between 0 and 1.
   */
  readonly tintIntensity?: number;
  /** Shared material cloned per panel. */
  readonly material?: MeshStandardMaterial;
  /** Optional factory for bespoke materials per room. */
  readonly materialFactory?: (room: RoomDefinition) => MeshStandardMaterial;
}

const DEFAULT_HEIGHT = 5.85;
const DEFAULT_INSET = 0.9;
const MIN_DIMENSION = 0.1;
const DEFAULT_THICKNESS = 0.3;
const BASE_COLOR = 0x1f2636;
const DEFAULT_TINT_INTENSITY = 0.28;

function createMaterial(
  room: RoomDefinition,
  options: RoomCeilingOptions,
  defaultMaterial: MeshStandardMaterial
): MeshStandardMaterial {
  if (options.materialFactory) {
    return options.materialFactory(room);
  }
  if (options.material) {
    return options.material.clone();
  }

  const tint = MathUtils.clamp(options.tintIntensity ?? DEFAULT_TINT_INTENSITY, 0, 1);
  const material = defaultMaterial.clone();
  const color = new Color(BASE_COLOR);
  const ledColor = new Color(room.ledColor);
  color.lerp(ledColor, tint);
  material.color.copy(color);
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
  const thickness = Math.max(options.thickness ?? DEFAULT_THICKNESS, MIN_DIMENSION);
  const height = options.height ?? DEFAULT_HEIGHT;
  const defaultMaterial =
    options.material ??
    new MeshStandardMaterial({
      color: BASE_COLOR,
      roughness: 0.6,
      metalness: 0.12,
    });

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

    const mesh = new Mesh(geometry, createMaterial(room, options, defaultMaterial));
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
