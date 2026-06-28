import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from 'three';

import type { RectCollider } from '../../systems/collision';
import { assertLevelSourceId, type LevelSourceId } from '../level/sourceIds';

export type LowerFloorFurnishingCategory =
  | 'living-room-seating'
  | 'kitchenette'
  | 'storage'
  | 'sleeping-nook'
  | 'plants-lighting-decor'
  | 'backyard';

export interface LowerFloorFurnishingFootprint {
  width: number;
  depth: number;
}

export interface LowerFloorFurnishingDefinition {
  id: string;
  category: LowerFloorFurnishingCategory;
  roomId: 'livingRoom' | 'kitchen' | 'studio' | 'backyard' | string;
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
  allowDecorativeOverlapWith?: readonly string[];
}

export interface LowerFloorFurnishingDecorativeFootprint {
  id: string;
  furnishingId: string;
  category: LowerFloorFurnishingCategory;
  roomId: string;
  bounds: RectCollider;
  allowOverlapWith: readonly string[];
}

export interface LowerFloorFurnishingCollider {
  furnishingId: string;
  category: LowerFloorFurnishingCategory;
  roomId: string;
  kind: string;
  bounds: RectCollider;
  sourceId: LevelSourceId;
}

export interface LowerFloorFurnishingsBuild {
  group: Group;
  colliders: LowerFloorFurnishingCollider[];
  decorativeFootprints: LowerFloorFurnishingDecorativeFootprint[];
}

export interface LowerFloorFurnishingsOptions {
  definitions?: readonly LowerFloorFurnishingDefinition[];
}

export interface LowerFloorFurnishingPlanValidationOptions {
  roomBounds?: Readonly<Record<string, RectCollider>>;
  reservedBlockers?: readonly RectCollider[];
  tolerance?: number;
}

export interface LowerFloorFurnishingPlanValidationResult {
  valid: boolean;
  errors: string[];
  solidAabbs: Array<{
    definition: LowerFloorFurnishingDefinition;
    bounds: RectCollider;
  }>;
  decorativeFootprints: LowerFloorFurnishingDecorativeFootprint[];
}

