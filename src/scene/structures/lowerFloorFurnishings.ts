import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type ColorRepresentation,
  type MeshStandardMaterialParameters,
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
  decorativeFootprint?: LowerFloorFurnishingFootprint;
  solidBounds?: RectCollider;
  decorativeBounds?: RectCollider;
  kind: string;
  visual?: {
    color?: ColorRepresentation;
    accentColor?: ColorRepresentation;
    height?: number;
    decorativeHeight?: number;
    allowDecorativeOverlapWithSolid?: boolean;
    allowDecorativeOverlapWithAnySolid?: boolean;
    allowSolidOverlapWithIds?: readonly string[];
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
      solidFootprint: { width: 4.6, depth: 1.6 },
      solidBounds: { minX: -26.9, maxX: -25.3, minZ: -22.1, maxZ: -17.5 },
      kind: 'media-sofa',
      visual: { color: 0x607084, accentColor: 0xd6c3a3, height: 0.78 },
    },
    {
      id: 'living-room-coffee-table',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -22.5, z: -18.4 },
      orientationRadians: 0,
      solidFootprint: { width: 2.2, depth: 1.2 },
      solidBounds: { minX: -23.6, maxX: -21.4, minZ: -19.0, maxZ: -17.8 },
      kind: 'coffee-table',
      visual: { color: 0x7a5538, accentColor: 0x2f2520, height: 0.42 },
    },
    {
      id: 'living-room-side-table',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -26.0, z: -23.4 },
      orientationRadians: 0,
      solidFootprint: { width: 0.8, depth: 0.8 },
      solidBounds: { minX: -26.4, maxX: -25.6, minZ: -23.8, maxZ: -23.0 },
      kind: 'side-table',
      visual: { color: 0x75513a, accentColor: 0x221d1a, height: 0.55 },
    },
    {
      id: 'living-room-lounge-chair-north',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -28.5, z: -22.8 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 1.4, depth: 1.4 },
      solidBounds: { minX: -29.2, maxX: -27.8, minZ: -23.5, maxZ: -22.1 },
      kind: 'lounge-chair',
      visual: { color: 0x76865f, accentColor: 0xd8c7a7, height: 0.72 },
    },
    {
      id: 'living-room-lounge-chair-east',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -26.1, z: -15.9 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 1.4, depth: 1.4 },
      solidBounds: { minX: -26.8, maxX: -25.4, minZ: -16.6, maxZ: -15.2 },
      kind: 'lounge-chair',
      visual: { color: 0x7d6f89, accentColor: 0xd8c7a7, height: 0.72 },
    },
    {
      id: 'living-room-floor-lamp',
      category: 'plants-lighting-decor',
      roomId: 'livingRoom',
      position: { x: -28.9, z: -17.0 },
      orientationRadians: 0,
      solidFootprint: { width: 0.55, depth: 0.55 },
      solidBounds: {
        minX: -29.175,
        maxX: -28.625,
        minZ: -17.275,
        maxZ: -16.725,
      },
      kind: 'floor-lamp',
      visual: { color: 0x2b2b2f, accentColor: 0xffd48a, height: 1.75 },
    },

    {
      id: 'kitchen-west-counter-run',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -31.0, z: 3.8 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 1.25, depth: 9.2 },
      solidBounds: { minX: -31.625, maxX: -30.375, minZ: -0.8, maxZ: 8.4 },
      kind: 'kitchen-counter-run',
      visual: {
        color: 0x5f6d76,
        accentColor: 0xd6d0c4,
        height: 0.92,
        allowSolidOverlapWithIds: ['kitchen-stove-cabinet'],
      },
    },
    {
      id: 'kitchen-fridge',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -31.0, z: -5.6 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 1.35, depth: 1.5 },
      solidBounds: { minX: -31.675, maxX: -30.325, minZ: -6.35, maxZ: -4.85 },
      kind: 'kitchen-fridge',
      visual: { color: 0xb8c4cc, accentColor: 0x26313a, height: 2.25 },
    },
    {
      id: 'kitchen-sink-cabinet',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -31.0, z: -2.0 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 1.2, depth: 1.8 },
      solidBounds: { minX: -31.6, maxX: -30.4, minZ: -2.9, maxZ: -1.1 },
      kind: 'kitchen-sink-cabinet',
      visual: { color: 0x52616b, accentColor: 0xb9d2dd, height: 0.95 },
    },
    {
      id: 'kitchen-stove-cabinet',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -31.0, z: 7.0 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 1.2, depth: 1.6 },
      solidBounds: { minX: -31.6, maxX: -30.4, minZ: 6.2, maxZ: 7.8 },
      kind: 'kitchen-stove-cabinet',
      visual: {
        color: 0x48545f,
        accentColor: 0x20252b,
        height: 0.95,
        allowSolidOverlapWithIds: ['kitchen-west-counter-run'],
      },
    },
    {
      id: 'kitchen-island',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -13.0, z: 10.9 },
      orientationRadians: 0,
      solidFootprint: { width: 4.8, depth: 1.6 },
      solidBounds: { minX: -15.4, maxX: -10.6, minZ: 10.1, maxZ: 11.7 },
      kind: 'kitchen-island',
      visual: { color: 0x5a6772, accentColor: 0xd4c5aa, height: 0.96 },
    },
    {
      id: 'kitchen-bar-stool-west',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -15.9, z: 12.9 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: -16.25, maxX: -15.55, minZ: 12.55, maxZ: 13.25 },
      kind: 'bar-stool',
      visual: { color: 0x2c3640, accentColor: 0xd2b27f, height: 0.82 },
    },
    {
      id: 'kitchen-bar-stool-east',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -10.1, z: 12.9 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: -10.45, maxX: -9.75, minZ: 12.55, maxZ: 13.25 },
      kind: 'bar-stool',
      visual: { color: 0x2c3640, accentColor: 0xd2b27f, height: 0.82 },
    },
    {
      id: 'kitchen-trash-drawer',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -30.8, z: 10.7 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 1.0, depth: 1.2 },
      solidBounds: { minX: -31.3, maxX: -30.3, minZ: 10.1, maxZ: 11.3 },
      kind: 'kitchen-trash-drawer',
      visual: { color: 0x4b5962, accentColor: 0x8fd0b3, height: 0.86 },
    },
    {
      id: 'living-room-media-rug',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -24.7, z: -18.5 },
      orientationRadians: 0,
      decorativeFootprint: { width: 7.0, depth: 5.8 },
      decorativeBounds: { minX: -28.2, maxX: -21.2, minZ: -21.4, maxZ: -15.6 },
      kind: 'media-rug',
      visual: {
        color: 0x384c5c,
        accentColor: 0xcaa66a,
        decorativeHeight: 0.025,
        allowDecorativeOverlapWithSolid: true,
        allowDecorativeOverlapWithAnySolid: true,
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
    const bounds = createRotatedAabb(definition, definition.solidFootprint);
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
      if (areSolidOverlapsAllowed(solid.definition, other.definition)) {
        return;
      }
      if (rectanglesOverlap(solid.bounds, other.bounds, tolerance)) {
        throw new Error(
          `${solid.definition.id} overlaps ${other.definition.id}.`
        );
      }
    });
  });

  definitions.forEach((definition) => {
    if (!definition.decorativeFootprint) return;
    const bounds = createRotatedAabb(
      definition,
      definition.decorativeFootprint
    );
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
      if (
        isAssociatedSolid &&
        definition.visual?.allowDecorativeOverlapWithSolid
      ) {
        return;
      }
      if (
        !isAssociatedSolid &&
        definition.visual?.allowDecorativeOverlapWithAnySolid
      )
        return;
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
      const bounds = createRotatedAabb(definition, definition.solidFootprint);
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
        bounds: createRotatedAabb(definition, definition.decorativeFootprint),
        allowSolidOverlap:
          definition.visual?.allowDecorativeOverlapWithSolid ||
          definition.visual?.allowDecorativeOverlapWithAnySolid ||
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
  if (definition.kind === 'coffee-table') return createCoffeeTable(definition);
  if (definition.kind === 'side-table') return createSideTable(definition);
  if (definition.kind === 'lounge-chair') return createLoungeChair(definition);
  if (definition.kind === 'floor-lamp') return createFloorLamp(definition);
  if (definition.kind === 'kitchen-counter-run')
    return createKitchenCounterRun(definition);
  if (definition.kind === 'kitchen-fridge')
    return createKitchenFridge(definition);
  if (definition.kind === 'kitchen-sink-cabinet')
    return createKitchenSinkCabinet(definition);
  if (definition.kind === 'kitchen-stove-cabinet')
    return createKitchenStoveCabinet(definition);
  if (definition.kind === 'kitchen-island')
    return createKitchenIsland(definition);
  if (definition.kind === 'bar-stool') return createBarStool(definition);
  if (definition.kind === 'kitchen-trash-drawer')
    return createKitchenTrashDrawer(definition);

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
  const footprint = definition.solidFootprint ?? { width: 4.6, depth: 1.6 };
  const backDepth = 0.22;
  const armWidth = 0.34;
  const rearZ = footprint.depth / 2 - backDepth / 2;
  const armX = footprint.width / 2 - armWidth / 2;
  const material = createMaterial(definition.visual?.color ?? 0x607084);
  const pillowMaterial = createMaterial(
    definition.visual?.accentColor ?? 0xd6c3a3
  );
  const footMaterial = createMaterial(0x24201c);
  const group = new Group();
  addBox(
    group,
    'seat',
    {
      width: footprint.width - 0.15,
      height: 0.34,
      depth: footprint.depth - 0.35,
    },
    material,
    [0, 0.34, 0]
  );
  addBox(
    group,
    'back',
    { width: footprint.width - 0.05, height: 0.82, depth: backDepth },
    material,
    [0, 0.72, rearZ]
  );
  addBox(
    group,
    'leftArm',
    { width: armWidth, height: 0.66, depth: footprint.depth - backDepth },
    material,
    [-armX, 0.56, 0]
  );
  addBox(
    group,
    'rightArm',
    { width: armWidth, height: 0.66, depth: footprint.depth - backDepth },
    material,
    [armX, 0.56, 0]
  );
  [-1.35, 0, 1.35].forEach((x, index) => {
    addBox(
      group,
      `backPillow${index}`,
      { width: 1.05, height: 0.5, depth: 0.16 },
      pillowMaterial,
      [x, 0.78, rearZ - backDepth / 2 - 0.08]
    );
  });
  [-1.8, 1.8].forEach((x, xIndex) => {
    [-0.5, 0.5].forEach((z, zIndex) => {
      addBox(
        group,
        `foot${xIndex * 2 + zIndex}`,
        { width: 0.16, height: 0.16, depth: 0.16 },
        footMaterial,
        [x, 0.08, z]
      );
    });
  });
  return group;
}

function createCoffeeTable(definition: LowerFloorFurnishingDefinition): Group {
  const topMaterial = createMaterial(definition.visual?.color ?? 0x7a5538);
  const legMaterial = createMaterial(
    definition.visual?.accentColor ?? 0x2f2520
  );
  const group = new Group();
  addBox(
    group,
    'top',
    { width: 2.2, height: 0.16, depth: 1.2 },
    topMaterial,
    [0, 0.42, 0]
  );
  [-0.9, 0.9].forEach((x, xIndex) => {
    [-0.42, 0.42].forEach((z, zIndex) => {
      addBox(
        group,
        `leg${xIndex * 2 + zIndex}`,
        { width: 0.12, height: 0.42, depth: 0.12 },
        legMaterial,
        [x, 0.21, z]
      );
    });
  });
  return group;
}

function createSideTable(definition: LowerFloorFurnishingDefinition): Group {
  const group = createCoffeeTable(definition);
  group.scale.set(0.36, 1.12, 0.67);
  return group;
}

function createLoungeChair(definition: LowerFloorFurnishingDefinition): Group {
  const material = createMaterial(definition.visual?.color ?? 0x76865f);
  const pillowMaterial = createMaterial(
    definition.visual?.accentColor ?? 0xd8c7a7
  );
  const group = new Group();
  addBox(
    group,
    'seat',
    { width: 1.2, height: 0.3, depth: 1.05 },
    material,
    [0, 0.32, 0.08]
  );
  addBox(
    group,
    'back',
    { width: 1.2, height: 0.72, depth: 0.18 },
    material,
    [0, 0.68, 0.52]
  );
  addBox(
    group,
    'pillow',
    { width: 0.92, height: 0.34, depth: 0.16 },
    pillowMaterial,
    [0, 0.72, 0.4]
  );
  return group;
}

function createFloorLamp(definition: LowerFloorFurnishingDefinition): Group {
  const poleMaterial = createMaterial(definition.visual?.color ?? 0x2b2b2f);
  const shadeMaterial = createMaterial(
    definition.visual?.accentColor ?? 0xffd48a,
    {
      emissive: definition.visual?.accentColor ?? 0xffd48a,
      emissiveIntensity: 0.35,
    }
  );
  const group = new Group();
  const base = new Mesh(
    new CylinderGeometry(0.22, 0.26, 0.08, 16),
    poleMaterial
  );
  base.name = `Furnishing:${definition.id}:base`;
  base.position.y = 0.04;
  group.add(base);
  const pole = new Mesh(
    new CylinderGeometry(0.035, 0.035, 1.28, 10),
    poleMaterial
  );
  pole.name = `Furnishing:${definition.id}:pole`;
  pole.position.y = 0.68;
  group.add(pole);
  const shade = new Mesh(
    new CylinderGeometry(0.28, 0.4, 0.36, 16),
    shadeMaterial
  );
  shade.name = `Furnishing:${definition.id}:shade`;
  shade.position.y = 1.44;
  group.add(shade);
  return group;
}

function createKitchenCounterRun(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 1.25, depth: 9.2 };
  const group = new Group();
  const cabinet = createMaterial(definition.visual?.color ?? 0x5f6d76);
  const counter = createMaterial(definition.visual?.accentColor ?? 0xd6d0c4);
  const backsplash = createMaterial(0x33404a);
  addBox(
    group,
    'baseCabinetRun',
    { width: footprint.width, height: 0.78, depth: footprint.depth },
    cabinet,
    [0, 0.39, 0]
  );
  addBox(
    group,
    'countertop',
    {
      width: footprint.width + 0.12,
      height: 0.12,
      depth: footprint.depth + 0.12,
    },
    counter,
    [0, 0.84, 0]
  );
  addBox(
    group,
    'backsplash',
    { width: footprint.width + 0.04, height: 0.62, depth: 0.08 },
    backsplash,
    [0, 1.15, -footprint.depth / 2 + 0.05]
  );
  [-3.0, -1.5, 0, 1.5, 3.0].forEach((z, index) => {
    addBox(
      group,
      `cabinetDoor${index}`,
      { width: 0.04, height: 0.42, depth: 1.0 },
      counter,
      [footprint.width / 2 + 0.021, 0.42, z]
    );
    addBox(
      group,
      `cabinetHandle${index}`,
      { width: 0.05, height: 0.05, depth: 0.42 },
      backsplash,
      [footprint.width / 2 + 0.052, 0.58, z]
    );
  });
  return group;
}

