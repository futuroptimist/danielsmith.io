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
    allowDecorativeOverlapWithFurnishingIds?: readonly string[];
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
      solidBounds: { minX: -26.9, maxX: -25.3, minZ: -22.1, maxZ: -17.5 },
      kind: 'media-sofa',
      visual: { color: 0x2f4052, accentColor: 0xd9c8af, height: 0.72 },
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
      visual: { color: 0x8c6a4a, accentColor: 0x2c3440, height: 0.42 },
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
      visual: { color: 0x6f563c, accentColor: 0x1f2937, height: 0.55 },
    },
    {
      id: 'living-room-lounge-chair-north',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -28.3, z: -15.2 },
      orientationRadians: Math.PI * 0.72,
      solidFootprint: { width: 1.4, depth: 1.4 },
      solidBounds: { minX: -29.0, maxX: -27.6, minZ: -15.9, maxZ: -14.5 },
      kind: 'lounge-chair',
      visual: { color: 0x465c6f, accentColor: 0xe5d2b8, height: 0.68 },
    },
    {
      id: 'living-room-lounge-chair-east',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -24.6, z: -14.7 },
      orientationRadians: Math.PI * 0.82,
      solidFootprint: { width: 1.4, depth: 1.4 },
      solidBounds: { minX: -25.3, maxX: -23.9, minZ: -15.4, maxZ: -14.0 },
      kind: 'lounge-chair',
      visual: { color: 0x516a5a, accentColor: 0xe5d2b8, height: 0.68 },
    },
    {
      id: 'living-room-floor-lamp',
      category: 'living-room-seating',
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
      visual: { color: 0x2f3542, accentColor: 0xffd98a, height: 1.95 },
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
        color: 0x39505f,
        accentColor: 0xd7b56d,
        decorativeHeight: 0.028,
        allowDecorativeOverlapWithSolid: true,
        allowDecorativeOverlapWithFurnishingIds: [
          'living-room-media-sofa',
          'living-room-coffee-table',
          'living-room-side-table',
          'living-room-lounge-chair-north',
          'living-room-lounge-chair-east',
          'living-room-floor-lamp',
        ],
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
    const bounds = getFootprintBounds(definition, 'solid');
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
    const bounds = getFootprintBounds(definition, 'decorative');
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
        definition.visual?.allowDecorativeOverlapWithSolid &&
        (isAssociatedSolid ||
          definition.visual.allowDecorativeOverlapWithFurnishingIds?.includes(
            solid.definition.id
          ))
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
      const bounds = getFootprintBounds(definition, 'solid');
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
        bounds: getFootprintBounds(definition, 'decorative'),
        allowSolidOverlap:
          definition.visual?.allowDecorativeOverlapWithSolid ?? false,
      });
    }

    group.add(furnishing);
  });

  return { group, colliders, decorativeFootprints };
}

function createSolidPrimitive(
  definition: LowerFloorFurnishingDefinition
): Group {
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

  if (definition.kind === 'media-sofa') {
    return createMediaSofaPrimitive(definition, material, accent);
  }
  if (definition.kind === 'coffee-table' || definition.kind === 'side-table') {
    return createTablePrimitive(definition, material, accent);
  }
  if (definition.kind === 'lounge-chair') {
    return createLoungeChairPrimitive(definition, material, accent);
  }
  if (definition.kind === 'floor-lamp') {
    return createFloorLampPrimitive(definition, material, accent);
  }

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

function createMediaSofaPrimitive(
  definition: LowerFloorFurnishingDefinition,
  material: MeshStandardMaterial,
  accent: MeshStandardMaterial
): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const group = new Group();
  const seat = new Mesh(
    new BoxGeometry(footprint.width, 0.34, footprint.depth),
    material
  );
  seat.name = `Furnishing:${definition.id}:lowSeat`;
  seat.position.y = 0.34;
  group.add(seat);

  const back = new Mesh(
    new BoxGeometry(0.24, 0.86, footprint.depth + 0.12),
    material
  );
  back.name = `Furnishing:${definition.id}:westFacingBack`;
  back.position.set(footprint.width / 2 - 0.12, 0.61, 0);
  group.add(back);

  [-1, 1].forEach((side) => {
    const arm = new Mesh(
      new BoxGeometry(footprint.width, 0.58, 0.18),
      material
    );
    arm.name = `Furnishing:${definition.id}:arm:${side}`;
    arm.position.set(0, 0.51, side * (footprint.depth / 2 - 0.09));
    group.add(arm);
  });

  [-1.45, 0, 1.45].forEach((z, index) => {
    const cushion = new Mesh(new BoxGeometry(0.1, 0.42, 1.0), accent);
    cushion.name = `Furnishing:${definition.id}:backPillow:${index}`;
    cushion.position.set(footprint.width / 2 - 0.27, 0.71, z);
    group.add(cushion);
  });

  [-1.45, 0, 1.45].forEach((z, index) => {
    const cushion = new Mesh(new BoxGeometry(0.95, 0.08, 1.0), accent);
    cushion.name = `Furnishing:${definition.id}:seatCushion:${index}`;
    cushion.position.set(-0.18, 0.55, z);
    group.add(cushion);
  });

  addFurnitureFeet(
    group,
    definition.id,
    footprint.width,
    footprint.depth,
    0.22
  );
  return group;
}

