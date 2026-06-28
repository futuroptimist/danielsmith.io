import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
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
  kind: string;
  colliderIgnoresOrientation?: boolean;
  visual?: {
    color?: ColorRepresentation;
    accentColor?: ColorRepresentation;
    height?: number;
    decorativeHeight?: number;
    allowDecorativeOverlapWithSolid?: boolean;
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
      colliderIgnoresOrientation: true,
      solidFootprint: { width: 1.6, depth: 4.6 },
      kind: 'media-sofa',
      visual: { color: 0x475569, accentColor: 0xcbd5e1, height: 0.82 },
    },
    {
      id: 'living-room-coffee-table',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -22.5, z: -18.4 },
      orientationRadians: 0,
      colliderIgnoresOrientation: true,
      solidFootprint: { width: 2.2, depth: 1.2 },
      kind: 'coffee-table',
      visual: { color: 0x7c4a2d, accentColor: 0xe2e8f0, height: 0.42 },
    },
    {
      id: 'living-room-side-table',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -26.0, z: -23.4 },
      orientationRadians: 0,
      colliderIgnoresOrientation: true,
      solidFootprint: { width: 0.8, depth: 0.8 },
      kind: 'side-table',
      visual: { color: 0x7c4a2d, accentColor: 0xf8fafc, height: 0.55 },
    },
    {
      id: 'living-room-lounge-chair-north',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -28.3, z: -15.2 },
      orientationRadians: Math.PI * 0.72,
      colliderIgnoresOrientation: true,
      solidFootprint: { width: 1.4, depth: 1.4 },
      kind: 'lounge-chair',
      visual: { color: 0x64748b, accentColor: 0xf1f5f9, height: 0.72 },
    },
    {
      id: 'living-room-lounge-chair-east',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -24.6, z: -14.7 },
      orientationRadians: Math.PI * 0.82,
      colliderIgnoresOrientation: true,
      solidFootprint: { width: 1.4, depth: 1.4 },
      kind: 'lounge-chair',
      visual: { color: 0x64748b, accentColor: 0xf1f5f9, height: 0.72 },
    },
    {
      id: 'living-room-floor-lamp',
      category: 'plants-lighting-decor',
      roomId: 'livingRoom',
      position: { x: -28.9, z: -17.0 },
      orientationRadians: 0,
      colliderIgnoresOrientation: true,
      solidFootprint: { width: 0.55, depth: 0.55 },
      kind: 'floor-lamp',
      visual: { color: 0x1e293b, accentColor: 0xfacc15, height: 1.8 },
    },
    {
      id: 'living-room-media-rug',
      category: 'living-room-seating',
      roomId: 'livingRoom',
      position: { x: -24.7, z: -18.5 },
      orientationRadians: 0,
      colliderIgnoresOrientation: true,
      decorativeFootprint: { width: 7.0, depth: 5.8 },
      kind: 'media-rug',
      visual: {
        color: 0x1e3a5f,
        accentColor: 0x38bdf8,
        decorativeHeight: 0.025,
        allowDecorativeOverlapWithSolid: true,
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
      if (definition.visual?.allowDecorativeOverlapWithSolid) {
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
  if (definition.kind === 'media-sofa')
    return createMediaSofaPrimitive(definition);
  if (definition.kind === 'coffee-table')
    return createTablePrimitive(definition, false);
  if (definition.kind === 'side-table')
    return createTablePrimitive(definition, true);
  if (definition.kind === 'lounge-chair')
    return createLoungeChairPrimitive(definition);
  if (definition.kind === 'floor-lamp')
    return createFloorLampPrimitive(definition);

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

function createMediaSofaPrimitive(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const material = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x475569,
  });
  const accent = new MeshStandardMaterial({
    color: definition.visual?.accentColor ?? 0xcbd5e1,
  });
  const dark = new MeshStandardMaterial({ color: 0x0f172a });
  const group = new Group();
  const seat = new Mesh(
    new BoxGeometry(footprint.width, 0.32, footprint.depth),
    material
  );
  seat.name = `Furnishing:${definition.id}:lowSeat`;
  seat.position.y = 0.34;
  group.add(seat);
  const back = new Mesh(new BoxGeometry(0.22, 0.82, footprint.depth), material);
  back.name = `Furnishing:${definition.id}:westFacingBack`;
  back.position.set(footprint.width / 2 - 0.11, 0.66, 0);
  group.add(back);
  [-1, 1].forEach((side) => {
    const arm = new Mesh(
      new BoxGeometry(footprint.width, 0.54, 0.18),
      material
    );
    arm.name = `Furnishing:${definition.id}:arm:${side}`;
    arm.position.set(0, 0.55, side * (footprint.depth / 2 - 0.09));
    group.add(arm);
  });
  [-1.45, 0, 1.45].forEach((z) => {
    const pillow = new Mesh(new BoxGeometry(0.14, 0.44, 0.84), accent);
    pillow.name = `Furnishing:${definition.id}:backPillow`;
    pillow.position.set(footprint.width / 2 - 0.25, 0.76, z);
    group.add(pillow);
  });
  [-0.48, 0.48].forEach((x) => {
    [-1.85, 1.85].forEach((z) => {
      const foot = new Mesh(new BoxGeometry(0.12, 0.18, 0.12), dark);
      foot.name = `Furnishing:${definition.id}:foot`;
      foot.position.set(x, 0.09, z);
      group.add(foot);
    });
  });
  return group;
}

function createTablePrimitive(
  definition: LowerFloorFurnishingDefinition,
  roundTop: boolean
): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const height = definition.visual?.height ?? 0.45;
  const wood = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x7c4a2d,
  });
  const leg = new MeshStandardMaterial({ color: 0x111827 });
  const group = new Group();
  const top = new Mesh(
    new BoxGeometry(footprint.width, 0.14, footprint.depth),
    wood
  );
  top.name = `Furnishing:${definition.id}:${roundTop ? 'compactTop' : 'rectangularTop'}`;
  top.position.y = height;
  group.add(top);
  [-1, 1].forEach((xSign) => {
    [-1, 1].forEach((zSign) => {
      const tableLeg = new Mesh(new BoxGeometry(0.08, height, 0.08), leg);
      tableLeg.name = `Furnishing:${definition.id}:slimLeg`;
      tableLeg.position.set(
        xSign * (footprint.width / 2 - 0.18),
        height / 2,
        zSign * (footprint.depth / 2 - 0.18)
      );
      group.add(tableLeg);
    });
  });
  return group;
}

