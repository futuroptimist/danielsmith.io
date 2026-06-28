import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from 'three';

import type { RectCollider } from '../../systems/collision';

export type LowerFloorFurnishingCategory =
  | 'living-room-seating'
  | 'kitchenette'
  | 'storage'
  | 'sleeping-nook'
  | 'plants-lighting-decor'
  | 'backyard';

export type LowerFloorRoomId = 'livingRoom' | 'kitchen' | 'studio' | 'backyard';

export interface LowerFloorFurnishingPosition {
  x: number;
  y?: number;
  z: number;
}

export interface LowerFloorFurnishingFootprintSize {
  width: number;
  depth: number;
}

export interface LowerFloorFurnishingVisualDetail {
  color?: number;
  trimColor?: number;
  height?: number;
  trimHeight?: number;
  shape?: 'box' | 'cylinder' | 'flat';
  allowDecorativeOverlapWith?: readonly string[];
}

export interface LowerFloorFurnishingDefinition {
  id: string;
  category: LowerFloorFurnishingCategory;
  roomId: LowerFloorRoomId;
  position: LowerFloorFurnishingPosition;
  orientationRadians: number;
  solidFootprint?: LowerFloorFurnishingFootprintSize;
  decorativeFootprint?: LowerFloorFurnishingFootprintSize;
  kind: string;
  visual?: LowerFloorFurnishingVisualDetail;
}

export interface LowerFloorFurnishingDecorativeFootprint {
  id: string;
  furnishingId: string;
  category: LowerFloorFurnishingCategory;
  roomId: LowerFloorRoomId;
  kind: string;
  bounds: RectCollider;
  allowOverlapWith: readonly string[];
}

export type LowerFloorFurnishingCollider = RectCollider & {
  furnishingId: string;
  category: LowerFloorFurnishingCategory;
  roomId: LowerFloorRoomId;
  kind: string;
  sourceId: string;
  sourceType: 'generatedCollider';
  purpose: 'lower-floor-furnishing';
  role: LowerFloorFurnishingCategory;
  name: string;
};

export interface LowerFloorFurnishingsBuild {
  group: Group;
  colliders: LowerFloorFurnishingCollider[];
  decorativeFootprints: LowerFloorFurnishingDecorativeFootprint[];
}

export interface LowerFloorFurnishingValidationOptions {
  roomBounds?: Readonly<Record<LowerFloorRoomId, RectCollider>>;
  reservedBlockers?: readonly RectCollider[];
  overlapTolerance?: number;
}

export interface LowerFloorFurnishingsOptions {
  definitions?: readonly LowerFloorFurnishingDefinition[];
  y?: number;
  materials?: {
    solid?: Material;
    trim?: Material;
    decorative?: Material;
  };
}

export const LOWER_FLOOR_ROOM_BOUNDS: Readonly<
  Record<LowerFloorRoomId, RectCollider>
> = {
  livingRoom: { minX: -32, maxX: 32, minZ: -32, maxZ: -8 },
  kitchen: { minX: -32, maxX: -4, minZ: -8, maxZ: 16 },
  studio: { minX: -4, maxX: 32, minZ: -8, maxZ: 16 },
  backyard: { minX: -32, maxX: 32, minZ: 16, maxZ: 32 },
};

export const LOWER_FLOOR_FURNISHING_DEFINITIONS: readonly LowerFloorFurnishingDefinition[] =
  [];

export const createAabbFromCenterSize = (
  center: Pick<LowerFloorFurnishingPosition, 'x' | 'z'>,
  size: LowerFloorFurnishingFootprintSize
): RectCollider => ({
  minX: center.x - size.width / 2,
  maxX: center.x + size.width / 2,
  minZ: center.z - size.depth / 2,
  maxZ: center.z + size.depth / 2,
});

export const rectanglesOverlap = (
  a: RectCollider,
  b: RectCollider,
  tolerance = 0
): boolean =>
  a.minX < b.maxX - tolerance &&
  a.maxX > b.minX + tolerance &&
  a.minZ < b.maxZ - tolerance &&
  a.maxZ > b.minZ + tolerance;

export function validateLowerFloorFurnishingPlan(
  definitions: readonly LowerFloorFurnishingDefinition[],
  options: LowerFloorFurnishingValidationOptions = {}
): string[] {
  const roomBounds = options.roomBounds ?? LOWER_FLOOR_ROOM_BOUNDS;
  const reservedBlockers = options.reservedBlockers ?? [];
  const tolerance = options.overlapTolerance ?? 0;
  const errors: string[] = [];
  const solidRecords = definitions.flatMap((definition) => {
    if (!definition.solidFootprint) {
      return [];
    }

    const bounds = createAabbFromCenterSize(
      definition.position,
      definition.solidFootprint
    );
    return [{ definition, bounds }];
  });

  for (const { definition, bounds } of solidRecords) {
    if (bounds.maxX <= bounds.minX || bounds.maxZ <= bounds.minZ) {
      errors.push(
        `Furnishing ${definition.id} has a non-positive solid footprint.`
      );
    }

    const room = roomBounds[definition.roomId];
    if (
      bounds.minX < room.minX - tolerance ||
      bounds.maxX > room.maxX + tolerance ||
      bounds.minZ < room.minZ - tolerance ||
      bounds.maxZ > room.maxZ + tolerance
    ) {
      errors.push(
        `Furnishing ${definition.id} is outside declared room ${definition.roomId}.`
      );
    }
  }

  for (let index = 0; index < solidRecords.length; index += 1) {
    const current = solidRecords[index];
    for (
      let otherIndex = index + 1;
      otherIndex < solidRecords.length;
      otherIndex += 1
    ) {
      const other = solidRecords[otherIndex];
      if (rectanglesOverlap(current.bounds, other.bounds, tolerance)) {
        errors.push(
          `Furnishings ${current.definition.id} and ${other.definition.id} overlap.`
        );
      }
    }
  }

  for (const { definition, bounds } of solidRecords) {
    reservedBlockers.forEach((blocker, index) => {
      if (rectanglesOverlap(bounds, blocker, tolerance)) {
        errors.push(
          `Furnishing ${definition.id} overlaps reserved blocker ${index}.`
        );
      }
    });
  }

  for (const definition of definitions) {
    if (!definition.decorativeFootprint) {
      continue;
    }

    const decorativeBounds = createAabbFromCenterSize(
      definition.position,
      definition.decorativeFootprint
    );
    const allowed = new Set(
      definition.visual?.allowDecorativeOverlapWith ?? []
    );
    solidRecords.forEach(({ definition: solid, bounds }) => {
      if (solid.id === definition.id || allowed.has(solid.id)) {
        return;
      }

      if (rectanglesOverlap(decorativeBounds, bounds, tolerance)) {
        errors.push(
          `Decorative footprint ${definition.id} overlaps solid furnishing ${solid.id}.`
        );
      }
    });
  }

  return errors;
}

