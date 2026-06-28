import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  type ColorRepresentation,
} from 'three';

import type { RectCollider } from '../collision';
import { isLevelSourceId } from '../level/sourceIds';

export type LowerFloorFurnishingCategory =
  | 'living-room-seating'
  | 'kitchenette'
  | 'storage'
  | 'sleeping-nook'
  | 'plants-lighting-decor'
  | 'backyard';

export type LowerFloorRoomId = 'livingRoom' | 'kitchen' | 'studio' | 'backyard';

export interface LowerFloorFurnishingFootprint {
  width: number;
  depth: number;
}

export interface LowerFloorFurnishingDefinition {
  id: string;
  category: LowerFloorFurnishingCategory;
  roomId: LowerFloorRoomId;
  position: { x: number; y?: number; z: number };
  orientationRadians: number;
  solidFootprint?: LowerFloorFurnishingFootprint;
  solidAabb?: RectCollider;
  decorativeFootprint?: LowerFloorFurnishingFootprint;
  decorativeAabb?: RectCollider;
  kind: string;
  visual?: {
    color?: ColorRepresentation;
    accentColor?: ColorRepresentation;
    height?: number;
    decorativeHeight?: number;
    allowDecorativeOverlapWithSolid?: boolean;
    allowDecorativeOverlapWithSolids?: boolean;
  };
}

export interface DecorativeFootprintRecord {
  id: string;
  furnishingId: string;
  category: LowerFloorFurnishingCategory;
  roomId: LowerFloorRoomId;
  bounds: RectCollider;
  allowSolidOverlap: boolean;
}

export interface LowerFloorFurnishingCollider extends RectCollider {
  furnishingId: string;
  category: LowerFloorFurnishingCategory;
  roomId: LowerFloorRoomId;
  sourceId: string;
  debugName: string;
}

export interface LowerFloorFurnishingValidationOptions {
  roomBounds?: Partial<Record<LowerFloorRoomId, RectCollider>>;
  reservedBlockers?: readonly RectCollider[];
  tolerance?: number;
}

export interface LowerFloorFurnishingsCreateOptions
  extends LowerFloorFurnishingValidationOptions {
  definitions?: readonly LowerFloorFurnishingDefinition[];
}

export interface LowerFloorFurnishingsBuild {
  group: Group;
  colliders: LowerFloorFurnishingCollider[];
  decorativeFootprints: DecorativeFootprintRecord[];
}

export const LOWER_FLOOR_ROOM_BOUNDS: Record<LowerFloorRoomId, RectCollider> = {
  livingRoom: { minX: -32, maxX: 32, minZ: -32, maxZ: -8 },
  kitchen: { minX: -32, maxX: -4, minZ: -8, maxZ: 16 },
  studio: { minX: -4, maxX: 32, minZ: -8, maxZ: 16 },
  backyard: { minX: -32, maxX: 32, minZ: 16, maxZ: 32 },
};

export const LOWER_FLOOR_RESERVED_BLOCKERS: readonly RectCollider[] = [
  { minX: -22, maxX: -14, minZ: -9.2, maxZ: -6.8 },
  { minX: 11, maxX: 19, minZ: -9.2, maxZ: -6.8 },
  { minX: -5.2, maxX: -2.8, minZ: 0, maxZ: 8 },
  { minX: -22, maxX: -14, minZ: 14.8, maxZ: 17.2 },
  { minX: 11, maxX: 19, minZ: 14.8, maxZ: 17.2 },
  { minX: -32.0, maxX: -30.9, minZ: -23.2, maxZ: -16.8 },
  { minX: -24.74, maxX: -19.94, minZ: -24.61, maxZ: -20.61 },
  { minX: -12.34, maxX: -5.14, minZ: -26.12, maxZ: -19.72 },
  { minX: -24.0, maxX: -19.2, minZ: -0.77, maxZ: 4.03 },
  { minX: 26.4, maxX: 31.2, minZ: -24.4, maxZ: -21.2 },
  { minX: 8.4, maxX: 16.4, minZ: -27.0, maxZ: -9.4 },
  { minX: 15.8, maxX: 20.4, minZ: -1.1, maxZ: 3.8 },
  { minX: 0.0, maxX: 6.4, minZ: -2.2, maxZ: 4.6 },
  { minX: -18.5, maxX: -10.0, minZ: 18.0, maxZ: 24.2 },
  { minX: 10.0, maxX: 18.2, minZ: 22.4, maxZ: 30.4 },
];