function createTablePrimitive(
  definition: LowerFloorFurnishingDefinition,
  material: MeshStandardMaterial,
  accent: MeshStandardMaterial
): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const topHeight = definition.kind === 'coffee-table' ? 0.16 : 0.12;
  const legHeight = (definition.visual?.height ?? 0.44) - topHeight;
  const group = new Group();
  const top = new Mesh(
    new BoxGeometry(footprint.width, topHeight, footprint.depth),
    material
  );
  top.name = `Furnishing:${definition.id}:tableTop`;
  top.position.y = legHeight + topHeight / 2;
  group.add(top);
  addTableLegs(
    group,
    definition.id,
    footprint.width,
    footprint.depth,
    legHeight,
    accent
  );
  return group;
}

function createLoungeChairPrimitive(
  definition: LowerFloorFurnishingDefinition,
  material: MeshStandardMaterial,
  accent: MeshStandardMaterial
): Group {
  const group = new Group();
  const seat = new Mesh(new BoxGeometry(1.12, 0.32, 1.0), material);
  seat.name = `Furnishing:${definition.id}:angledSeat`;
  seat.position.y = 0.32;
  group.add(seat);
  const back = new Mesh(new BoxGeometry(1.12, 0.74, 0.22), material);
  back.name = `Furnishing:${definition.id}:angledBack`;
  back.position.set(0, 0.62, 0.39);
  group.add(back);
  const pillow = new Mesh(new BoxGeometry(0.82, 0.36, 0.14), accent);
  pillow.name = `Furnishing:${definition.id}:accentPillow`;
  pillow.position.set(0, 0.67, 0.24);
  group.add(pillow);
  addFurnitureFeet(group, definition.id, 1.08, 0.92, 0.18);
  return group;
}

function createFloorLampPrimitive(
  definition: LowerFloorFurnishingDefinition,
  material: MeshStandardMaterial,
  accent: MeshStandardMaterial
): Group {
  const group = new Group();
  const pole = new Mesh(new CylinderGeometry(0.045, 0.045, 1.55, 12), material);
  pole.name = `Furnishing:${definition.id}:slimPole`;
  pole.position.y = 0.85;
  group.add(pole);
  const base = new Mesh(new CylinderGeometry(0.22, 0.26, 0.08, 16), material);
  base.name = `Furnishing:${definition.id}:weightedBase`;
  base.position.y = 0.04;
  group.add(base);
  const shade = new Mesh(new CylinderGeometry(0.28, 0.38, 0.38, 16), accent);
  shade.name = `Furnishing:${definition.id}:warmShade`;
  shade.position.y = 1.66;
  group.add(shade);
  const bulbMaterial = new MeshStandardMaterial({
    color: 0xfff1b8,
    emissive: 0xffd98a,
    emissiveIntensity: 1.4,
  });
  const bulb = new Mesh(
    new CylinderGeometry(0.11, 0.11, 0.12, 12),
    bulbMaterial
  );
  bulb.name = `Furnishing:${definition.id}:warmBulb`;
  bulb.position.y = 1.56;
  group.add(bulb);
  const light = new PointLight(0xffd98a, 0.7, 4);
  light.name = `Furnishing:${definition.id}:warmLight`;
  light.position.y = 1.65;
  group.add(light);
  return group;
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

function addFurnitureFeet(
  group: Group,
  id: string,
  width: number,
  depth: number,
  height: number
): void {
  const footMaterial = new MeshStandardMaterial({
    color: 0x171923,
    roughness: 0.7,
  });
  const footGeometry = new BoxGeometry(0.12, height, 0.12);
  [-1, 1].forEach((xSide) => {
    [-1, 1].forEach((zSide) => {
      const foot = new Mesh(footGeometry, footMaterial);
      foot.name = `Furnishing:${id}:foot:${xSide}:${zSide}`;
      foot.position.set(
        xSide * (width / 2 - 0.18),
        height / 2,
        zSide * (depth / 2 - 0.18)
      );
      group.add(foot);
    });
  });
}

function addTableLegs(
  group: Group,
  id: string,
  width: number,
  depth: number,
  height: number,
  material: MeshStandardMaterial
): void {
  const legGeometry = new BoxGeometry(0.09, height, 0.09);
  [-1, 1].forEach((xSide) => {
    [-1, 1].forEach((zSide) => {
      const leg = new Mesh(legGeometry, material);
      leg.name = `Furnishing:${id}:slimLeg:${xSide}:${zSide}`;
      leg.position.set(
        xSide * (width / 2 - 0.18),
        height / 2,
        zSide * (depth / 2 - 0.18)
      );
      group.add(leg);
    });
  });
}

function getFootprintBounds(
  definition: LowerFloorFurnishingDefinition,
  footprintType: 'solid' | 'decorative'
): RectCollider {
  const explicitBounds =
    footprintType === 'solid'
      ? definition.solidBounds
      : definition.decorativeBounds;
  if (explicitBounds) return explicitBounds;
  const footprint =
    footprintType === 'solid'
      ? definition.solidFootprint
      : definition.decorativeFootprint;
  if (!footprint)
    return createAabbFromCenterSize(definition.position, {
      width: 0,
      depth: 0,
    });
  return createRotatedAabb(definition, footprint);
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
