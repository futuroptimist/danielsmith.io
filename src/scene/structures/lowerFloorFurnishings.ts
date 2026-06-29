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
      id: 'living-room-large-plant',
      category: 'plants-lighting-decor',
      roomId: 'livingRoom',
      position: { x: -28.6, z: -26.2 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: -28.95, maxX: -28.25, minZ: -26.55, maxZ: -25.85 },
      kind: 'large-potted-plant',
      visual: { color: 0x8a5a36, accentColor: 0x5f8f48, height: 1.65 },
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
      visual: { color: 0x6a4a32, accentColor: 0x6e9b58, height: 1.05 },
    },
    {
      id: 'kitchen-herb-planter',
      category: 'plants-lighting-decor',
      roomId: 'kitchen',
      position: { x: -31.0, z: 7.9 },
      orientationRadians: 0,
      kind: 'herb-planter-detail',
      visual: { color: 0xb7834f, accentColor: 0x6f9f5d, height: 1.0 },
    },
    {
      id: 'kitchen-pendant-lights',
      category: 'plants-lighting-decor',
      roomId: 'kitchen',
      position: { x: -13.0, z: 10.9 },
      orientationRadians: 0,
      kind: 'pendant-lights-detail',
      visual: { color: 0x2f3740, accentColor: 0xffd48a, height: 2.45 },
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
      kind: 'kitchen-stove-cabinet',
      visual: {
        color: 0x5e6672,
        accentColor: 0x1d232b,
        height: 0.95,
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
      visual: { color: 0x7a5134, accentColor: 0x4f8f4f, height: 1.55 },
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
    {
      id: 'backyard-lawn-chair-west-a',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: -27.0, z: 27.3 },
      orientationRadians: Math.PI * 0.35,
      solidFootprint: { width: 1.2, depth: 1.8 },
      solidBounds: { minX: -27.6, maxX: -26.4, minZ: 26.4, maxZ: 28.2 },
      kind: 'backyard-lawn-chair',
      visual: { color: 0x6f8aa0, accentColor: 0xd8c7a7, height: 0.64 },
    },
    {
      id: 'backyard-lawn-chair-west-b',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: -24.2, z: 27.6 },
      orientationRadians: -Math.PI * 0.25,
      solidFootprint: { width: 1.2, depth: 1.8 },
      solidBounds: { minX: -24.8, maxX: -23.6, minZ: 26.7, maxZ: 28.5 },
      kind: 'backyard-lawn-chair',
      visual: { color: 0x78966f, accentColor: 0xd8c7a7, height: 0.64 },
    },
    {
      id: 'backyard-side-table',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: -25.6, z: 25.2 },
      orientationRadians: 0,
      solidFootprint: { width: 1.0, depth: 1.0 },
      solidBounds: { minX: -26.1, maxX: -25.1, minZ: 24.7, maxZ: 25.7 },
      kind: 'backyard-side-table',
      visual: { color: 0x5d4330, accentColor: 0x2f3740, height: 0.55 },
    },
    {
      id: 'backyard-grill',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: 26.7, z: 18.8 },
      orientationRadians: -Math.PI / 2,
      solidFootprint: { width: 1.4, depth: 0.9 },
      solidBounds: { minX: 26.0, maxX: 27.4, minZ: 18.35, maxZ: 19.25 },
      kind: 'backyard-grill',
      visual: { color: 0x2f3740, accentColor: 0xc9d1d6, height: 1.1 },
    },
    {
      id: 'backyard-prep-cart',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: 24.4, z: 18.8 },
      orientationRadians: 0,
      solidFootprint: { width: 1.2, depth: 0.8 },
      solidBounds: { minX: 23.8, maxX: 25.0, minZ: 18.4, maxZ: 19.2 },
      kind: 'backyard-prep-cart',
      visual: { color: 0x6b4a33, accentColor: 0x2f3740, height: 0.85 },
    },
    {
      id: 'backyard-rock-garden-gravel',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: 3.5, z: 29.1 },
      orientationRadians: 0,
      decorativeFootprint: { width: 7.0, depth: 2.1 },
      decorativeBounds: { minX: 0.0, maxX: 7.0, minZ: 28.05, maxZ: 30.15 },
      kind: 'backyard-rock-garden-gravel',
      visual: {
        color: 0x9a9688,
        accentColor: 0x6d6a60,
        decorativeHeight: 0.025,
        allowDecorativeOverlapWithAnySolid: true,
      },
    },
    {
      id: 'backyard-rock-01',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: 1.1, z: 29.0 },
      orientationRadians: 0,
      solidFootprint: { width: 0.5, depth: 0.5 },
      solidBounds: { minX: 0.85, maxX: 1.35, minZ: 28.75, maxZ: 29.25 },
      kind: 'backyard-rock',
      visual: { color: 0x77736a, accentColor: 0xa39d91, height: 0.32 },
    },
    {
      id: 'backyard-rock-02',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: 3.5, z: 28.6 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: 3.15, maxX: 3.85, minZ: 28.25, maxZ: 28.95 },
      kind: 'backyard-rock',
      visual: { color: 0x6f6b63, accentColor: 0x9b968c, height: 0.42 },
    },
    {
      id: 'backyard-rock-03',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: 5.9, z: 29.4 },
      orientationRadians: 0,
      solidFootprint: { width: 0.6, depth: 0.6 },
      solidBounds: { minX: 5.6, maxX: 6.2, minZ: 29.1, maxZ: 29.7 },
      kind: 'backyard-rock',
      visual: { color: 0x807b72, accentColor: 0xaaa397, height: 0.36 },
    },
    {
      id: 'backyard-planter-west-south',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: -30.2, z: 20.3 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: -30.55, maxX: -29.85, minZ: 19.95, maxZ: 20.65 },
      kind: 'backyard-potted-plant',
      visual: { color: 0x8a5a36, accentColor: 0x5f8f48, height: 1.1 },
    },
    {
      id: 'backyard-planter-west-north',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: -30.1, z: 29.55 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: -30.45, maxX: -29.75, minZ: 29.2, maxZ: 29.9 },
      kind: 'backyard-potted-plant',
      visual: { color: 0x8a5a36, accentColor: 0x6e9b58, height: 1.1 },
    },
    {
      id: 'backyard-planter-east-south',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: 30.1, z: 21.5 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: 29.75, maxX: 30.45, minZ: 21.15, maxZ: 21.85 },
      kind: 'backyard-potted-plant',
      visual: { color: 0x8a5a36, accentColor: 0x5f8f48, height: 1.1 },
    },
    {
      id: 'backyard-planter-east-north',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: 30.0, z: 29.5 },
      orientationRadians: 0,
      solidFootprint: { width: 0.7, depth: 0.7 },
      solidBounds: { minX: 29.65, maxX: 30.35, minZ: 29.15, maxZ: 29.85 },
      kind: 'backyard-potted-plant',
      visual: { color: 0x8a5a36, accentColor: 0x6e9b58, height: 1.1 },
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

