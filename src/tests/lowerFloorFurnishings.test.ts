import { describe, expect, it } from 'vitest';

import {
  LOWER_FLOOR_RESERVED_BLOCKERS,
  LOWER_FLOOR_ROOM_BOUNDS,
  createLowerFloorFurnishings,
  rectanglesOverlap,
  validateLowerFloorFurnishingPlan,
  type LowerFloorFurnishingDefinition,
} from '../scene/structures/lowerFloorFurnishings';

const TEST_FURNISHINGS: readonly LowerFloorFurnishingDefinition[] = [
  {
    id: 'test-living-couch',
    category: 'living-room-seating',
    roomId: 'livingRoom',
    position: { x: -4, z: -18 },
    orientationRadians: 0,
    solidFootprint: { width: 5.2, depth: 1.4 },
    kind: 'couch',
    visual: { color: 0x4c668f, height: 0.9 },
  },
  {
    id: 'test-kitchen-counter',
    category: 'kitchenette',
    roomId: 'kitchen',
    position: { x: -29, z: 8 },
    orientationRadians: Math.PI / 2,
    solidFootprint: { width: 3.2, depth: 1.1 },
    kind: 'counter',
  },
  {
    id: 'test-studio-storage',
    category: 'storage',
    roomId: 'studio',
    position: { x: 27, z: 8 },
    orientationRadians: -Math.PI / 2,
    solidFootprint: { width: 2.4, depth: 1 },
    kind: 'cabinet',
  },
  {
    id: 'test-backyard-planter',
    category: 'backyard',
    roomId: 'backyard',
    position: { x: 26, z: 24 },
    orientationRadians: 0,
    solidFootprint: { width: 1.6, depth: 1.6 },
    kind: 'planter',
    visual: { shape: 'cylinder', color: 0x556b49, height: 1 },
  },
  {
    id: 'test-living-rug',
    category: 'plants-lighting-decor',
    roomId: 'livingRoom',
    position: { x: -4, z: -18 },
    orientationRadians: 0,
    decorativeFootprint: { width: 7, depth: 3.4 },
    kind: 'rug',
    visual: { shape: 'flat', color: 0x7a5a42, height: 0.04 },
    allowDecorativeOverlapWith: ['test-living-couch'],
  },
];

const area = (bounds: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}) => (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);

const contains = (
  outer: { minX: number; maxX: number; minZ: number; maxZ: number },
  inner: { minX: number; maxX: number; minZ: number; maxZ: number }
) =>
  inner.minX >= outer.minX &&
  inner.maxX <= outer.maxX &&
  inner.minZ >= outer.minZ &&
  inner.maxZ <= outer.maxZ;

describe('lower-floor furnishings', () => {
  it('renders an empty default plan without movement colliders', () => {
    const build = createLowerFloorFurnishings();

    expect(build.group.name).toBe('LowerFloorFurnishings');
    expect(build.colliders).toEqual([]);
    expect(build.decorativeFootprints).toEqual([]);
  });

  it('creates blocking colliders only for solid furnishings', () => {
    const build = createLowerFloorFurnishings({
      definitions: TEST_FURNISHINGS,
    });

    expect(build.group.children.map((child) => child.name)).toContain(
      'Furnishing:test-living-couch'
    );
    expect(build.colliders).toHaveLength(4);
    expect(build.decorativeFootprints).toHaveLength(1);
    expect(build.decorativeFootprints[0].furnishingId).toBe('test-living-rug');
    expect(
      build.colliders.map((collider) => collider.furnishingId)
    ).not.toContain('test-living-rug');
  });

  it('validates solid furnishing AABBs against rooms, peers, and reserved blockers', () => {
    const validation = validateLowerFloorFurnishingPlan(TEST_FURNISHINGS);

    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);

    validation.solidAabbs.forEach(({ definition, bounds }) => {
      expect(area(bounds)).toBeGreaterThan(0);
      expect(contains(LOWER_FLOOR_ROOM_BOUNDS[definition.roomId], bounds)).toBe(
        true
      );
      LOWER_FLOOR_RESERVED_BLOCKERS.forEach((blocker) => {
        expect(rectanglesOverlap(bounds, blocker)).toBe(false);
      });
    });

    validation.solidAabbs.forEach((entry, index) => {
      validation.solidAabbs.slice(index + 1).forEach((other) => {
        expect(rectanglesOverlap(entry.bounds, other.bounds)).toBe(false);
      });
    });
  });

  it('requires decorative footprints to explicitly allow solid furniture overlaps', () => {
    const allowed = validateLowerFloorFurnishingPlan(TEST_FURNISHINGS);
    expect(allowed.valid).toBe(true);

    const disallowed = validateLowerFloorFurnishingPlan(
      TEST_FURNISHINGS.map((definition) =>
        definition.id === 'test-living-rug'
          ? { ...definition, allowDecorativeOverlapWith: [] }
          : definition
      )
    );

    expect(disallowed.valid).toBe(false);
    expect(disallowed.errors).toContain(
      'test-living-rug.decorative overlaps test-living-couch without permission.'
    );
  });
});