function createKitchenFridge(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 1.35, depth: 1.5 };
  const group = new Group();
  const body = createMaterial(definition.visual?.color ?? 0xb8c4cc, {
    metalness: 0.18,
  });
  const accent = createMaterial(definition.visual?.accentColor ?? 0x26313a);
  addBox(
    group,
    'fridgeBody',
    { width: footprint.width, height: 2.25, depth: footprint.depth },
    body,
    [0, 1.125, 0]
  );
  addBox(
    group,
    'fridgeDoorSplit',
    { width: footprint.width + 0.02, height: 0.025, depth: 0.035 },
    accent,
    [0, 1.32, footprint.depth / 2 + 0.02]
  );
  addBox(
    group,
    'fridgeHandle',
    { width: 0.08, height: 1.05, depth: 0.07 },
    accent,
    [footprint.width / 2 - 0.2, 1.25, footprint.depth / 2 + 0.05]
  );
  return group;
}

function createKitchenSinkCabinet(
  definition: LowerFloorFurnishingDefinition
): Group {
  const group = createKitchenCounterRun(definition);
  const metal = createMaterial(definition.visual?.accentColor ?? 0xb9d2dd, {
    metalness: 0.25,
  });
  addBox(
    group,
    'sinkBasin',
    { width: 0.62, height: 0.08, depth: 0.92 },
    metal,
    [0.08, 0.93, 0]
  );
  addBox(
    group,
    'faucetStem',
    { width: 0.06, height: 0.36, depth: 0.06 },
    metal,
    [-0.36, 1.13, 0]
  );
  addBox(
    group,
    'faucetSpout',
    { width: 0.38, height: 0.05, depth: 0.06 },
    metal,
    [-0.18, 1.3, 0]
  );
  return group;
}