export const DEFAULT_LOWER_FLOOR_FURNISHINGS: readonly LowerFloorFurnishingDefinition[] =
  [
    {
      id: 'living-room-media-sofa',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -26.1, z: -19.8 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 1.6, depth: 4.6 },
      solidAabb: { minX: -26.9, maxX: -25.3, minZ: -22.1, maxZ: -17.5 },
      kind: 'media-sofa',
      visual: { color: 0x3d5168, accentColor: 0xb9c5d6, height: 0.85 },
    },
    {
      id: 'living-room-coffee-table',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -22.5, z: -18.4 },
      orientationRadians: 0,
      solidFootprint: { width: 2.2, depth: 1.2 },
      solidAabb: { minX: -23.6, maxX: -21.4, minZ: -19.0, maxZ: -17.8 },
      kind: 'coffee-table',
      visual: { color: 0x6b4b34, accentColor: 0x1f2328, height: 0.42 },
    },
    {
      id: 'living-room-side-table',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -26.0, z: -23.4 },
      orientationRadians: 0,
      solidFootprint: { width: 0.8, depth: 0.8 },
      solidAabb: { minX: -26.4, maxX: -25.6, minZ: -23.8, maxZ: -23.0 },
      kind: 'side-table',
      visual: { color: 0x58412f, accentColor: 0xcaa66a, height: 0.55 },
    },
    {
      id: 'living-room-lounge-chair-north',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -28.3, z: -15.2 },
      orientationRadians: Math.PI * 0.72,
      solidFootprint: { width: 1.4, depth: 1.4 },
      solidAabb: { minX: -29.0, maxX: -27.6, minZ: -15.9, maxZ: -14.5 },
      kind: 'lounge-chair',
      visual: { color: 0x405f65, accentColor: 0xd2b88c, height: 0.78 },
    },
    {
      id: 'living-room-lounge-chair-east',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -24.6, z: -14.7 },
      orientationRadians: Math.PI * 0.82,
      solidFootprint: { width: 1.4, depth: 1.4 },
      solidAabb: { minX: -25.3, maxX: -23.9, minZ: -15.4, maxZ: -14.0 },
      kind: 'lounge-chair',
      visual: { color: 0x405f65, accentColor: 0xd2b88c, height: 0.78 },
    },
    {
      id: 'living-room-floor-lamp',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -28.9, z: -17.0 },
      orientationRadians: 0,
      solidFootprint: { width: 0.55, depth: 0.55 },
      solidAabb: { minX: -29.175, maxX: -28.625, minZ: -17.275, maxZ: -16.725 },
      kind: 'floor-lamp',
      visual: { color: 0x2b3038, accentColor: 0xffd27a, height: 2.25 },
    },
    {
      id: 'living-room-media-rug',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -24.7, z: -18.5 },
      orientationRadians: 0,
      decorativeFootprint: { width: 7.0, depth: 5.8 },
      decorativeAabb: { minX: -28.2, maxX: -21.2, minZ: -21.4, maxZ: -15.6 },
      kind: 'media-rug',
      visual: {
        color: 0x2f3f4b,
        accentColor: 0x7c93a6,
        decorativeHeight: 0.025,
        allowDecorativeOverlapWithSolids: true,
      },
    },
  ];

export function createAabbFromCenterSize(
  center: { x: number; z: number },
  size: LowerFloorFurnishingFootprint
): RectCollider {
  return {
    minX: center.x - size.width / 2,
    maxX: center.x + size.width / 2,
    minZ: center.z - size.depth / 2,
    maxZ: center.z + size.depth / 2,
  };
}

export function rectanglesOverlap(
  a: RectCollider,
  b: RectCollider,
  tolerance = 0
): boolean {
  return !(
    a.maxX <= b.minX + tolerance ||
    a.minX >= b.maxX - tolerance ||
    a.maxZ <= b.minZ + tolerance ||
    a.minZ >= b.maxZ - tolerance
  );
}

