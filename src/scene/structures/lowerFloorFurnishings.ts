import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from 'three';

import type { RectCollider } from '../collision';

export type LowerFloorFurnishingCategory =
  | 'living-room-seating'
  | 'kitchenette'
  | 'storage'
  | 'sleeping-nook'
  | 'plants-lighting-decor'
  | 'backyard';

export type LowerFloorFurnishingRoomId =
  | 'livingRoom'
  | 'kitchen'
  | 'studio'
  | 'backyard';

export interface LowerFloorFurnishingFootprint {
  width: number;
  depth: number;
}

export interface LowerFloorFurnishingDefinition {
  id: string;
  category: LowerFloorFurnishingCategory;
  roomId: LowerFloorFurnishingRoomId;
  position: { x: number; y?: number; z: number };
  orientationRadians: number;
  solidFootprint?: LowerFloorFurnishingFootprint;
  decorativeFootprint?: LowerFloorFurnishingFootprint;
  kind: string;
  visual?: {
    color?: number;
    height?: number;
    trimColor?: number;
    shape?: 'box' | 'cylinder' | 'flat';
  };
  allowDecorativeOverlapWithSolidIds?: readonly string[];
}

export interface LowerFloorDecorativeFootprint {
  id: string;
  category: LowerFloorFurnishingCategory;
  roomId: LowerFloorFurnishingRoomId;
  kind: string;
  bounds: RectCollider;
  allowedSolidOverlapIds: readonly string[];
}

export interface LowerFloorFurnishingCollider {
  id: string;
  category: LowerFloorFurnishingCategory;
  roomId: LowerFloorFurnishingRoomId;
  kind: string;
  sourceId: `ground.furnishings.${LowerFloorFurnishingCategory}.${string}.generated_collider`;
  bounds: RectCollider;
}

export interface LowerFloorFurnishingsBuild {
  group: Group;
  colliders: LowerFloorFurnishingCollider[];
  decorativeFootprints: LowerFloorDecorativeFootprint[];
}

export interface LowerFloorFurnishingsOptions {
  definitions?: readonly LowerFloorFurnishingDefinition[];
  material?: Material;
}

export interface LowerFloorFurnishingValidationOptions {
  roomBounds: Record<LowerFloorFurnishingRoomId, RectCollider>;
  reservedBlockers?: readonly RectCollider[];
  tolerance?: number;
}

export interface LowerFloorFurnishingValidationResult {
  valid: boolean;
  errors: string[];
  solidAabbs: Array<LowerFloorFurnishingCollider>;
  decorativeFootprints: LowerFloorDecorativeFootprint[];
}

export const LOWER_FLOOR_ROOM_BOUNDS: Record<
  LowerFloorFurnishingRoomId,
  RectCollider
> = {
  livingRoom: { minX: -32, maxX: 32, minZ: -32, maxZ: -8 },
  kitchen: { minX: -32, maxX: -4, minZ: -8, maxZ: 16 },
  studio: { minX: -4, maxX: 32, minZ: -8, maxZ: 16 },
  backyard: { minX: -32, maxX: 32, minZ: 16, maxZ: 32 },
};

export const DEFAULT_LOWER_FLOOR_FURNISHINGS: readonly LowerFloorFurnishingDefinition[] =
  [];