function createKitchenStoveCabinet(
  definition: LowerFloorFurnishingDefinition
): Group {
  const group = createKitchenCounterRun(definition);
  const dark = createMaterial(definition.visual?.accentColor ?? 0x20252b);
  addBox(
    group,
    'ovenFace',
    { width: 0.08, height: 0.5, depth: 1.0 },
    dark,
    [0.62, 0.42, 0]
  );
  [-0.32, 0.32].forEach((z, index) => {
    const burner = new Mesh(new CylinderGeometry(0.22, 0.22, 0.025, 24), dark);
    burner.name = `FurnishingPart:cooktopBurner${index}`;
    burner.rotation.x = Math.PI / 2;
    burner.position.set(0.08, 0.93, z);
    group.add(burner);
  });
  addBox(
    group,
    'rangeHood',
    { width: 0.82, height: 0.16, depth: 1.0 },
    dark,
    [-0.1, 1.68, 0]
  );
  return group;
}

function createKitchenIsland(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 4.8, depth: 1.6 };
  const group = new Group();
  const base = createMaterial(definition.visual?.color ?? 0x5a6772);
  const top = createMaterial(definition.visual?.accentColor ?? 0xd4c5aa);
  addBox(
    group,
    'islandBase',
    { width: footprint.width, height: 0.82, depth: footprint.depth },
    base,
    [0, 0.41, 0]
  );
  addBox(
    group,
    'islandCounter',
    {
      width: footprint.width + 0.2,
      height: 0.14,
      depth: footprint.depth + 0.18,
    },
    top,
    [0, 0.9, 0]
  );
  [-1.6, 0, 1.6].forEach((x, index) =>
    addBox(
      group,
      `islandDrawer${index}`,
      { width: 1.1, height: 0.12, depth: 0.05 },
      top,
      [x, 0.58, footprint.depth / 2 + 0.03]
    )
  );
  return group;
}