export function validateLowerFloorFurnishingPlan(
  definitions: readonly LowerFloorFurnishingDefinition[],
  options: LowerFloorFurnishingValidationOptions = {}
): void {
  const roomBounds = { ...LOWER_FLOOR_ROOM_BOUNDS, ...options.roomBounds };
  const blockers = options.reservedBlockers ?? LOWER_FLOOR_RESERVED_BLOCKERS;
  const tolerance = options.tolerance ?? 0.001;
  definitions.forEach((definition) => {
    if (!isLevelSourceId(definition.id)) {
      throw new Error(`${definition.id} is not a valid furnishing ID.`);
    }
  });

  const solids = definitions.flatMap((definition) => {
    if (!definition.solidFootprint) return [];
    const bounds =
      definition.solidAabb ??
      createRotatedAabb(definition, definition.solidFootprint);
    const room = roomBounds[definition.roomId];
    if (!hasPositiveArea(bounds))
      throw new Error(`${definition.id} has an empty solid footprint.`);
    if (!containsBounds(room, bounds, tolerance)) {
      throw new Error(
        `${definition.id} solid footprint is outside ${definition.roomId}.`
      );
    }
    blockers.forEach((blocker, index) => {
      if (rectanglesOverlap(bounds, blocker, tolerance)) {
        throw new Error(`${definition.id} overlaps reserved blocker ${index}.`);
      }
    });
    return [{ definition, bounds }];
  });

  solids.forEach((solid, index) => {
    solids.slice(index + 1).forEach((other) => {
      if (rectanglesOverlap(solid.bounds, other.bounds, tolerance)) {
        throw new Error(
          `${solid.definition.id} overlaps ${other.definition.id}.`
        );
      }
    });
  });

  definitions.forEach((definition) => {
    if (!definition.decorativeFootprint) return;
    const bounds =
      definition.decorativeAabb ??
      createRotatedAabb(definition, definition.decorativeFootprint);
    if (!hasPositiveArea(bounds)) {
      throw new Error(`${definition.id} has an empty decorative footprint.`);
    }
    if (!containsBounds(roomBounds[definition.roomId], bounds, tolerance)) {
      throw new Error(
        `${definition.id} decorative footprint is outside ${definition.roomId}.`
      );
    }
    solids.forEach((solid) => {
      const isAssociatedSolid = solid.definition.id === definition.id;
      if (definition.visual?.allowDecorativeOverlapWithSolids) {
        return;
      }
      if (
        isAssociatedSolid &&
        definition.visual?.allowDecorativeOverlapWithSolid
      ) {
        return;
      }
      if (rectanglesOverlap(bounds, solid.bounds, tolerance)) {
        throw new Error(
          `${definition.id} decorative footprint overlaps ${solid.definition.id}.`
        );
      }
    });
  });
}

export function createLowerFloorFurnishings(
  options: LowerFloorFurnishingsCreateOptions = {}
): LowerFloorFurnishingsBuild {
  const definitions = options.definitions ?? DEFAULT_LOWER_FLOOR_FURNISHINGS;
  validateLowerFloorFurnishingPlan(definitions, options);

  const group = new Group();
  group.name = 'LowerFloorFurnishings';
  const colliders: LowerFloorFurnishingCollider[] = [];
  const decorativeFootprints: DecorativeFootprintRecord[] = [];

  definitions.forEach((definition) => {
    const furnishing = new Group();
    furnishing.name = `Furnishing:${definition.id}`;
    furnishing.position.set(
      definition.position.x,
      definition.position.y ?? 0,
      definition.position.z
    );
    furnishing.rotation.y = definition.orientationRadians;

    if (definition.solidFootprint) {
      furnishing.add(createSolidPrimitive(definition));
      const bounds =
        definition.solidAabb ??
        createRotatedAabb(definition, definition.solidFootprint);
      colliders.push({
        ...bounds,
        furnishingId: definition.id,
        category: definition.category,
        roomId: definition.roomId,
        sourceId: `ground.furnishings.${definition.category}.${definition.id}.generated_collider`,
        debugName: `LowerFloorFurnishingCollider:${definition.id}`,
      });
    }

    if (definition.decorativeFootprint) {
      furnishing.add(createDecorativePrimitive(definition));
      decorativeFootprints.push({
        id: `DecorativeFootprint:${definition.id}`,
        furnishingId: definition.id,
        category: definition.category,
        roomId: definition.roomId,
        bounds:
          definition.decorativeAabb ??
          createRotatedAabb(definition, definition.decorativeFootprint),
        allowSolidOverlap:
          definition.visual?.allowDecorativeOverlapWithSolids ??
          definition.visual?.allowDecorativeOverlapWithSolid ??
          false,
      });
    }

    group.add(furnishing);
  });

  return { group, colliders, decorativeFootprints };
}

