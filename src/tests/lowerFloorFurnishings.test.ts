import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOWER_FLOOR_FURNISHINGS,
  LOWER_FLOOR_RESERVED_BLOCKERS,
  LOWER_FLOOR_ROOM_BOUNDS,
  createLowerFloorFurnishings,
  rectanglesOverlap,
  validateLowerFloorFurnishingPlan,
  type LowerFloorFurnishingDefinition,
} from '../scene/structures/lowerFloorFurnishings';
import type { RectCollider } from '../systems/collision';

const validDefinitions: LowerFloorFurnishingDefinition[] = [
  {
    id: 'living-couch-foundation',
    category: 'living-room-seating',
    roomId: 'livingRoom',
    position: { x: -2, z: -21 },
    orientationRadians: 0,
    solidFootprint: { width: 5.2, depth: 1.4 },
    kind: 'couch',
  },
  {
    id: 'kitchen-counter-foundation',
    category: 'kitchenette',
    roomId: 'kitchen',
    position: { x: -9, z: 11 },
    orientationRadians: Math.PI / 2,
    solidFootprint: { width: 4, depth: 1.2 },
    kind: 'counter',
  },
  {
    id: 'studio-storage-foundation',
    category: 'storage',
    roomId: 'studio',
    position: { x: 25, z: 11 },
    orientationRadians: 0,
    solidFootprint: { width: 3, depth: 1.1 },
    kind: 'cabinet',
  },
  {
    id: 'studio-bed-foundation',
    category: 'sleeping-nook',
    roomId: 'studio',
    position: { x: 22, z: 6 },
    orientationRadians: 0,
    solidFootprint: { width: 4.5, depth: 2.2 },
    decorativeFootprint: { width: 5.2, depth: 2.8 },
    kind: 'bed-with-rug',
    visual: { allowDecorativeOverlapWithSolid: true },
  },
  {
    id: 'living-rug-foundation',
    category: 'plants-lighting-decor',
    roomId: 'livingRoom',
    position: { x: -2, z: -15 },
    orientationRadians: 0,
    decorativeFootprint: { width: 6, depth: 3 },
    kind: 'rug',
  },
  {
    id: 'backyard-planter-foundation',
    category: 'backyard',
    roomId: 'backyard',
    position: { x: 24, z: 21 },
    orientationRadians: 0,
    solidFootprint: { width: 2.2, depth: 2.2 },
    kind: 'plant-pot',
  },
];

const expectedLivingRoomMediaSolidBounds: Record<string, RectCollider> = {
  'living-room-media-sofa': {
    minX: -26.9,
    maxX: -25.3,
    minZ: -22.1,
    maxZ: -17.5,
  },
  'living-room-coffee-table': {
    minX: -23.6,
    maxX: -21.4,
    minZ: -19.0,
    maxZ: -17.8,
  },
  'living-room-side-table': {
    minX: -26.4,
    maxX: -25.6,
    minZ: -23.8,
    maxZ: -23.0,
  },
  'living-room-lounge-chair-north': {
    minX: -29.0,
    maxX: -27.6,
    minZ: -15.9,
    maxZ: -14.5,
  },
  'living-room-lounge-chair-east': {
    minX: -25.3,
    maxX: -23.9,
    minZ: -15.4,
    maxZ: -14.0,
  },
  'living-room-floor-lamp': {
    minX: -29.175,
    maxX: -28.625,
    minZ: -17.275,
    maxZ: -16.725,
  },
};

const expectedLivingRoomMediaRugBounds: RectCollider = {
  minX: -28.2,
  maxX: -21.2,
  minZ: -21.4,
  maxZ: -15.6,
};

