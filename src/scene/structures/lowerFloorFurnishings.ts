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
        color: 0x687282,
        accentColor: 0xd8ccb8,
        height: 0.9,
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
      visual: { color: 0xc7d0d6, accentColor: 0x35404a, height: 2.35 },
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
      visual: {
        color: 0x667382,
        accentColor: 0xd7dce0,
        height: 0.95,
      },
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
        color: 0x5e6672,
        accentColor: 0x1d232b,
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
      visual: { color: 0x526171, accentColor: 0xd0bea2, height: 0.92 },
    },
    {
      id: 'kitchen-bar-stool-west',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -15.9, z: 12.9 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: -16.25, maxX: -15.55, minZ: 12.55, maxZ: 13.25 },
      kind: 'kitchen-bar-stool',
      visual: { color: 0x2f3740, accentColor: 0xc28d52, height: 0.86 },
    },
    {
      id: 'kitchen-bar-stool-east',
      category: 'kitchenette',
      roomId: 'kitchen',
      position: { x: -10.1, z: 12.9 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: -10.45, maxX: -9.75, minZ: 12.55, maxZ: 13.25 },
      kind: 'kitchen-bar-stool',
      visual: { color: 0x2f3740, accentColor: 0xc28d52, height: 0.86 },
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
      visual: { color: 0x586575, accentColor: 0x8fd0a6, height: 0.82 },
    },

    {
      id: 'living-room-south-bookcase-west',
      category: 'storage',
      roomId: 'livingRoom',
      position: { x: -24.0, z: -31.2 },
      orientationRadians: 0,
      solidFootprint: { width: 4.8, depth: 0.75 },
      solidBounds: { minX: -26.4, maxX: -21.6, minZ: -31.575, maxZ: -30.825 },
      kind: 'storage-bookcase',
      visual: { color: 0x4f3828, accentColor: 0xb88a52, height: 1.35 },
    },
    {
      id: 'living-room-south-open-shelf',
      category: 'storage',
      roomId: 'livingRoom',
      position: { x: -15.5, z: -31.2 },
      orientationRadians: 0,
      solidFootprint: { width: 4.5, depth: 0.75 },
      solidBounds: { minX: -17.75, maxX: -13.25, minZ: -31.575, maxZ: -30.825 },
      kind: 'storage-open-shelf',
      visual: { color: 0x5c4a3c, accentColor: 0x7c91a5, height: 1.18 },
    },
    {
      id: 'living-room-drawer-console',
      category: 'storage',
      roomId: 'livingRoom',
      position: { x: -2.5, z: -31.1 },
      orientationRadians: 0,
      solidFootprint: { width: 4.0, depth: 0.8 },
      solidBounds: { minX: -4.5, maxX: -0.5, minZ: -31.5, maxZ: -30.7 },
      kind: 'storage-drawer-console',
      visual: { color: 0x4b5563, accentColor: 0xc4955a, height: 0.82 },
    },
    {
      id: 'studio-north-bookcase-east',
      category: 'storage',
      roomId: 'studio',
      position: { x: 26.6, z: 15.1 },
      orientationRadians: 0,
      solidFootprint: { width: 4.8, depth: 0.8 },
      solidBounds: { minX: 24.2, maxX: 29.0, minZ: 14.7, maxZ: 15.5 },
      kind: 'storage-tall-bookcase',
      visual: { color: 0x3f4a56, accentColor: 0xa66f43, height: 2.15 },
    },
    {
      id: 'studio-drafting-drawers',
      category: 'storage',
      roomId: 'studio',
      position: { x: 5.8, z: 14.9 },
      orientationRadians: 0,
      solidFootprint: { width: 4.8, depth: 0.8 },
      solidBounds: { minX: 3.4, maxX: 8.2, minZ: 14.5, maxZ: 15.3 },
      kind: 'storage-drafting-drawers',
      visual: { color: 0x56616f, accentColor: 0xd8ccb8, height: 0.78 },
    },
    {
      id: 'studio-east-dresser',
      category: 'storage',
      roomId: 'studio',
      position: { x: 31.0, z: 4.1 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 1.0, depth: 3.2 },
      solidBounds: { minX: 30.5, maxX: 31.5, minZ: 2.5, maxZ: 5.7 },
      kind: 'storage-east-dresser',
      visual: { color: 0x4d3a2b, accentColor: 0xb8c0c8, height: 1.05 },
    },
    {
      id: 'studio-daybed',
      category: 'sleeping-nook',
      roomId: 'studio',
      position: { x: 27.6, z: 10.6 },
      orientationRadians: -Math.PI / 2,
      solidFootprint: { width: 3.8, depth: 2.0 },
      solidBounds: { minX: 25.7, maxX: 29.5, minZ: 9.6, maxZ: 11.6 },
      kind: 'sleeping-daybed',
      visual: { color: 0x6f7f92, accentColor: 0xd8c7a7, height: 0.72 },
    },
    {
      id: 'studio-nightstand-south',
      category: 'sleeping-nook',
      roomId: 'studio',
      position: { x: 27.6, z: 8.6 },
      orientationRadians: 0,
      solidFootprint: { width: 0.8, depth: 0.8 },
      solidBounds: { minX: 27.2, maxX: 28.0, minZ: 8.2, maxZ: 9.0 },
      kind: 'sleeping-nightstand-lamp',
      visual: { color: 0x4d3a2b, accentColor: 0xffd48a, height: 0.62 },
    },
    {
      id: 'studio-nightstand-north',
      category: 'sleeping-nook',
      roomId: 'studio',
      position: { x: 27.6, z: 12.6 },
      orientationRadians: 0,
      solidFootprint: { width: 0.8, depth: 0.8 },
      solidBounds: { minX: 27.2, maxX: 28.0, minZ: 12.2, maxZ: 13.0 },
      kind: 'sleeping-nightstand-books',
      visual: { color: 0x4d3a2b, accentColor: 0xb8c0c8, height: 0.62 },
    },
    {
      id: 'studio-reading-chair',
      category: 'sleeping-nook',
      roomId: 'studio',
      position: { x: 22.2, z: 12.6 },
      orientationRadians: Math.PI * 0.3,
      solidFootprint: { width: 1.4, depth: 1.4 },
      solidBounds: { minX: 21.5, maxX: 22.9, minZ: 11.9, maxZ: 13.3 },
      kind: 'sleeping-reading-chair',
      visual: { color: 0x7d6f89, accentColor: 0xd8c7a7, height: 0.82 },
    },
    {
      id: 'studio-bedside-rug',
      category: 'sleeping-nook',
      roomId: 'studio',
      position: { x: 25.5, z: 10.8 },
      orientationRadians: 0,
      decorativeFootprint: { width: 4.8, depth: 3.0 },
      decorativeBounds: { minX: 23.1, maxX: 27.9, minZ: 9.3, maxZ: 12.3 },
      kind: 'sleeping-bedside-rug',
      visual: {
        color: 0x42546a,
        accentColor: 0xd6c3a3,
        decorativeHeight: 0.025,
        allowDecorativeOverlapWithAnySolid: true,
      },
    },

    {
      id: 'living-room-large-plant',
      category: 'plants-lighting-decor',
      roomId: 'livingRoom',
      position: { x: -28.6, z: -26.2 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: -28.95, maxX: -28.25, minZ: -26.55, maxZ: -25.85 },
      kind: 'large-potted-plant',
      visual: { color: 0x5f4734, accentColor: 0x4f8f52, height: 1.65 },
    },
    {
      id: 'living-room-plant-stool',
      category: 'plants-lighting-decor',
      roomId: 'livingRoom',
      position: { x: 5.8, z: -30.8 },
      orientationRadians: 0,
      solidFootprint: { width: 1.0, depth: 1.0 },
      solidBounds: { minX: 5.3, maxX: 6.3, minZ: -31.3, maxZ: -30.3 },
      kind: 'plant-stool',
      visual: { color: 0x6c4c32, accentColor: 0x66a15e, height: 1.15 },
    },
    {
      id: 'studio-floor-lamp',
      category: 'plants-lighting-decor',
      roomId: 'studio',
      position: { x: 24.4, z: 14.1 },
      orientationRadians: 0,
      solidFootprint: { width: 0.55, depth: 0.55 },
      solidBounds: { minX: 24.125, maxX: 24.675, minZ: 13.825, maxZ: 14.375 },
      kind: 'floor-lamp',
      visual: { color: 0x2b2b2f, accentColor: 0xffd48a, height: 1.75 },
    },
    {
      id: 'studio-monstera',
      category: 'plants-lighting-decor',
      roomId: 'studio',
      position: { x: 30.6, z: -5.4 },
      orientationRadians: 0,
      solidFootprint: { width: 1.0, depth: 1.0 },
      solidBounds: { minX: 30.1, maxX: 31.1, minZ: -5.9, maxZ: -4.9 },
      kind: 'monstera-plant',
      visual: { color: 0x5f4734, accentColor: 0x3f8a4c, height: 1.55 },
    },
    {
      id: 'kitchen-herb-planter',
      category: 'plants-lighting-decor',
      roomId: 'kitchen',
      position: { x: -30.4, y: 0.98, z: 9.2 },
      orientationRadians: 0,
      kind: 'herb-planter-decor',
      visual: { color: 0x7a5538, accentColor: 0x6fae62, height: 0.45 },
    },
    {
      id: 'kitchen-pendant-lights',
      category: 'plants-lighting-decor',
      roomId: 'kitchen',
      position: { x: -13.0, y: 2.2, z: 10.9 },
      orientationRadians: 0,
      kind: 'pendant-lights-decor',
      visual: { color: 0x2b2b2f, accentColor: 0xffd48a, height: 0.9 },
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
      const solidAllowed =
        solid.definition.visual?.allowSolidOverlapWithIds?.includes(
          other.definition.id
        );
      const otherAllowed =
        other.definition.visual?.allowSolidOverlapWithIds?.includes(
          solid.definition.id
        );
      if (
        !(solidAllowed && otherAllowed) &&
        rectanglesOverlap(solid.bounds, other.bounds, tolerance)
      ) {
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

    if (!definition.solidFootprint && !definition.decorativeFootprint) {
      furnishing.add(createVisualOnlyPrimitive(definition));
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
  if (definition.kind.includes('plant'))
    return createPlantFurnishing(definition);
  if (definition.kind.startsWith('sleeping-'))
    return createSleepingNookFurnishing(definition);
  if (definition.kind.startsWith('kitchen-'))
    return createKitchenFurnishing(definition);
  if (definition.kind.startsWith('storage-'))
    return createStorageFurnishing(definition);

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

function createPlantFurnishing(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 0.8, depth: 0.8 };
  const potMaterial = createMaterial(definition.visual?.color ?? 0x5f4734);
  const foliageMaterial = createMaterial(
    definition.visual?.accentColor ?? 0x4f8f52
  );
  const stemMaterial = createMaterial(0x4b3525);
  const group = new Group();
  const potRadius = Math.min(footprint.width, footprint.depth) * 0.28;

  const pot = new Mesh(
    new CylinderGeometry(potRadius * 0.78, potRadius, 0.42, 16),
    potMaterial
  );
  pot.name = `Furnishing:${definition.id}:pot`;
  pot.position.y = 0.21;
  group.add(pot);

  const rim = new Mesh(
    new CylinderGeometry(potRadius * 1.05, potRadius * 1.05, 0.08, 16),
    potMaterial
  );
  rim.name = `Furnishing:${definition.id}:potRim`;
  rim.position.y = 0.45;
  group.add(rim);

  const trunkHeight = definition.kind === 'plant-stool' ? 0.54 : 0.84;
  if (definition.kind === 'plant-stool') {
    addBox(
      group,
      'plantStoolTop',
      { width: 0.78, height: 0.1, depth: 0.78 },
      stemMaterial,
      [0, 0.48, 0]
    );
    [-0.24, 0.24].forEach((x, xIndex) => {
      [-0.24, 0.24].forEach((z, zIndex) => {
        addBox(
          group,
          `plantStoolLeg${xIndex}-${zIndex}`,
          { width: 0.07, height: 0.48, depth: 0.07 },
          stemMaterial,
          [x, 0.24, z]
        );
      });
    });
    pot.position.y += 0.54;
    rim.position.y += 0.54;
  }

  const stemBaseY = definition.kind === 'plant-stool' ? 0.9 : 0.46;
  const stem = new Mesh(
    new CylinderGeometry(0.035, 0.045, trunkHeight, 8),
    stemMaterial
  );
  stem.name = `Furnishing:${definition.id}:stem`;
  stem.position.y = stemBaseY + trunkHeight / 2;
  group.add(stem);

  const leafCount = definition.kind === 'monstera-plant' ? 8 : 6;
  for (let index = 0; index < leafCount; index += 1) {
    const angle = (Math.PI * 2 * index) / leafCount;
    const leaf = new Mesh(new BoxGeometry(0.12, 0.36, 0.04), foliageMaterial);
    leaf.name = `Furnishing:${definition.id}:leaf${index}`;
    leaf.position.set(
      Math.cos(angle) * 0.22,
      stemBaseY + trunkHeight + 0.06 + (index % 2) * 0.12,
      Math.sin(angle) * 0.22
    );
    leaf.rotation.y = -angle;
    leaf.rotation.z = Math.PI / 5;
    group.add(leaf);
  }

  return group;
}

function createVisualOnlyPrimitive(
  definition: LowerFloorFurnishingDefinition
): Group {
  const group = new Group();
  if (definition.kind === 'herb-planter-decor') {
    const planterMaterial = createMaterial(
      definition.visual?.color ?? 0x7a5538
    );
    const leafMaterial = createMaterial(
      definition.visual?.accentColor ?? 0x6fae62
    );
    addBox(
      group,
      'herbPlanterBox',
      { width: 0.72, height: 0.16, depth: 0.28 },
      planterMaterial,
      [0, 0.08, 0]
    );
    [-0.24, -0.08, 0.08, 0.24].forEach((x, index) => {
      addBox(
        group,
        `herbStem${index}`,
        { width: 0.04, height: 0.34, depth: 0.04 },
        leafMaterial,
        [x, 0.32, 0]
      );
      addBox(
        group,
        `herbLeaf${index}`,
        { width: 0.14, height: 0.04, depth: 0.08 },
        leafMaterial,
        [x + 0.04, 0.48, 0.02]
      );
    });
  } else if (definition.kind === 'pendant-lights-decor') {
    const cordMaterial = createMaterial(definition.visual?.color ?? 0x2b2b2f);
    const shadeMaterial = createMaterial(
      definition.visual?.accentColor ?? 0xffd48a,
      {
        emissive: definition.visual?.accentColor ?? 0xffd48a,
        emissiveIntensity: 0.4,
      }
    );
    [-0.8, 0, 0.8].forEach((x, index) => {
      addBox(
        group,
        `pendantCord${index}`,
        { width: 0.035, height: 0.62, depth: 0.035 },
        cordMaterial,
        [x, 0.31, 0]
      );
      const shade = new Mesh(
        new CylinderGeometry(0.22, 0.32, 0.24, 16),
        shadeMaterial
      );
      shade.name = `FurnishingPart:pendantShade${index}`;
      shade.position.set(x, 0.72, 0);
      group.add(shade);
    });
  }
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

function createKitchenFurnishing(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const isQuarterTurn =
    Math.abs(Math.sin(definition.orientationRadians)) >
    Math.abs(Math.cos(definition.orientationRadians));
  const visualFootprint = isQuarterTurn
    ? { width: footprint.depth, depth: footprint.width }
    : footprint;
  const height = definition.visual?.height ?? 0.9;
  const cabinetMaterial = createMaterial(definition.visual?.color ?? 0x647181);
  const counterMaterial = createMaterial(
    definition.visual?.accentColor ?? 0xd8ccb8
  );
  const darkMaterial = createMaterial(0x202833);
  const metalMaterial = createMaterial(0xc9d1d6, {
    metalness: 0.25,
    roughness: 0.38,
  });
  const group = new Group();

  if (definition.kind === 'kitchen-bar-stool') {
    const seat = new Mesh(
      new CylinderGeometry(0.32, 0.32, 0.12, 20),
      counterMaterial
    );
    seat.name = `Furnishing:${definition.id}:roundSeat`;
    seat.position.y = height;
    group.add(seat);
    [-0.2, 0.2].forEach((x, xIndex) => {
      [-0.2, 0.2].forEach((z, zIndex) => {
        addBox(
          group,
          `stoolLeg${xIndex}-${zIndex}`,
          { width: 0.06, height, depth: 0.06 },
          darkMaterial,
          [x, height / 2, z]
        );
      });
    });
    return group;
  }

  if (definition.kind === 'kitchen-fridge') {
    addBox(
      group,
      'fridgeBody',
      { width: visualFootprint.width, height, depth: visualFootprint.depth },
      metalMaterial,
      [0, height / 2, 0]
    );
    addBox(
      group,
      'fridgeHandle',
      { width: 0.08, height: 1.25, depth: 0.08 },
      darkMaterial,
      [visualFootprint.width / 2 - 0.14, 1.2, -visualFootprint.depth / 2 - 0.01]
    );
    return group;
  }

  addBox(
    group,
    'cabinetBody',
    { width: visualFootprint.width, height, depth: visualFootprint.depth },
    cabinetMaterial,
    [0, height / 2, 0]
  );
  addBox(
    group,
    'countertop',
    {
      width: visualFootprint.width + 0.06,
      height: 0.12,
      depth: visualFootprint.depth + 0.06,
    },
    counterMaterial,
    [0, height + 0.06, 0]
  );

  if (definition.kind === 'kitchen-counter-run') {
    addBox(
      group,
      'backsplash',
      { width: visualFootprint.width, height: 0.55, depth: 0.08 },
      counterMaterial,
      [0, 1.25, visualFootprint.depth / 2 - 0.04]
    );
    [-3.2, -1.6, 0, 1.6, 3.2].forEach((x, index) => {
      addBox(
        group,
        `cabinetPull${index}`,
        { width: 0.42, height: 0.08, depth: 0.06 },
        darkMaterial,
        [x, 0.58, -visualFootprint.depth / 2 - 0.01]
      );
    });
  } else if (definition.kind === 'kitchen-sink-cabinet') {
    addBox(
      group,
      'sinkBasin',
      { width: 0.08, height: 0.08, depth: 0.82 },
      metalMaterial,
      [-0.1, height + 0.14, 0]
    );
    addBox(
      group,
      'faucet',
      { width: 0.08, height: 0.42, depth: 0.08 },
      metalMaterial,
      [0.08, height + 0.32, 0]
    );
  } else if (definition.kind === 'kitchen-stove-cabinet') {
    [-0.26, 0.26].forEach((x, index) => {
      [-0.32, 0.32].forEach((z, innerIndex) => {
        addBox(
          group,
          `cooktop${index}-${innerIndex}`,
          { width: 0.22, height: 0.035, depth: 0.22 },
          darkMaterial,
          [x, height + 0.135, z]
        );
      });
    });
    addBox(
      group,
      'ovenFace',
      { width: 0.08, height: 0.48, depth: 0.95 },
      darkMaterial,
      [-visualFootprint.width / 2 - 0.01, 0.48, 0]
    );
    addBox(
      group,
      'hoodPanel',
      { width: visualFootprint.width, height: 0.16, depth: 0.28 },
      metalMaterial,
      [0, 1.55, visualFootprint.depth / 2 - 0.14]
    );
  } else if (definition.kind === 'kitchen-island') {
    [-1.5, 0, 1.5].forEach((x, index) => {
      addBox(
        group,
        `islandDrawer${index}`,
        { width: 0.72, height: 0.08, depth: 0.06 },
        darkMaterial,
        [x, 0.62, visualFootprint.depth / 2 + 0.01]
      );
    });
  } else if (definition.kind === 'kitchen-trash-drawer') {
    addBox(
      group,
      'recyclingPull',
      { width: 0.08, height: 0.08, depth: 0.55 },
      counterMaterial,
      [-visualFootprint.width / 2 - 0.01, 0.5, 0]
    );
  }

  return group;
}

function createSleepingNookFurnishing(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const isQuarterTurn =
    Math.abs(Math.sin(definition.orientationRadians)) >
    Math.abs(Math.cos(definition.orientationRadians));
  const visualFootprint = isQuarterTurn
    ? { width: footprint.depth, depth: footprint.width }
    : footprint;
  const height = definition.visual?.height ?? 0.72;
  const frameMaterial = createMaterial(definition.visual?.color ?? 0x6f7f92);
  const beddingMaterial = createMaterial(
    definition.visual?.accentColor ?? 0xd8c7a7
  );
  const darkMaterial = createMaterial(0x27231f);
  const pillowMaterial = createMaterial(0xf1e9da);
  const group = new Group();

  if (definition.kind === 'sleeping-daybed') {
    addBox(
      group,
      'daybedLowFrame',
      {
        width: visualFootprint.width,
        height: 0.24,
        depth: visualFootprint.depth,
      },
      frameMaterial,
      [0, 0.16, 0]
    );
    addBox(
      group,
      'daybedMattress',
      {
        width: visualFootprint.width - 0.24,
        height: 0.22,
        depth: visualFootprint.depth - 0.32,
      },
      pillowMaterial,
      [0, 0.39, -0.02]
    );
    addBox(
      group,
      'daybedBlanket',
      {
        width: visualFootprint.width - 0.34,
        height: 0.08,
        depth: visualFootprint.depth * 0.5,
      },
      beddingMaterial,
      [0.05, 0.56, visualFootprint.depth * 0.16]
    );
    [-0.42, 0.42].forEach((x, index) => {
      addBox(
        group,
        `daybedPillow${index}`,
        { width: 0.58, height: 0.18, depth: 0.36 },
        pillowMaterial,
        [x, 0.61, -visualFootprint.depth / 2 + 0.34]
      );
    });
    addBox(
      group,
      'daybedHeadboardPanel',
      { width: visualFootprint.width, height: 1.15, depth: 0.12 },
      frameMaterial,
      [0, 0.86, -visualFootprint.depth / 2 + 0.06]
    );
  } else if (definition.kind.startsWith('sleeping-nightstand')) {
    const nightstandPartPrefix = definition.id;

    addBox(
      group,
      `${nightstandPartPrefix}:nightstandBody`,
      { width: visualFootprint.width, height, depth: visualFootprint.depth },
      frameMaterial,
      [0, height / 2, 0]
    );
    addBox(
      group,
      `${nightstandPartPrefix}:nightstandDrawer`,
      { width: visualFootprint.width - 0.16, height: 0.08, depth: 0.05 },
      beddingMaterial,
      [0, height * 0.55, -visualFootprint.depth / 2 - 0.01]
    );
    addBox(
      group,
      `${nightstandPartPrefix}:nightstandHandle`,
      { width: 0.26, height: 0.04, depth: 0.04 },
      darkMaterial,
      [0, height * 0.6, -visualFootprint.depth / 2 - 0.04]
    );
    if (definition.kind === 'sleeping-nightstand-lamp') {
      addBox(
        group,
        `${nightstandPartPrefix}:nightstandLampBase`,
        { width: 0.18, height: 0.18, depth: 0.18 },
        darkMaterial,
        [0.18, height + 0.09, 0]
      );
      addBox(
        group,
        `${nightstandPartPrefix}:nightstandLampShade`,
        { width: 0.32, height: 0.22, depth: 0.32 },
        beddingMaterial,
        [0.18, height + 0.29, 0]
      );
    } else {
      [-0.16, 0.02, 0.2].forEach((x, index) => {
        addBox(
          group,
          `${nightstandPartPrefix}:nightstandBook${index}`,
          { width: 0.16, height: 0.06, depth: 0.34 },
          beddingMaterial,
          [x, height + 0.03 + index * 0.04, 0]
        );
      });
    }
  } else if (definition.kind === 'sleeping-reading-chair') {
    addBox(
      group,
      'readingChairSeat',
      { width: 1.05, height: 0.32, depth: 1.0 },
      frameMaterial,
      [0, 0.32, 0]
    );
    addBox(
      group,
      'readingChairBack',
      { width: 1.1, height: 0.72, depth: 0.2 },
      frameMaterial,
      [0, 0.72, 0.42]
    );
    addBox(
      group,
      'readingChairCushion',
      { width: 0.88, height: 0.14, depth: 0.82 },
      beddingMaterial,
      [0, 0.55, -0.05]
    );
    [-0.52, 0.52].forEach((x, index) => {
      addBox(
        group,
        `readingChairArm${index}`,
        { width: 0.18, height: 0.48, depth: 0.9 },
        frameMaterial,
        [x, 0.48, -0.02]
      );
    });
  }

  return group;
}

function createStorageFurnishing(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const isQuarterTurn =
    Math.abs(Math.sin(definition.orientationRadians)) >
    Math.abs(Math.cos(definition.orientationRadians));
  const visualFootprint = isQuarterTurn
    ? { width: footprint.depth, depth: footprint.width }
    : footprint;
  const height = definition.visual?.height ?? 1.1;
  const bodyMaterial = createMaterial(definition.visual?.color ?? 0x4f4237);
  const accentMaterial = createMaterial(
    definition.visual?.accentColor ?? 0xb88a52
  );
  const darkMaterial = createMaterial(0x252321);
  const bookMaterials = [
    createMaterial(0x8b4d42),
    createMaterial(0x3f6f86),
    createMaterial(0xc29249),
    createMaterial(0x6e7d55),
    createMaterial(0x7d5f8a),
  ];
  const group = new Group();

  addBox(
    group,
    'storageBody',
    { width: visualFootprint.width, height, depth: visualFootprint.depth },
    bodyMaterial,
    [0, height / 2, 0]
  );

  const frontZ = -visualFootprint.depth / 2 + 0.04;
  addBox(
    group,
    'topTrim',
    { width: visualFootprint.width - 0.08, height: 0.08, depth: 0.08 },
    accentMaterial,
    [0, height + 0.04, frontZ + 0.03]
  );
  addBox(
    group,
    'toeKick',
    { width: visualFootprint.width - 0.3, height: 0.1, depth: 0.08 },
    darkMaterial,
    [0, 0.05, frontZ + 0.03]
  );

  if (
    definition.kind.includes('bookcase') ||
    definition.kind.includes('shelf')
  ) {
    const shelfCount = definition.kind === 'storage-tall-bookcase' ? 4 : 3;
    for (let shelf = 1; shelf < shelfCount; shelf += 1) {
      const y = (height / shelfCount) * shelf;
      addBox(
        group,
        `shelfDivider${shelf}`,
        { width: visualFootprint.width - 0.18, height: 0.055, depth: 0.12 },
        accentMaterial,
        [0, y, frontZ + 0.04]
      );
    }
    [-1, 0, 1].forEach((ratio, index) => {
      addBox(
        group,
        `verticalDivider${index}`,
        { width: 0.06, height: height - 0.12, depth: 0.12 },
        accentMaterial,
        [(visualFootprint.width / 4) * ratio, height / 2, frontZ + 0.04]
      );
    });
    addBookRows(group, visualFootprint.width, height, frontZ, bookMaterials);
    addStorageBins(
      group,
      visualFootprint.width,
      height,
      frontZ,
      accentMaterial
    );
    if (definition.kind === 'storage-open-shelf') {
      addTinyPlant(
        group,
        'openShelfTop',
        visualFootprint.width / 2 - 0.45,
        height + 0.16,
        frontZ + 0.05
      );
    }
  } else {
    const rows = definition.kind === 'storage-drafting-drawers' ? 5 : 3;
    const columns = definition.kind === 'storage-east-dresser' ? 2 : 4;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const drawerWidth = (visualFootprint.width - 0.28) / columns;
        const x =
          -visualFootprint.width / 2 +
          0.14 +
          drawerWidth / 2 +
          column * drawerWidth;
        const y = 0.22 + row * ((height - 0.28) / rows);
        addBox(
          group,
          `drawerFront${row}-${column}`,
          { width: drawerWidth - 0.05, height: 0.035, depth: 0.04 },
          accentMaterial,
          [x, y, frontZ]
        );
        addBox(
          group,
          `drawerPull${row}-${column}`,
          { width: drawerWidth * 0.42, height: 0.035, depth: 0.035 },
          darkMaterial,
          [x, y + 0.04, frontZ]
        );
      }
    }
    if (definition.id === 'living-room-drawer-console') {
      const footInsetX = 0.34;
      const footInsetZ = 0.18;
      const footPositions: Array<[number, number]> = [
        [
          -visualFootprint.width / 2 + footInsetX,
          -visualFootprint.depth / 2 + footInsetZ,
        ],
        [
          visualFootprint.width / 2 - footInsetX,
          -visualFootprint.depth / 2 + footInsetZ,
        ],
        [
          -visualFootprint.width / 2 + footInsetX,
          visualFootprint.depth / 2 - footInsetZ,
        ],
        [
          visualFootprint.width / 2 - footInsetX,
          visualFootprint.depth / 2 - footInsetZ,
        ],
      ];

      footPositions.forEach(([x, z], index) => {
        addBox(
          group,
          `drawerConsoleFoot${index}`,
          { width: 0.16, height: 0.16, depth: 0.16 },
          darkMaterial,
          [x, 0.08, z]
        );
      });
    }

    addBox(
      group,
      'topTray',
      {
        width: Math.min(0.72, visualFootprint.width * 0.22),
        height: 0.08,
        depth: 0.28,
      },
      accentMaterial,
      [-visualFootprint.width / 2 + 0.55, height + 0.08, 0]
    );
    addBox(
      group,
      'smallVase',
      { width: 0.18, height: 0.24, depth: 0.18 },
      bookMaterials[1],
      [visualFootprint.width / 2 - 0.52, height + 0.12, 0]
    );
  }

  return group;
}

function addBookRows(
  group: Group,
  width: number,
  height: number,
  frontZ: number,
  materials: MeshStandardMaterial[]
): void {
  const rowCount = 3;
  const verticalPadding = 0.14;
  const availableHeight = Math.max(0.1, height - verticalPadding * 2);
  const shelfHeight = availableHeight / rowCount;
  const maxBookHeight = Math.max(0.08, shelfHeight - 0.08);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const baselineY = verticalPadding + rowIndex * shelfHeight + 0.04;
    const startX = -width / 2 + 0.35;
    for (let index = 0; index < 12; index += 1) {
      const preferredHeight = 0.22 + ((index + rowIndex) % 4) * 0.055;
      const bookHeight = Math.min(preferredHeight, maxBookHeight);
      addBox(
        group,
        `book${rowIndex}-${index}`,
        { width: 0.12, height: bookHeight, depth: 0.12 },
        materials[(index + rowIndex) % materials.length],
        [startX + index * 0.22, baselineY + bookHeight / 2, frontZ - 0.01]
      );
    }
  }
}

function addStorageBins(
  group: Group,
  width: number,
  height: number,
  frontZ: number,
  material: MeshStandardMaterial
): void {
  [-0.32, 0.34].forEach((ratio, index) => {
    addBox(
      group,
      `storageBin${index}`,
      { width: 0.58, height: 0.24, depth: 0.18 },
      material,
      [width * ratio, height * 0.18, frontZ - 0.02]
    );
  });
}

function addTinyPlant(
  group: Group,
  suffix: string,
  x: number,
  y: number,
  z: number
): void {
  const potMaterial = createMaterial(0xc28d52);
  const leafMaterial = createMaterial(0x6e8f5f);
  addBox(
    group,
    `tinyPlantPot-${suffix}`,
    { width: 0.2, height: 0.16, depth: 0.2 },
    potMaterial,
    [x, y, z]
  );
  addBox(
    group,
    `tinyPlantLeaves-${suffix}`,
    { width: 0.28, height: 0.18, depth: 0.18 },
    leafMaterial,
    [x, y + 0.16, z]
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