function createSolidPrimitive(
  definition: LowerFloorFurnishingDefinition
): Group {
  if (definition.kind === 'media-sofa') return createMediaSofa(definition);
  if (definition.kind === 'coffee-table' || definition.kind === 'side-table')
    return createTable(definition);
  if (definition.kind === 'lounge-chair') return createLoungeChair(definition);
  if (definition.kind === 'floor-lamp') return createFloorLamp(definition);

  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const height = definition.visual?.height ?? 0.8;
  const material = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x6f7f92,
    roughness: 0.7,
  });
  const accent = new MeshStandardMaterial({
    color: definition.visual?.accentColor ?? 0x9aa8b7,
    roughness: 0.64,
  });
  const group = new Group();
  const body = new Mesh(
    new BoxGeometry(footprint.width, height, footprint.depth),
    material
  );
  body.name = `Furnishing:${definition.id}:body`;
  body.position.y = height / 2;
  group.add(body);
  const trim = new Mesh(
    new BoxGeometry(footprint.width + 0.08, 0.08, 0.08),
    accent
  );
  trim.name = `Furnishing:${definition.id}:trim`;
  trim.position.set(0, height + 0.04, -footprint.depth / 2);
  group.add(trim);
  if (definition.kind.includes('plant') || definition.kind.includes('lamp')) {
    const base = new Mesh(
      new CylinderGeometry(
        footprint.width / 3,
        footprint.width / 2.8,
        height * 0.55,
        16
      ),
      material
    );
    base.name = `Furnishing:${definition.id}:cylinderBase`;
    base.position.y = height * 0.275;
    group.add(base);
  }
  return group;
}

function createMediaSofa(definition: LowerFloorFurnishingDefinition): Group {
  const group = new Group();
  const baseMaterial = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x3d5168,
    roughness: 0.78,
  });
  const pillowMaterial = new MeshStandardMaterial({
    color: definition.visual?.accentColor ?? 0xb9c5d6,
    roughness: 0.82,
  });
  addBox(group, definition, 'seat', 1.55, 0.28, 4.45, 0, 0.36, 0, baseMaterial);
  addBox(
    group,
    definition,
    'back',
    0.24,
    0.78,
    4.55,
    0.68,
    0.72,
    0,
    baseMaterial
  );
  addBox(
    group,
    definition,
    'arm-north',
    1.4,
    0.58,
    0.22,
    0,
    0.58,
    -2.18,
    baseMaterial
  );
  addBox(
    group,
    definition,
    'arm-south',
    1.4,
    0.58,
    0.22,
    0,
    0.58,
    2.18,
    baseMaterial
  );
  [-1.35, 0, 1.35].forEach((z, index) => {
    addBox(
      group,
      definition,
      `back-pillow-${index}`,
      0.18,
      0.52,
      1.06,
      0.52,
      0.82,
      z,
      pillowMaterial
    );
    addBox(
      group,
      definition,
      `seat-cushion-${index}`,
      1.16,
      0.12,
      1.14,
      -0.12,
      0.56,
      z,
      pillowMaterial
    );
  });
  [-0.54, 0.54].forEach((x) =>
    [-1.8, 1.8].forEach((z, index) =>
      addBox(
        group,
        definition,
        `foot-${x}-${index}`,
        0.12,
        0.18,
        0.12,
        x,
        0.09,
        z,
        baseMaterial
      )
    )
  );
  return group;
}

function createTable(definition: LowerFloorFurnishingDefinition): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const height = definition.visual?.height ?? 0.45;
  const group = new Group();
  const topMaterial = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x6b4b34,
    roughness: 0.62,
  });
  const legMaterial = new MeshStandardMaterial({
    color: definition.visual?.accentColor ?? 0x1f2328,
    roughness: 0.68,
  });
  addBox(
    group,
    definition,
    'top',
    footprint.width,
    0.12,
    footprint.depth,
    0,
    height,
    0,
    topMaterial
  );
  const insetX = footprint.width / 2 - 0.18;
  const insetZ = footprint.depth / 2 - 0.18;
  [-insetX, insetX].forEach((x) =>
    [-insetZ, insetZ].forEach((z, index) =>
      addBox(
        group,
        definition,
        `leg-${x}-${index}`,
        0.08,
        height,
        0.08,
        x,
        height / 2,
        z,
        legMaterial
      )
    )
  );
  return group;
}