function createBarStool(definition: LowerFloorFurnishingDefinition): Group {
  const group = new Group();
  const seatMaterial = createMaterial(definition.visual?.color ?? 0x2c3640);
  const legMaterial = createMaterial(
    definition.visual?.accentColor ?? 0xd2b27f
  );
  const seat = new Mesh(
    new CylinderGeometry(0.34, 0.34, 0.1, 24),
    seatMaterial
  );
  seat.name = 'FurnishingPart:roundSeat';
  seat.position.y = 0.82;
  group.add(seat);
  [-0.18, 0.18].forEach((x) =>
    [-0.18, 0.18].forEach((z) =>
      addBox(
        group,
        'stoolLeg',
        { width: 0.05, height: 0.78, depth: 0.05 },
        legMaterial,
        [x, 0.39, z]
      )
    )
  );
  return group;
}

function createKitchenTrashDrawer(
  definition: LowerFloorFurnishingDefinition
): Group {
  const group = createKitchenIsland(definition);
  const recycle = createMaterial(definition.visual?.accentColor ?? 0x8fd0b3);
  addBox(
    group,
    'recyclingPull',
    { width: 0.05, height: 0.08, depth: 0.55 },
    recycle,
    [0.52, 0.58, 0]
  );
  addBox(
    group,
    'trashDrawerSlot',
    { width: 0.06, height: 0.44, depth: 0.82 },
    recycle,
    [0.53, 0.36, 0]
  );
  return group;
}

function areSolidOverlapsAllowed(
  a: LowerFloorFurnishingDefinition,
  b: LowerFloorFurnishingDefinition
): boolean {
  return Boolean(
    a.visual?.allowSolidOverlapWithIds?.includes(b.id) ||
      b.visual?.allowSolidOverlapWithIds?.includes(a.id)
  );
}

function createMaterial(
  color: ColorRepresentation,
  options: MeshStandardMaterialParameters = {}
): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness: 0.72, ...options });
}

function addBox(
  group: Group,
  name: string,
  size: { width: number; height: number; depth: number },
  material: MeshStandardMaterial,
  position: [number, number, number]
): void {
  const mesh = new Mesh(
    new BoxGeometry(size.width, size.height, size.depth),
    material
  );
  mesh.name = `FurnishingPart:${name}`;
  mesh.position.set(...position);
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
  if (definition.solidFootprint === footprint && definition.solidBounds) {
    return definition.solidBounds;
  }
  if (
    definition.decorativeFootprint === footprint &&
    definition.decorativeBounds
  ) {
    return definition.decorativeBounds;
  }
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
