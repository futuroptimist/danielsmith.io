import { describe, expect, it } from 'vitest';

import {
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

const VALID_FOUNDATION_PLAN: readonly LowerFloorFurnishingDefinition[] = [
  {
    id: 'living-sectional-anchor',
    category: 'living-room-seating',
    roomId: 'livingRoom',
    position: { x: -2, z: -22 },
    orientationRadians: 0,
    solidFootprint: { width: 4, depth: 2 },
    decorativeFootprint: { width: 7, depth: 4 },
    allowDecorativeOverlapWithSolidIds: ['living-sectional-anchor'],
    kind: 'couch-foundation',
  },
  {
    id: 'kitchenette-counter-anchor',
    category: 'kitchenette',
    roomId: 'kitchen',
    position: { x: -27, z: 9 },
    orientationRadians: 0,
    solidFootprint: { width: 4, depth: 2 },
    kind: 'counter-foundation',
  },
  {
    id: 'studio-shelf-anchor',
    category: 'storage',
    roomId: 'studio',
    position: { x: 26, z: 7 },
    orientationRadians: Math.PI / 2,
    solidFootprint: { width: 4, depth: 1.2 },
    kind: 'shelf-foundation',
  },
  {
    id: 'studio-bed-anchor',
    category: 'sleeping-nook',
    roomId: 'studio',
    position: { x: 25, z: 13 },
    orientationRadians: 0,
    solidFootprint: { width: 4, depth: 3 },
    kind: 'bed-foundation',
  },
  {
    id: 'kitchen-planter-anchor',
    category: 'plants-lighting-decor',
    roomId: 'kitchen',
    position: { x: -29, z: -5 },
    orientationRadians: 0,
    solidFootprint: { width: 1, depth: 1 },
    kind: 'plant-pot-foundation',
    visual: { shape: 'cylinder' },
  },
  {
    id: 'backyard-bistro-anchor',
    category: 'backyard',
    roomId: 'backyard',
    position: { x: 25, z: 20 },
    orientationRadians: Math.PI / 4,
    solidFootprint: { width: 3, depth: 3 },
    kind: 'patio-table-foundation',
  },
];

describe('lower-floor furnishing foundations', () => {
  it('renders an empty/default plan without errors', () => {
    const build = createLowerFloorFurnishings();

    expect(build.group.name).toBe('LowerFloorFurnishings');
    expect(build.colliders).toEqual([]);
    expect(build.decorativeFootprints).toEqual([]);
  });

  it('creates positive-area AABBs for every solid furnishing', () => {
    const build = createLowerFloorFurnishings({
      definitions: VALID_FOUNDATION_PLAN,
    });

    expect(build.colliders).toHaveLength(
      VALID_FOUNDATION_PLAN.filter((definition) => definition.solidFootprint)
        .length
    );
    build.colliders.forEach((collider) => {
      expect(collider.bounds.maxX).toBeGreaterThan(collider.bounds.minX);
      expect(collider.bounds.maxZ).toBeGreaterThan(collider.bounds.minZ);
      expect(collider.sourceId).toBe(
        `ground.furnishings.${collider.category}.${collider.id}.generated_collider`
      );
    });
  });

  it('keeps every solid AABB inside its declared room and clear of blockers', () => {
    const result = validateLowerFloorFurnishingPlan(VALID_FOUNDATION_PLAN, {
      roomBounds: LOWER_FLOOR_ROOM_BOUNDS,
      reservedBlockers: RESERVED_BLOCKERS,
    });

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('detects solid-to-solid and reserved-blocker overlaps', () => {
    const result = validateLowerFloorFurnishingPlan(
      [
        ...VALID_FOUNDATION_PLAN,
        {
          id: 'bad-overlap',
          category: 'living-room-seating',
          roomId: 'livingRoom',
          position: { x: -2, z: -22 },
          orientationRadians: 0,
          solidFootprint: { width: 2, depth: 2 },
          kind: 'bad-chair',
        },
        {
          id: 'bad-blocker',
          category: 'backyard',
          roomId: 'backyard',
          position: { x: -14, z: 20 },
          orientationRadians: 0,
          solidFootprint: { width: 2, depth: 2 },
          kind: 'bad-grill',
        },
      ],
      {
        roomBounds: LOWER_FLOOR_ROOM_BOUNDS,
        reservedBlockers: RESERVED_BLOCKERS,
      }
    );

    expect(result.errors).toContain(
      'living-sectional-anchor overlaps bad-overlap.'
    );
    expect(result.errors).toContain(
      'bad-blocker overlaps reserved blocker 13.'
    );
  });

  it('requires decorative overlaps with solids to be explicitly allowed', () => {
    const result = validateLowerFloorFurnishingPlan(
      [
        {
          id: 'chair',
          category: 'living-room-seating',
          roomId: 'livingRoom',
          position: { x: 0, z: -18 },
          orientationRadians: 0,
          solidFootprint: { width: 2, depth: 2 },
          kind: 'chair',
        },
        {
          id: 'rug',
          category: 'plants-lighting-decor',
          roomId: 'livingRoom',
          position: { x: 0, z: -18 },
          orientationRadians: 0,
          decorativeFootprint: { width: 4, depth: 4 },
          kind: 'rug',
        },
      ],
      { roomBounds: LOWER_FLOOR_ROOM_BOUNDS }
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'rug decor overlaps chair without an allow-list entry.'
    );
  });

  it('keeps decorative footprints out of movement colliders', () => {
    const build = createLowerFloorFurnishings({
      definitions: VALID_FOUNDATION_PLAN,
    });

    expect(build.decorativeFootprints).toHaveLength(1);
    const decorativeBounds = build.decorativeFootprints[0].bounds;

    expect(build.colliders.map((collider) => collider.bounds)).not.toContain(
      decorativeBounds
    );
  });

  it('detects rotated rectangle intersections with tolerance support', () => {
    const first = createAabbFromCenterSize(
      { x: 0, z: 0 },
      { width: 2, depth: 4 },
      Math.PI / 4
    );
    const second = createAabbFromCenterSize(
      { x: 1, z: 1 },
      { width: 2, depth: 2 }
    );

    expect(rectanglesOverlap(first, second)).toBe(true);
    expect(
      rectanglesOverlap(first, { minX: 4, maxX: 5, minZ: 4, maxZ: 5 })
    ).toBe(false);
  });
});