function createLoungeChair(definition: LowerFloorFurnishingDefinition): Group {
  const group = new Group();
  const material = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x405f65,
    roughness: 0.76,
  });
  const accent = new MeshStandardMaterial({
    color: definition.visual?.accentColor ?? 0xd2b88c,
    roughness: 0.72,
  });
  addBox(group, definition, 'seat', 1.18, 0.22, 1.05, 0, 0.34, 0, material);
  addBox(group, definition, 'back', 1.18, 0.62, 0.18, 0, 0.66, 0.48, material);
  addBox(group, definition, 'pillow', 0.82, 0.32, 0.16, 0, 0.74, 0.36, accent);
  return group;
}

function createFloorLamp(definition: LowerFloorFurnishingDefinition): Group {
  const group = new Group();
  const metal = new MeshStandardMaterial({ color: 0x2b3038, roughness: 0.52 });
  const shade = new MeshStandardMaterial({
    color: definition.visual?.accentColor ?? 0xffd27a,
    emissive: definition.visual?.accentColor ?? 0xffd27a,
    emissiveIntensity: 0.35,
    roughness: 0.58,
  });
  const base = new Mesh(new CylinderGeometry(0.22, 0.26, 0.08, 16), metal);
  base.name = `Furnishing:${definition.id}:weightedBase`;
  base.position.y = 0.04;
  group.add(base);
  const pole = new Mesh(new CylinderGeometry(0.035, 0.035, 1.75, 12), metal);
  pole.name = `Furnishing:${definition.id}:pole`;
  pole.position.y = 0.9;
  group.add(pole);
  const lampShade = new Mesh(new CylinderGeometry(0.32, 0.42, 0.42, 16), shade);
  lampShade.name = `Furnishing:${definition.id}:shade`;
  lampShade.position.y = 1.88;
  group.add(lampShade);
  const bulb = new PointLight(0xffd27a, 0.45, 5);
  bulb.name = `Furnishing:${definition.id}:warmBulb`;
  bulb.position.y = 1.82;
  group.add(bulb);
  return group;
}

function addBox(
  group: Group,
  definition: LowerFloorFurnishingDefinition,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: MeshStandardMaterial
): void {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
  mesh.name = `Furnishing:${definition.id}:${name}`;
  mesh.position.set(x, y, z);
  group.add(mesh);
}

function createDecorativePrimitive(
  definition: LowerFloorFurnishingDefinition
): Mesh {
  const footprint = definition.decorativeFootprint ?? { width: 1, depth: 1 };
  const height = definition.visual?.decorativeHeight ?? 0.035;
  const material = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x56616f,
    roughness: 0.85,
  });
  const mesh = new Mesh(
    new BoxGeometry(footprint.width, height, footprint.depth),
    material
  );
  mesh.name = `Furnishing:${definition.id}:decorativeFootprint`;
  mesh.position.y = height / 2;
  return mesh;
}

function createRotatedAabb(
  definition: LowerFloorFurnishingDefinition,
  footprint: LowerFloorFurnishingFootprint
): RectCollider {
  const cos = Math.abs(Math.cos(definition.orientationRadians));
  const sin = Math.abs(Math.sin(definition.orientationRadians));
  return createAabbFromCenterSize(definition.position, {
    width: footprint.width * cos + footprint.depth * sin,
    depth: footprint.width * sin + footprint.depth * cos,
  });
}

function hasPositiveArea(bounds: RectCollider): boolean {
  return bounds.maxX > bounds.minX && bounds.maxZ > bounds.minZ;
}

function containsBounds(
  container: RectCollider,
  bounds: RectCollider,
  tolerance: number
): boolean {
  return (
    bounds.minX >= container.minX - tolerance &&
    bounds.maxX <= container.maxX + tolerance &&
    bounds.minZ >= container.minZ - tolerance &&
    bounds.maxZ <= container.maxZ + tolerance
  );
}