export function createLowerFloorFurnishings(
  options: LowerFloorFurnishingsOptions = {}
): LowerFloorFurnishingsBuild {
  const definitions = options.definitions ?? LOWER_FLOOR_FURNISHING_DEFINITIONS;
  const group = new Group();
  group.name = 'LowerFloorFurnishings';
  const colliders: LowerFloorFurnishingCollider[] = [];
  const decorativeFootprints: LowerFloorFurnishingDecorativeFootprint[] = [];
  const solidMaterial =
    options.materials?.solid ??
    new MeshStandardMaterial({ color: 0x5f6f89, roughness: 0.62 });
  const trimMaterial =
    options.materials?.trim ??
    new MeshStandardMaterial({ color: 0x273244, roughness: 0.58 });
  const decorativeMaterial =
    options.materials?.decorative ??
    new MeshStandardMaterial({ color: 0x46566f, roughness: 0.78 });

  definitions.forEach((definition) => {
    const furnishingGroup = new Group();
    furnishingGroup.name = `Furnishing:${definition.id}`;
    furnishingGroup.position.set(
      definition.position.x,
      definition.position.y ?? options.y ?? 0,
      definition.position.z
    );
    furnishingGroup.rotation.y = definition.orientationRadians;

    if (definition.solidFootprint) {
      addPrimitiveFurnishingMesh(
        furnishingGroup,
        definition,
        solidMaterial,
        trimMaterial
      );
      const bounds = createAabbFromCenterSize(
        definition.position,
        definition.solidFootprint
      );
      colliders.push({
        ...bounds,
        furnishingId: definition.id,
        category: definition.category,
        roomId: definition.roomId,
        kind: definition.kind,
        sourceId: `ground.furnishings.${definition.category}.${definition.id}.generated_collider`,
        sourceType: 'generatedCollider',
        purpose: 'lower-floor-furnishing',
        role: definition.category,
        name: `LowerFloorFurnishingCollider:${definition.id}`,
      });
    }

    if (definition.decorativeFootprint) {
      addFlatDecorativeMesh(furnishingGroup, definition, decorativeMaterial);
      decorativeFootprints.push({
        id: `decorative:${definition.id}`,
        furnishingId: definition.id,
        category: definition.category,
        roomId: definition.roomId,
        kind: definition.kind,
        bounds: createAabbFromCenterSize(
          definition.position,
          definition.decorativeFootprint
        ),
        allowOverlapWith: definition.visual?.allowDecorativeOverlapWith ?? [],
      });
    }

    group.add(furnishingGroup);
  });

  return { group, colliders, decorativeFootprints };
}

function addPrimitiveFurnishingMesh(
  group: Group,
  definition: LowerFloorFurnishingDefinition,
  material: Material,
  trimMaterial: Material
): void {
  const footprint = definition.solidFootprint;
  if (!footprint) return;

  const height = definition.visual?.height ?? 1.1;
  if (definition.visual?.shape === 'cylinder') {
    const radius = Math.min(footprint.width, footprint.depth) / 2;
    const mesh = new Mesh(
      new CylinderGeometry(radius, radius * 0.86, height, 16),
      material
    );
    mesh.name = `Furnishing:${definition.id}:cylinder`;
    mesh.position.y = height / 2;
    group.add(mesh);
    return;
  }

  const mesh = new Mesh(
    new BoxGeometry(footprint.width, height, footprint.depth),
    material
  );
  mesh.name = `Furnishing:${definition.id}:body`;
  mesh.position.y = height / 2;
  group.add(mesh);

  const trimHeight = definition.visual?.trimHeight ?? 0.08;
  const trim = new Mesh(
    new BoxGeometry(footprint.width + 0.08, trimHeight, 0.08),
    trimMaterial
  );
  trim.name = `Furnishing:${definition.id}:front-trim`;
  trim.position.set(0, height + trimHeight / 2, footprint.depth / 2 + 0.04);
  group.add(trim);
}

function addFlatDecorativeMesh(
  group: Group,
  definition: LowerFloorFurnishingDefinition,
  material: Material
): void {
  const footprint = definition.decorativeFootprint;
  if (!footprint) return;

  const mesh = new Mesh(
    new BoxGeometry(footprint.width, 0.04, footprint.depth),
    material
  );
  mesh.name = `Furnishing:${definition.id}:decorative-footprint`;
  mesh.position.y = 0.02;
  group.add(mesh);
}
