import { describe, expect, it } from 'vitest';

import {
  LOWER_FLOOR_FURNISHING_DEFINITIONS,
  LOWER_FLOOR_ROOM_BOUNDS,
  createAabbFromCenterSize,
  createLowerFloorFurnishings,
  rectanglesOverlap,
  validateLowerFloorFurnishingPlan,
  type LowerFloorFurnishingDefinition,
} from '../scene/structures/lowerFloorFurnishings';
import type { RectCollider } from '../systems/collision';

const RESERVED_BLOCKERS: readonly RectCollider[] = [
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

const SAMPLE_PLAN: readonly LowerFloorFurnishingDefinition[] = [
  {
    id: 'foundation-couch-placeholder',
    category: 'living-room-seating',
    roomId: 'livingRoom',
    position: { x: -2, z: -28 },
    orientationRadians: 0,
    solidFootprint: { width: 4, depth: 2 },
    kind: 'couch-placeholder',
  },
  {
    id: 'foundation-rug-placeholder',
    category: 'living-room-seating',
    roomId: 'livingRoom',
    position: { x: -2, z: -28 },
    orientationRadians: 0,
    decorativeFootprint: { width: 6, depth: 4 },
    kind: 'rug-placeholder',
    visual: { allowDecorativeOverlapWith: ['foundation-couch-placeholder'] },
  },
  {
    id: 'foundation-pot-placeholder',
    category: 'plants-lighting-decor',
    roomId: 'kitchen',
    position: { x: -29, z: 12 },
    orientationRadians: 0,
    solidFootprint: { width: 1, depth: 1 },
    kind: 'plant-pot-placeholder',
    visual: { shape: 'cylinder' },
  },
];

describe('lower-floor furnishings foundation', () => {
  it('renders the default empty plan without blocking or decorative records', () => {
    const build = createLowerFloorFurnishings();

    expect(LOWER_FLOOR_FURNISHING_DEFINITIONS).toHaveLength(0);
    expect(build.group.name).toBe('LowerFloorFurnishings');
    expect(build.colliders).toHaveLength(0);
    expect(build.decorativeFootprints).toHaveLength(0);
  });

  it('creates positive-area AABBs for every solid furnishing', () => {
    const build = createLowerFloorFurnishings({ definitions: SAMPLE_PLAN });

    expect(build.colliders.length).toBeGreaterThan(0);
    build.colliders.forEach((collider) => {
      expect(collider.maxX - collider.minX).toBeGreaterThan(0);
      expect(collider.maxZ - collider.minZ).toBeGreaterThan(0);
      expect(collider.sourceId).toBe(
        `ground.furnishings.${collider.category}.${collider.furnishingId}.generated_collider`
      );
    });
  });

  it('keeps every solid AABB inside its declared lower-floor room', () => {
    for (const definition of SAMPLE_PLAN) {
      if (!definition.solidFootprint) continue;

      const bounds = createAabbFromCenterSize(
        definition.position,
        definition.solidFootprint
      );
      const room = LOWER_FLOOR_ROOM_BOUNDS[definition.roomId];
      expect(bounds.minX).toBeGreaterThanOrEqual(room.minX);
      expect(bounds.maxX).toBeLessThanOrEqual(room.maxX);
      expect(bounds.minZ).toBeGreaterThanOrEqual(room.minZ);
      expect(bounds.maxZ).toBeLessThanOrEqual(room.maxZ);
    }
  });

  it('prevents solid furnishings from overlapping each other', () => {
    const solidBounds = SAMPLE_PLAN.filter(
      (definition) => definition.solidFootprint
    ).map((definition) => ({
      id: definition.id,
      bounds: createAabbFromCenterSize(
        definition.position,
        definition.solidFootprint!
      ),
    }));

    for (let index = 0; index < solidBounds.length; index += 1) {
      for (
        let otherIndex = index + 1;
        otherIndex < solidBounds.length;
        otherIndex += 1
      ) {
        expect(
          rectanglesOverlap(
            solidBounds[index].bounds,
            solidBounds[otherIndex].bounds
          )
        ).toBe(false);
      }
    }
  });

  it('prevents solid furnishings from overlapping reserved blockers', () => {
    const errors = validateLowerFloorFurnishingPlan(SAMPLE_PLAN, {
      reservedBlockers: RESERVED_BLOCKERS,
    });

    expect(errors).toEqual([]);
  });

  it('allows decorative footprints to overlap associated furniture only when explicit', () => {
    expect(validateLowerFloorFurnishingPlan(SAMPLE_PLAN)).toEqual([]);

    const disallowedPlan = SAMPLE_PLAN.map((definition) =>
      definition.id === 'foundation-rug-placeholder'
        ? { ...definition, visual: { allowDecorativeOverlapWith: [] } }
        : definition
    );

    expect(validateLowerFloorFurnishingPlan(disallowedPlan)).toContain(
      'Decorative footprint foundation-rug-placeholder overlaps solid furnishing foundation-couch-placeholder.'
    );
  });
});