export const LOWER_FLOOR_ROOM_BOUNDS: Readonly<Record<string, RectCollider>> = {
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
  [];

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

const contains = (
  outer: RectCollider,
  inner: RectCollider,
  tolerance = 0
): boolean =>
  inner.minX >= outer.minX - tolerance &&
  inner.maxX <= outer.maxX + tolerance &&
  inner.minZ >= outer.minZ - tolerance &&
  inner.maxZ <= outer.maxZ + tolerance;

export function getLowerFloorFurnishingColliderSourceId(
  definition: Pick<LowerFloorFurnishingDefinition, 'category' | 'id'>
): LevelSourceId {
  return assertLevelSourceId(
    `ground.furnishings.${definition.category}.${definition.id}.generated_collider`
  );
}

export function validateLowerFloorFurnishingPlan(
  definitions: readonly LowerFloorFurnishingDefinition[],
  options: LowerFloorFurnishingPlanValidationOptions = {}
): LowerFloorFurnishingPlanValidationResult {
  const roomBounds = options.roomBounds ?? LOWER_FLOOR_ROOM_BOUNDS;
  const reservedBlockers =
    options.reservedBlockers ?? LOWER_FLOOR_RESERVED_BLOCKERS;
  const tolerance = options.tolerance ?? 0;
  const errors: string[] = [];
  const solidAabbs: LowerFloorFurnishingPlanValidationResult['solidAabbs'] = [];
  const decorativeFootprints: LowerFloorFurnishingDecorativeFootprint[] = [];

  definitions.forEach((definition) => {
    if (definition.solidFootprint) {
      const bounds = createAabbFromCenterSize(
        definition.position,
        definition.solidFootprint
      );
      if (bounds.maxX <= bounds.minX || bounds.maxZ <= bounds.minZ) {
        errors.push(`${definition.id} has a non-positive solid footprint.`);
      }
      const room = roomBounds[definition.roomId];
      if (!room)
        errors.push(`${definition.id} uses unknown room ${definition.roomId}.`);
      else if (!contains(room, bounds, tolerance)) {
        errors.push(
          `${definition.id} solid footprint is outside ${definition.roomId}.`
        );
      }
      reservedBlockers.forEach((blocker, index) => {
        if (rectanglesOverlap(bounds, blocker, tolerance)) {
          errors.push(`${definition.id} overlaps reserved blocker ${index}.`);
        }
      });
      solidAabbs.push({ definition, bounds });
    }

    if (definition.decorativeFootprint) {
      decorativeFootprints.push({
        id: `${definition.id}.decorative`,
        furnishingId: definition.id,
        category: definition.category,
        roomId: definition.roomId,
        bounds: createAabbFromCenterSize(
          definition.position,
          definition.decorativeFootprint
        ),
        allowOverlapWith: definition.allowDecorativeOverlapWith ?? [],
      });
    }
  });

  solidAabbs.forEach((entry, index) => {
    solidAabbs.slice(index + 1).forEach((other) => {
      if (rectanglesOverlap(entry.bounds, other.bounds, tolerance)) {
        errors.push(`${entry.definition.id} overlaps ${other.definition.id}.`);
      }
    });
  });

  decorativeFootprints.forEach((decorative) => {
    solidAabbs.forEach((solid) => {
      if (
        solid.definition.id !== decorative.furnishingId &&
        !decorative.allowOverlapWith.includes(solid.definition.id) &&
        rectanglesOverlap(decorative.bounds, solid.bounds, tolerance)
      ) {
        errors.push(
          `${decorative.id} overlaps ${solid.definition.id} without permission.`
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

const materialCache = new Map<number, MeshStandardMaterial>();

function getMaterial(color: number): MeshStandardMaterial {
  const cached = materialCache.get(color);
  if (cached) return cached;
  const material = new MeshStandardMaterial({
    color,
    roughness: 0.74,
    metalness: 0.06,
  });
  materialCache.set(color, material);
  return material;
}

function addBox(
  parent: Group,
  name: string,
  size: [number, number, number],
  color: number | Material
) {
  const mesh = new Mesh(
    new BoxGeometry(...size),
    typeof color === 'number' ? getMaterial(color) : color
  );
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addPrimitiveVisual(
  parent: Group,
  definition: LowerFloorFurnishingDefinition
): void {
  const footprint = definition.solidFootprint ??
    definition.decorativeFootprint ?? { width: 1, depth: 1 };
  const height =
    definition.visual?.height ??
    (definition.visual?.shape === 'flat' ? 0.05 : 0.8);
  const color = definition.visual?.color ?? 0x52627a;
  const y = definition.position.y ?? 0;

  if (definition.visual?.shape === 'cylinder') {
    const mesh = new Mesh(
      new CylinderGeometry(
        footprint.width / 2,
        footprint.width / 2,
        height,
        12
      ),
      getMaterial(color)
    );
    mesh.name = `Furnishing:${definition.id}:cylinder`;
    mesh.position.set(0, y + height / 2, 0);
    parent.add(mesh);
    return;
  }

  const body = addBox(
    parent,
    `Furnishing:${definition.id}:body`,
    [footprint.width, height, footprint.depth],
    color
  );
  body.position.set(0, y + height / 2, 0);

  if (definition.visual?.shape !== 'flat' && definition.solidFootprint) {
    const trimColor = definition.visual?.trimColor ?? 0x6e7d93;
    const trim = addBox(
      parent,
      `Furnishing:${definition.id}:trim`,
      [footprint.width + 0.08, 0.08, 0.08],
      trimColor
    );
    trim.position.set(0, y + height + 0.04, -footprint.depth / 2);
  }
}

export function createLowerFloorFurnishings(
  options: LowerFloorFurnishingsOptions = {}
): LowerFloorFurnishingsBuild {
  const definitions = options.definitions ?? DEFAULT_LOWER_FLOOR_FURNISHINGS;
  const group = new Group();
  group.name = 'LowerFloorFurnishings';
  const colliders: LowerFloorFurnishingCollider[] = [];

  definitions.forEach((definition) => {
    const furnishingGroup = new Group();
    furnishingGroup.name = `Furnishing:${definition.id}`;
    furnishingGroup.position.set(
      definition.position.x,
      definition.position.y ?? 0,
      definition.position.z
    );
    furnishingGroup.rotation.y = definition.orientationRadians;
    furnishingGroup.userData.lowerFloorFurnishing = {
      id: definition.id,
      category: definition.category,
      roomId: definition.roomId,
      kind: definition.kind,
    };
    addPrimitiveVisual(furnishingGroup, definition);
    group.add(furnishingGroup);

    if (definition.solidFootprint) {
      colliders.push({
        furnishingId: definition.id,
        category: definition.category,
        roomId: definition.roomId,
        kind: definition.kind,
        bounds: createAabbFromCenterSize(
          definition.position,
          definition.solidFootprint
        ),
        sourceId: getLowerFloorFurnishingColliderSourceId(definition),
      });
    }
  });

  return {
    group,
    colliders,
    decorativeFootprints:
      validateLowerFloorFurnishingPlan(definitions).decorativeFootprints,
  };
}