function createLoungeChairPrimitive(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 1, depth: 1 };
  const fabric = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x64748b,
  });
  const accent = new MeshStandardMaterial({
    color: definition.visual?.accentColor ?? 0xf1f5f9,
  });
  const group = new Group();
  const seat = new Mesh(
    new BoxGeometry(footprint.width, 0.28, footprint.depth * 0.75),
    fabric
  );
  seat.name = `Furnishing:${definition.id}:angledSeat`;
  seat.position.y = 0.32;
  group.add(seat);
  const back = new Mesh(new BoxGeometry(footprint.width, 0.68, 0.18), fabric);
  back.name = `Furnishing:${definition.id}:chairBack`;
  back.position.set(0, 0.62, footprint.depth * 0.29);
  group.add(back);
  const pillow = new Mesh(
    new BoxGeometry(footprint.width * 0.56, 0.28, 0.12),
    accent
  );
  pillow.name = `Furnishing:${definition.id}:throwPillow`;
  pillow.position.set(0, 0.66, footprint.depth * 0.18);
  group.add(pillow);
  return group;
}

function createFloorLampPrimitive(
  definition: LowerFloorFurnishingDefinition
): Group {
  const footprint = definition.solidFootprint ?? { width: 0.55, depth: 0.55 };
  const height = definition.visual?.height ?? 1.8;
  const metal = new MeshStandardMaterial({
    color: definition.visual?.color ?? 0x1e293b,
  });
  const glow = new MeshStandardMaterial({
    color: definition.visual?.accentColor ?? 0xfacc15,
    emissive: definition.visual?.accentColor ?? 0xfacc15,
    emissiveIntensity: 0.8,
  });
  const group = new Group();
  const base = new Mesh(
    new CylinderGeometry(footprint.width / 2, footprint.width / 2, 0.08, 16),
    metal
  );
  base.name = `Furnishing:${definition.id}:weightedBase`;
  base.position.y = 0.04;
  group.add(base);
  const pole = new Mesh(
    new CylinderGeometry(0.035, 0.035, height * 0.72, 12),
    metal
  );
  pole.name = `Furnishing:${definition.id}:slimPole`;
  pole.position.y = height * 0.36 + 0.08;
  group.add(pole);
  const shade = new Mesh(new CylinderGeometry(0.28, 0.38, 0.42, 16), glow);
  shade.name = `Furnishing:${definition.id}:warmShade`;
  shade.position.y = height * 0.82;
  group.add(shade);
  const bulb = new Mesh(new SphereGeometry(0.12, 12, 8), glow);
  bulb.name = `Furnishing:${definition.id}:emissiveBulb`;
  bulb.position.y = height * 0.78;
  group.add(bulb);
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

function createRotatedAabb(
  definition: LowerFloorFurnishingDefinition,
  footprint: LowerFloorFurnishingFootprint
): RectCollider {
  if (definition.colliderIgnoresOrientation) {
    return createAabbFromCenterSize(definition.position, footprint);
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