export function createAabbFromCenterSize(
  center: { x: number; z: number },
  size: LowerFloorFurnishingFootprint,
  orientationRadians = 0
): RectCollider {
  const halfWidth = size.width / 2;
  const halfDepth = size.depth / 2;
  const cos = Math.cos(orientationRadians);
  const sin = Math.sin(orientationRadians);
  const corners = [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ];
  return corners.reduce<RectCollider>(
    (bounds, corner) => {
      const x = center.x + corner.x * cos + corner.z * sin;
      const z = center.z - corner.x * sin + corner.z * cos;
      return {
        minX: Math.min(bounds.minX, x),
        maxX: Math.max(bounds.maxX, x),
        minZ: Math.min(bounds.minZ, z),
        maxZ: Math.max(bounds.maxZ, z),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    }
  );
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
  options: LowerFloorFurnishingValidationOptions
): LowerFloorFurnishingValidationResult {
  const tolerance = options.tolerance ?? 0;
  const errors: string[] = [];
  const solidAabbs = definitions
    .filter((definition) => definition.solidFootprint)
    .map(createColliderRecord);
  const decorativeFootprints = definitions
    .filter((definition) => definition.decorativeFootprint)
    .map(createDecorativeFootprintRecord);

  solidAabbs.forEach((solid) => {
    if (!hasPositiveArea(solid.bounds)) {
      errors.push(`${solid.id} has a non-positive solid footprint.`);
    }
    if (
      !containsRect(options.roomBounds[solid.roomId], solid.bounds, tolerance)
    ) {
      errors.push(
        `${solid.id} is outside its declared ${solid.roomId} bounds.`
      );
    }
  });

  for (let index = 0; index < solidAabbs.length; index += 1) {
    for (
      let otherIndex = index + 1;
      otherIndex < solidAabbs.length;
      otherIndex += 1
    ) {
      if (
        rectanglesOverlap(
          solidAabbs[index].bounds,
          solidAabbs[otherIndex].bounds,
          tolerance
        )
      ) {
        errors.push(
          `${solidAabbs[index].id} overlaps ${solidAabbs[otherIndex].id}.`
        );
      }
    }
  }

  options.reservedBlockers?.forEach((blocker, blockerIndex) => {
    solidAabbs.forEach((solid) => {
      if (rectanglesOverlap(solid.bounds, blocker, tolerance)) {
        errors.push(`${solid.id} overlaps reserved blocker ${blockerIndex}.`);
      }
    });
  });

  decorativeFootprints.forEach((decorative) => {
    solidAabbs.forEach((solid) => {
      if (!rectanglesOverlap(decorative.bounds, solid.bounds, tolerance))
        return;
      if (!decorative.allowedSolidOverlapIds.includes(solid.id)) {
        errors.push(
          `${decorative.id} decor overlaps ${solid.id} without an allow-list entry.`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    solidAabbs,
    decorativeFootprints,
  };
}

export function createLowerFloorFurnishings({
  definitions = DEFAULT_LOWER_FLOOR_FURNISHINGS,
  material,
}: LowerFloorFurnishingsOptions = {}): LowerFloorFurnishingsBuild {
  const group = new Group();
  group.name = 'LowerFloorFurnishings';
  const sharedMaterial =
    material ?? new MeshStandardMaterial({ color: 0x62748a });
  const colliders = definitions
    .filter((definition) => definition.solidFootprint)
    .map(createColliderRecord);
  const decorativeFootprints = definitions
    .filter((definition) => definition.decorativeFootprint)
    .map(createDecorativeFootprintRecord);

  definitions.forEach((definition) => {
    group.add(createFurnishingMesh(definition, sharedMaterial));
  });

  return { group, colliders, decorativeFootprints };
}

function createColliderRecord(
  definition: LowerFloorFurnishingDefinition
): LowerFloorFurnishingCollider {
  const bounds = createAabbFromCenterSize(
    definition.position,
    definition.solidFootprint ?? { width: 0, depth: 0 },
    definition.orientationRadians
  );
  return {
    id: definition.id,
    category: definition.category,
    roomId: definition.roomId,
    kind: definition.kind,
    sourceId: `ground.furnishings.${definition.category}.${definition.id}.generated_collider`,
    bounds,
  };
}

function createDecorativeFootprintRecord(
  definition: LowerFloorFurnishingDefinition
): LowerFloorDecorativeFootprint {
  return {
    id: definition.id,
    category: definition.category,
    roomId: definition.roomId,
    kind: definition.kind,
    bounds: createAabbFromCenterSize(
      definition.position,
      definition.decorativeFootprint ?? { width: 0, depth: 0 },
      definition.orientationRadians
    ),
    allowedSolidOverlapIds: definition.allowDecorativeOverlapWithSolidIds ?? [],
  };
}

function createFurnishingMesh(
  definition: LowerFloorFurnishingDefinition,
  sharedMaterial: Material
): Group {
  const group = new Group();
  group.name = `Furnishing:${definition.id}`;
  group.position.set(
    definition.position.x,
    definition.position.y ?? 0,
    definition.position.z
  );
  group.rotation.y = definition.orientationRadians;

  const footprint = definition.solidFootprint ??
    definition.decorativeFootprint ?? { width: 1, depth: 1 };
  const height =
    definition.visual?.height ?? (definition.solidFootprint ? 0.8 : 0.04);
  const material = definition.visual?.color
    ? new MeshStandardMaterial({ color: definition.visual.color })
    : sharedMaterial;
  const shape =
    definition.visual?.shape ??
    (definition.decorativeFootprint ? 'flat' : 'box');
  const mesh =
    shape === 'cylinder'
      ? new Mesh(
          new CylinderGeometry(
            footprint.width / 2,
            footprint.width / 2,
            height,
            16
          ),
          material
        )
      : new Mesh(
          new BoxGeometry(footprint.width, height, footprint.depth),
          material
        );
  mesh.name = `Furnishing:${definition.id}:body`;
  mesh.position.y = height / 2;
  group.add(mesh);

  if (definition.solidFootprint && shape === 'box') {
    addTrimBoxes(
      group,
      footprint,
      height,
      definition.visual?.trimColor ?? 0x94a3b8
    );
  }

  return group;
}

function addTrimBoxes(
  group: Group,
  footprint: LowerFloorFurnishingFootprint,
  height: number,
  color: number
): void {
  const material = new MeshStandardMaterial({ color });
  const trimHeight = Math.min(0.08, height / 4);
  const trimDepth = 0.08;
  const trimGeometry = new BoxGeometry(
    footprint.width + trimDepth,
    trimHeight,
    trimDepth
  );
  [-1, 1].forEach((direction) => {
    const trim = new Mesh(trimGeometry, material);
    trim.name = `${group.name}:trim:${direction}`;
    trim.position.set(
      0,
      height + trimHeight / 2,
      (direction * footprint.depth) / 2
    );
    group.add(trim);
  });
}

function hasPositiveArea(bounds: RectCollider): boolean {
  return bounds.maxX > bounds.minX && bounds.maxZ > bounds.minZ;
}

function containsRect(
  container: RectCollider,
  candidate: RectCollider,
  tolerance: number
): boolean {
  return (
    candidate.minX >= container.minX - tolerance &&
    candidate.maxX <= container.maxX + tolerance &&
    candidate.minZ >= container.minZ - tolerance &&
    candidate.maxZ <= container.maxZ + tolerance
  );
}