describe('lower floor furnishings foundation', () => {
  it('renders the default living-room media seating plan', () => {
    const build = createLowerFloorFurnishings();

    expect(build.group.name).toBe('LowerFloorFurnishings');
    expect(build.group.children.map((child) => child.name)).toEqual(
      DEFAULT_LOWER_FLOOR_FURNISHINGS.map(
        (definition) => `Furnishing:${definition.id}`
      )
    );
    expect(build.colliders.map((collider) => collider.furnishingId)).toEqual(
      Object.keys(expectedLivingRoomMediaSolidBounds)
    );
    expect(build.decorativeFootprints).toHaveLength(1);
    expect(build.decorativeFootprints[0]).toMatchObject({
      furnishingId: 'living-room-media-rug',
      bounds: expectedLivingRoomMediaRugBounds,
      allowSolidOverlap: true,
    });
  });

  it('uses the specified living-room media seating solid AABBs', () => {
    const { colliders } = createLowerFloorFurnishings();

    Object.entries(expectedLivingRoomMediaSolidBounds).forEach(
      ([furnishingId, expectedBounds]) => {
        const collider = colliders.find(
          (candidate) => candidate.furnishingId === furnishingId
        );

        expect(collider).toMatchObject(expectedBounds);
      }
    );
  });

  it('creates positive-area AABBs for every solid furnishing', () => {
    const build = createLowerFloorFurnishings({
      definitions: validDefinitions,
    });
    const solidCount = validDefinitions.filter(
      (definition) => definition.solidFootprint
    ).length;

    expect(build.colliders).toHaveLength(solidCount);
    build.colliders.forEach((collider) => {
      expect(collider.maxX - collider.minX).toBeGreaterThan(0);
      expect(collider.maxZ - collider.minZ).toBeGreaterThan(0);
      expect(collider.sourceId).toBe(
        `ground.furnishings.${collider.category}.${collider.furnishingId}.generated_collider`
      );
    });
  });

  it('keeps every solid AABB within its declared room bounds', () => {
    const { colliders } = createLowerFloorFurnishings({
      definitions: validDefinitions,
    });

    colliders.forEach((collider) => {
      const room = LOWER_FLOOR_ROOM_BOUNDS[collider.roomId];
      expect(isContainedBy(room, collider)).toBe(true);
    });
  });

  it('prevents solid AABBs from overlapping other solids or reserved blockers', () => {
    const { colliders } = createLowerFloorFurnishings({
      definitions: validDefinitions,
    });

    colliders.forEach((collider, index) => {
      colliders.slice(index + 1).forEach((other) => {
        expect(rectanglesOverlap(collider, other)).toBe(false);
      });
      LOWER_FLOOR_RESERVED_BLOCKERS.forEach((blocker) => {
        expect(rectanglesOverlap(collider, blocker)).toBe(false);
      });
    });
  });

  it('allows decorative footprints to overlap associated solids only when explicit', () => {
    const { decorativeFootprints, colliders } = createLowerFloorFurnishings({
      definitions: validDefinitions,
    });

    const bedRug = decorativeFootprints.find(
      (footprint) => footprint.furnishingId === 'studio-bed-foundation'
    );
    const bedCollider = colliders.find(
      (collider) => collider.furnishingId === 'studio-bed-foundation'
    );

    expect(bedRug).toBeDefined();
    expect(bedCollider).toBeDefined();
    expect(bedRug?.allowSolidOverlap).toBe(true);
    expect(rectanglesOverlap(bedRug!.bounds, bedCollider!)).toBe(true);

    expect(() =>
      validateLowerFloorFurnishingPlan([
        {
          ...validDefinitions[3],
          id: 'studio-bed-rug-without-allowance',
          visual: { allowDecorativeOverlapWithSolid: false },
        },
      ])
    ).toThrow(/decorative footprint overlaps/);

    expect(() =>
      validateLowerFloorFurnishingPlan([
        validDefinitions[3],
        {
          id: 'studio-storage-under-bed-rug',
          category: 'storage',
          roomId: 'studio',
          position: { x: 24.45, z: 6 },
          orientationRadians: 0,
          solidFootprint: { width: 0.2, depth: 1.2 },
          kind: 'cabinet',
        },
      ])
    ).toThrow(
      /studio-bed-foundation decorative footprint overlaps studio-storage-under-bed-rug/
    );
  });

  it('validates authoring IDs and decorative footprint area before building', () => {
    expect(() =>
      validateLowerFloorFurnishingPlan([
        {
          ...validDefinitions[0],
          id: 'Invalid furnishing id',
        },
      ])
    ).toThrow(/not a valid furnishing ID/);

    expect(() =>
      validateLowerFloorFurnishingPlan([
        {
          ...validDefinitions[4],
          decorativeFootprint: { width: 0, depth: 3 },
        },
      ])
    ).toThrow(/empty decorative footprint/);
  });
});

function isContainedBy(container: RectCollider, bounds: RectCollider): boolean {
  return (
    bounds.minX >= container.minX &&
    bounds.maxX <= container.maxX &&
    bounds.minZ >= container.minZ &&
    bounds.maxZ <= container.maxZ
  );
}