function containsPoint(
  bounds: RectCollider,
  point: { x: number; z: number },
  tolerance = 0
): boolean {
  return (
    point.x >= bounds.minX - tolerance &&
    point.x <= bounds.maxX + tolerance &&
    point.z >= bounds.minZ - tolerance &&
    point.z <= bounds.maxZ + tolerance
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
    if (definition.solidFootprint || definition.decorativeFootprint) return;
    if (
      !containsPoint(
        roomBounds[definition.roomId],
        definition.position,
        tolerance
      )
    ) {
      throw new Error(
        `${definition.id} visual detail position is outside ${definition.roomId}.`
      );
    }
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

    if (!definition.solidFootprint && !definition.decorativeFootprint) {
      furnishing.add(createVisualDetailPrimitive(definition));
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
  if (definition.kind === 'large-potted-plant')
    return createLargePottedPlant(definition);
  if (definition.kind === 'plant-stool') return createPlantStool(definition);
  if (definition.kind === 'monstera-plant')
    return createMonsteraPlant(definition);
  if (definition.kind.startsWith('sleeping-'))
    return createSleepingNookFurnishing(definition);
  if (definition.kind.startsWith('kitchen-'))
    return createKitchenFurnishing(definition);
  if (definition.kind.startsWith('storage-'))
    return createStorageFurnishing(definition);
  if (definition.kind.startsWith('backyard-'))
    return createBackyardFurnishing(definition);

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

function createLargePottedPlant(
  definition: LowerFloorFurnishingDefinition
): Group {
  const group = new Group();
  const potMaterial = createMaterial(definition.visual?.color ?? 0x8a5a36);
  const leafMaterial = createMaterial(
    definition.visual?.accentColor ?? 0x5f8f48
  );
  const trunkMaterial = createMaterial(0x5b3a24);
  addBox(
    group,
    'plantPotBase',
    { width: 0.46, height: 0.36, depth: 0.46 },
    potMaterial,
    [0, 0.18, 0]
  );
  addBox(
    group,
    'plantPotRim',
    { width: 0.58, height: 0.08, depth: 0.58 },
    potMaterial,
    [0, 0.4, 0]
  );
  addBox(
    group,
    'plantTrunk',
    { width: 0.1, height: 0.75, depth: 0.1 },
    trunkMaterial,
    [0, 0.8, 0]
  );
  addPlantLeaves(group, leafMaterial, 0.58, 1.1);
  return group;
}

function createPlantStool(definition: LowerFloorFurnishingDefinition): Group {
  const group = new Group();
  const woodMaterial = createMaterial(definition.visual?.color ?? 0x6a4a32);
  const potMaterial = createMaterial(0xb7834f);
  const leafMaterial = createMaterial(
    definition.visual?.accentColor ?? 0x6e9b58
  );
  addBox(
    group,
    'plantStoolSeat',
    { width: 0.62, height: 0.12, depth: 0.62 },
    woodMaterial,
    [0, 0.48, 0]
  );
  [-0.22, 0.22].forEach((x, xIndex) => {
    [-0.22, 0.22].forEach((z, zIndex) => {
      addBox(
        group,
        `plantStoolLeg${xIndex}-${zIndex}`,
        { width: 0.08, height: 0.48, depth: 0.08 },
        woodMaterial,
        [x, 0.24, z]
      );
    });
  });
  addBox(
    group,
    'stoolPlantPot',
    { width: 0.38, height: 0.28, depth: 0.38 },
    potMaterial,
    [0, 0.68, 0]
  );
  addPlantLeaves(group, leafMaterial, 0.34, 0.92);
  return group;
}

function createMonsteraPlant(
  definition: LowerFloorFurnishingDefinition
): Group {
  const group = new Group();
  const potMaterial = createMaterial(definition.visual?.color ?? 0x7a5134);
  const leafMaterial = createMaterial(
    definition.visual?.accentColor ?? 0x4f8f4f
  );
  addBox(
    group,
    'monsteraPot',
    { width: 0.58, height: 0.42, depth: 0.58 },
    potMaterial,
    [0, 0.21, 0]
  );
  addBox(
    group,
    'monsteraPotRim',
    { width: 0.7, height: 0.08, depth: 0.7 },
    potMaterial,
    [0, 0.46, 0]
  );
  addPlantLeaves(group, leafMaterial, 0.72, 1.05, 'lower');
  addPlantLeaves(group, leafMaterial, 0.56, 1.38, 'upper');
  return group;
}

function addPlantLeaves(
  group: Group,
  material: MeshStandardMaterial,
  spread: number,
  y: number,
  namePrefix = 'leaf'
): void {
  const leafPositions: Array<[number, number, number]> = [
    [0, y, 0],
    [-spread * 0.35, y + 0.12, 0.08],
    [spread * 0.35, y + 0.08, -0.08],
    [0.08, y + 0.18, spread * 0.32],
    [-0.06, y + 0.16, -spread * 0.32],
  ];
  leafPositions.forEach(([x, leafY, z], index) => {
    addBox(
      group,
      `plantLeaf${namePrefix}${index}`,
      { width: spread, height: 0.08, depth: 0.24 },
      material,
      [x, leafY, z]
    );
  });
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

function createBackyardFurnishing(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const height = definition.visual?.height ?? 0.8;
  const primaryMaterial = createMaterial(definition.visual?.color ?? 0x6f7f92);
  const accentMaterial = createMaterial(
    definition.visual?.accentColor ?? 0xd8c7a7
  );
  const darkMaterial = createMaterial(0x25292f);
  const metalMaterial = createMaterial(0xb8c0c8, {
    metalness: 0.25,
    roughness: 0.42,
  });
  const group = new Group();

  if (definition.kind === 'backyard-lawn-chair') {
    addBox(
      group,
      `${definition.id}:chairSeatFabric`,
      {
        width: footprint.width * 0.58,
        height: 0.1,
        depth: footprint.depth * 0.36,
      },
      primaryMaterial,
      [0, 0.34, 0.04]
    );
    addBox(
      group,
      `${definition.id}:chairBackFabric`,
      { width: footprint.width * 0.58, height: 0.58, depth: 0.08 },
      primaryMaterial,
      [0, 0.68, footprint.depth * 0.22]
    );
    [-0.24, 0, 0.24].forEach((x, index) => {
      addBox(
        group,
        `${definition.id}:chairSeatSlat${index}`,
        { width: 0.08, height: 0.08, depth: footprint.depth * 0.32 },
        accentMaterial,
        [x, 0.42, 0.04]
      );
      addBox(
        group,
        `${definition.id}:chairBackSlat${index}`,
        { width: 0.08, height: 0.48, depth: 0.08 },
        accentMaterial,
        [x, 0.74, footprint.depth * 0.2]
      );
    });
    [-0.28, 0.28].forEach((x, xIndex) => {
      [-0.42, 0.42].forEach((z, zIndex) => {
        addBox(
          group,
          `${definition.id}:chairLeg${xIndex}-${zIndex}`,
          { width: 0.08, height: 0.36, depth: 0.08 },
          darkMaterial,
          [x, 0.18, z]
        );
      });
    });
    return group;
  }

  if (definition.kind === 'backyard-side-table') {
    addBox(
      group,
      'patioTableTop',
      { width: 0.92, height: 0.12, depth: 0.92 },
      primaryMaterial,
      [0, height, 0]
    );
    addBox(
      group,
      'patioTableTrim',
      { width: 1.0, height: 0.08, depth: 1.0 },
      accentMaterial,
      [0, height + 0.09, 0]
    );
    [-0.32, 0.32].forEach((x, xIndex) => {
      [-0.32, 0.32].forEach((z, zIndex) => {
        addBox(
          group,
          `patioTableLeg${xIndex}-${zIndex}`,
          { width: 0.08, height, depth: 0.08 },
          darkMaterial,
          [x, height / 2, z]
        );
      });
    });
    return group;
  }

  if (definition.kind === 'backyard-grill') {
    addBox(
      group,
      'grillFirebox',
      { width: 0.8, height: 0.42, depth: 0.62 },
      darkMaterial,
      [0, 0.78, 0]
    );
    addBox(
      group,
      'grillLid',
      { width: 0.82, height: 0.36, depth: 0.58 },
      primaryMaterial,
      [0, 1.14, 0.03]
    );
    addBox(
      group,
      'grillHandle',
      { width: 0.78, height: 0.08, depth: 0.08 },
      metalMaterial,
      [0, 1.3, -0.34]
    );
    [-0.24, 0, 0.24].forEach((x, index) => {
      addBox(
        group,
        `grillGrate${index}`,
        { width: 0.06, height: 0.04, depth: 0.5 },
        metalMaterial,
        [x, 1.02, 0]
      );
    });
    [-0.32, 0.32].forEach((x, index) => {
      addBox(
        group,
        `grillLeg${index}`,
        { width: 0.08, height: 0.68, depth: 0.08 },
        metalMaterial,
        [x, 0.34, 0.22]
      );
      addBox(
        group,
        `grillWheel${index}`,
        { width: 0.18, height: 0.18, depth: 0.08 },
        darkMaterial,
        [x, 0.1, -0.3]
      );
    });
    addBox(
      group,
      'grillSideHandle',
      { width: 0.08, height: 0.08, depth: 0.5 },
      metalMaterial,
      [0.4, 0.86, 0]
    );
    return group;
  }

  if (definition.kind === 'backyard-prep-cart') {
    addBox(
      group,
      'prepCartTopShelf',
      { width: 1.12, height: 0.12, depth: 0.72 },
      primaryMaterial,
      [0, height, 0]
    );
    addBox(
      group,
      'prepCartLowerShelf',
      { width: 0.98, height: 0.1, depth: 0.62 },
      primaryMaterial,
      [0, 0.36, 0]
    );
    [-0.45, 0.45].forEach((x, xIndex) => {
      [-0.25, 0.25].forEach((z, zIndex) => {
        addBox(
          group,
          `prepCartPost${xIndex}-${zIndex}`,
          { width: 0.06, height, depth: 0.06 },
          darkMaterial,
          [x, height / 2, z]
        );
        addBox(
          group,
          `prepCartWheel${xIndex}-${zIndex}`,
          { width: 0.14, height: 0.14, depth: 0.08 },
          metalMaterial,
          [x, 0.08, z]
        );
      });
    });
    addBox(
      group,
      'prepCartHandle',
      { width: 0.08, height: 0.08, depth: 0.58 },
      accentMaterial,
      [0.64, 0.72, 0]
    );
    return group;
  }

  if (definition.kind === 'backyard-potted-plant') {
    addBox(
      group,
      `${definition.id}:backyardPlantPot`,
      { width: 0.46, height: 0.36, depth: 0.46 },
      primaryMaterial,
      [0, 0.18, 0]
    );
    addBox(
      group,
      `${definition.id}:backyardPlantPotRim`,
      { width: 0.58, height: 0.08, depth: 0.58 },
      primaryMaterial,
      [0, 0.4, 0]
    );
    addBox(
      group,
      `${definition.id}:backyardPlantStem`,
      { width: 0.08, height: 0.58, depth: 0.08 },
      darkMaterial,
      [0, 0.74, 0]
    );
    addPlantLeaves(group, accentMaterial, 0.5, 1.03, `${definition.id}:leaf`);
    return group;
  }

  if (definition.kind === 'backyard-rock') {
    addBox(
      group,
      `${definition.id}:gardenRockCore`,
      { width: footprint.width * 0.85, height, depth: footprint.depth * 0.75 },
      primaryMaterial,
      [0, height / 2, 0]
    );
    addBox(
      group,
      `${definition.id}:gardenRockFacet`,
      {
        width: footprint.width * 0.5,
        height: height * 0.55,
        depth: footprint.depth * 0.45,
      },
      accentMaterial,
      [footprint.width * 0.12, height * 0.72, -footprint.depth * 0.08]
    );
    return group;
  }

  throw new Error(`Unsupported backyard furnishing kind: ${definition.kind}`);
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

function createVisualDetailPrimitive(
  definition: LowerFloorFurnishingDefinition
): Group {
  const group = new Group();
  const baseMaterial = createMaterial(definition.visual?.color ?? 0x8a5a36);
  const accentMaterial = createMaterial(
    definition.visual?.accentColor ?? 0x6f9f5d,
    {
      emissive: definition.kind.includes('pendant')
        ? (definition.visual?.accentColor ?? 0xffd48a)
        : 0x000000,
      emissiveIntensity: definition.kind.includes('pendant') ? 0.35 : 0,
    }
  );

  if (definition.kind === 'kitchen-stove-cabinet') {
    addBox(
      group,
      'kitchenStoveInsetPanel',
      { width: 1.12, height: 0.08, depth: 1.42 },
      baseMaterial,
      [0, 0.98, 0]
    );
    [-0.26, 0.26].forEach((x, index) => {
      [-0.32, 0.32].forEach((z, innerIndex) => {
        addBox(
          group,
          `kitchenStoveCooktop${index}-${innerIndex}`,
          { width: 0.22, height: 0.04, depth: 0.22 },
          accentMaterial,
          [x, 1.05, z]
        );
      });
    });
    addBox(
      group,
      'kitchenStoveHoodPanel',
      { width: 1.18, height: 0.14, depth: 0.28 },
      accentMaterial,
      [0, 1.55, 0.55]
    );
    return group;
  }

  if (definition.kind === 'herb-planter-detail') {
    addBox(
      group,
      'kitchenHerbPlanterBox',
      { width: 0.62, height: 0.18, depth: 0.28 },
      baseMaterial,
      [0, 0.98, 0]
    );
    [-0.2, 0, 0.2].forEach((x, index) => {
      addBox(
        group,
        `kitchenHerbStem${index}`,
        { width: 0.04, height: 0.3, depth: 0.04 },
        accentMaterial,
        [x, 1.22, 0]
      );
      addBox(
        group,
        `kitchenHerbLeaves${index}`,
        { width: 0.18, height: 0.08, depth: 0.16 },
        accentMaterial,
        [x, 1.38, 0]
      );
    });
    return group;
  }

  if (definition.kind === 'pendant-lights-detail') {
    [-0.9, 0, 0.9].forEach((x, index) => {
      addBox(
        group,
        `pendantCord${index}`,
        { width: 0.035, height: 0.72, depth: 0.035 },
        baseMaterial,
        [x, 2.25, 0]
      );
      addBox(
        group,
        `pendantShade${index}`,
        { width: 0.38, height: 0.24, depth: 0.38 },
        accentMaterial,
        [x, 1.78, 0]
      );
      addBox(
        group,
        `pendantBulb${index}`,
        { width: 0.16, height: 0.12, depth: 0.16 },
        accentMaterial,
        [x, 1.58, 0]
      );
    });
    return group;
  }

  throw new Error(
    `Unsupported visual-only furnishing kind: ${definition.kind}.`
  );
}

function createDecorativePrimitive(
  definition: LowerFloorFurnishingDefinition
): Group | Mesh {
  const footprint = definition.decorativeFootprint ?? { width: 1, depth: 1 };
  const height = definition.visual?.decorativeHeight ?? 0.035;
  const material = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x56616f,
    roughness: 0.85,
  });
  if (definition.kind === 'backyard-rock-garden-gravel') {
    const group = new Group();
    const gravel = new Mesh(
      new BoxGeometry(footprint.width, height, footprint.depth),
      material
    );
    gravel.name = `Furnishing:${definition.id}:decorativeFootprint`;
    gravel.position.y = height / 2;
    group.add(gravel);

    const stoneMaterial = createMaterial(
      definition.visual?.accentColor ?? 0x6d6a60
    );
    const stonePositions: Array<[number, number, number, number]> = [
      [-2.9, height + 0.025, -0.64, 0.1],
      [-2.1, height + 0.025, 0.42, 0.08],
      [-1.2, height + 0.025, -0.18, 0.12],
      [-0.35, height + 0.025, 0.62, 0.08],
      [0.55, height + 0.025, -0.52, 0.11],
      [1.35, height + 0.025, 0.15, 0.09],
      [2.25, height + 0.025, -0.35, 0.1],
      [2.9, height + 0.025, 0.52, 0.08],
    ];
    stonePositions.forEach(([x, y, z, size], index) => {
      addBox(
        group,
        `gravelSpeckle${index}`,
        { width: size, height: 0.035, depth: size * 0.7 },
        stoneMaterial,
        [x, y, z]
      );
    });
    return group;
  }

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
