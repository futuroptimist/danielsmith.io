import { Box3, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createBackyardFenceColliders,
  createBackyardFenceSegments,
} from '../scene/level/backyardCollisionPolicies';
import { UPPER_FLOOR_TOP_ELEVATION } from '../scene/level/floorElevations';
import { isLevelSourceId } from '../scene/level/sourceIds';
import { MANUAL_POI_PLACEMENTS } from '../scene/poi/placements';
import {
  LOWER_FLOOR_RESERVED_BLOCKERS,
  LOWER_FLOOR_ROOM_BOUNDS,
  DEFAULT_LOWER_FLOOR_FURNISHINGS,
  DEFAULT_UPPER_FLOOR_FURNISHINGS,
  UPPER_FLOOR_RESERVED_BLOCKERS,
  UPPER_FLOOR_ROOM_BOUNDS,
  createLowerFloorFurnishings,
  createUpperFloorFurnishings,
  rectanglesOverlap,
  validateLowerFloorFurnishingPlan,
  validateUpperFloorFurnishingPlan,
  type FloorFurnishingCollider,
  type FloorFurnishingFloorId,
  type LowerFloorFurnishingCategory,
  type LowerFloorFurnishingDefinition,
  type UpperFloorFurnishingCategory,
  type UpperFloorFurnishingDefinition,
} from '../scene/structures/lowerFloorFurnishings';
import type { RectCollider } from '../systems/collision';

const validDefinitions: LowerFloorFurnishingDefinition[] = [
  {
    id: 'living-couch-foundation',
    category: 'living-room-seating',
    roomId: 'livingRoom',
    position: { x: -16, z: -21 },
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

function expectRectToBeCloseTo(
  actual: RectCollider,
  expected: RectCollider
): void {
  expect(actual.minX).toBeCloseTo(expected.minX, 6);
  expect(actual.maxX).toBeCloseTo(expected.maxX, 6);
  expect(actual.minZ).toBeCloseTo(expected.minZ, 6);
  expect(actual.maxZ).toBeCloseTo(expected.maxZ, 6);
}

function expectColliderBoundsToBeCloseTo(
  colliders: FloorFurnishingCollider<string, string>[],
  furnishingId: string,
  expected: RectCollider
): void {
  const collider = colliders.find(
    ({ furnishingId: colliderFurnishingId }) =>
      colliderFurnishingId === furnishingId
  );

  expect(collider).toBeDefined();
  if (!collider) return;

  expectRectToBeCloseTo(collider, expected);
}

describe('lower floor furnishings foundation', () => {
  it('keeps the complete lower-floor inventory accounted for by category', () => {
    const { colliders, decorativeFootprints, group } =
      createLowerFloorFurnishings();
    const expectedByCategory: Record<LowerFloorFurnishingCategory, number> = {
      'living-room-seating': 9,
      kitchenette: 13,
      storage: 9,
      'sleeping-nook': 7,
      'plants-lighting-decor': 17,
      backyard: 20,
    };

    expect(group.children).toHaveLength(DEFAULT_LOWER_FLOOR_FURNISHINGS.length);
    expect(countDefinitionsByCategory(DEFAULT_LOWER_FLOOR_FURNISHINGS)).toEqual(
      expectedByCategory
    );
    expect(colliders).toHaveLength(
      DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
        (definition) => definition.solidFootprint
      ).length
    );
    expect(decorativeFootprints).toHaveLength(
      DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
        (definition) => definition.decorativeFootprint
      ).length
    );
  });

  it('keeps every default lower furnishing collider finite, in-room, unique, and routed ground', () => {
    const { colliders } = createLowerFloorFurnishings();

    expectCompleteColliderMetadata({
      colliders,
      definitions: DEFAULT_LOWER_FLOOR_FURNISHINGS,
      floorId: 'ground',
      roomBounds: LOWER_FLOOR_ROOM_BOUNDS,
    });
  });

  it('keeps every default lower furnishing clear of solids and reserved blockers', () => {
    const { colliders } = createLowerFloorFurnishings();

    expectNoColliderOverlaps(
      colliders,
      LOWER_FLOOR_RESERVED_BLOCKERS,
      'lower floor'
    );
  });

  it('renders the default living-room media seating cluster', () => {
    const build = createLowerFloorFurnishings();

    expect(build.group.name).toBe('LowerFloorFurnishings');
    expect(build.colliders).toHaveLength(59);
    expect(build.decorativeFootprints).toHaveLength(5);
    expect(DEFAULT_LOWER_FLOOR_FURNISHINGS.map(({ id }) => id)).toEqual([
      'living-room-media-sofa',
      'living-room-coffee-table',
      'living-room-side-table',
      'living-room-lounge-chair-north',
      'living-room-lounge-chair-east',
      'living-room-floor-lamp',
      'living-room-large-plant',
      'living-room-plant-stool',
      'kitchen-herb-planter',
      'kitchen-pendant-lights',
      'kitchen-west-counter-run',
      'kitchen-fridge',
      'kitchen-sink-cabinet',
      'kitchen-stove-cabinet',
      'kitchen-island',
      'kitchen-bar-stool-west',
      'kitchen-bar-stool-east',
      'kitchen-trash-drawer',
      'living-room-south-bookcase-west',
      'living-room-south-open-shelf',
      'living-room-drawer-console',
      'studio-north-bookcase-east',
      'studio-drafting-drawers',
      'studio-east-dresser',
      'studio-floor-lamp',
      'studio-monstera',
      'studio-daybed',
      'studio-nightstand-south',
      'studio-nightstand-north',
      'studio-reading-chair',
      'studio-bedside-rug',
      'living-room-media-rug',
      'living-room-tv-pothos-left',
      'living-room-corner-fig',
      'living-room-reading-plant',
      'living-room-floor-cushion-west',
      'living-room-round-pouf',
      'living-room-slim-entry-console',
      'living-room-wall-art-south-triptych',
      'living-room-console-plant',
      'living-room-coffee-table-bowl',
      'kitchen-breakfast-table',
      'kitchen-breakfast-stool-a',
      'kitchen-breakfast-stool-b',
      'kitchen-round-plant-stand',
      'kitchen-tall-pantry-south',
      'kitchen-runner-rug',
      'kitchen-wall-spice-rack',
      'kitchen-counter-herb-cluster',
      'studio-paper-lamp',
      'studio-narrow-plant-east',
      'studio-round-side-table',
      'studio-low-storage-bench',
      'studio-woven-rug',
      'studio-hanging-plant-east',
      'backyard-birdbath',
      'backyard-herb-trough-north',
      'backyard-flower-cluster-sw',
      'backyard-patio-umbrella-base',
      'backyard-garden-stool',
      'backyard-string-lights',
      'backyard-watering-can',
      'backyard-lawn-chair-west-a',
      'backyard-lawn-chair-west-b',
      'backyard-side-table',
      'backyard-grill',
      'backyard-prep-cart',
      'backyard-rock-garden-gravel',
      'backyard-rock-01',
      'backyard-rock-02',
      'backyard-rock-03',
      'backyard-planter-west-south',
      'backyard-planter-west-north',
      'backyard-planter-east-south',
      'backyard-planter-east-north',
    ]);
    expect(build.colliders[0]?.debugName).toBe(
      'LowerFloorFurnishingCollider:living-room-media-sofa'
    );
  });

  it('adds dense downstairs decor with intended solid and non-blocking detail IDs', () => {
    const { colliders, decorativeFootprints, group } =
      createLowerFloorFurnishings();
    const newSolidBounds: Record<string, RectCollider> = {
      'living-room-tv-pothos-left': {
        minX: -30.15,
        maxX: -29.45,
        minZ: -25.15,
        maxZ: -24.45,
      },
      'living-room-corner-fig': {
        minX: 29.7,
        maxX: 30.7,
        minZ: -30.0,
        maxZ: -29.0,
      },
      'living-room-reading-plant': {
        minX: -23.425,
        maxX: -22.775,
        minZ: -13.025,
        maxZ: -12.375,
      },
      'living-room-floor-cushion-west': {
        minX: -20.85,
        maxX: -19.95,
        minZ: -15.85,
        maxZ: -14.95,
      },
      'living-room-round-pouf': {
        minX: -18.85,
        maxX: -17.95,
        minZ: -17.45,
        maxZ: -16.55,
      },
      'living-room-slim-entry-console': {
        minX: 1.9,
        maxX: 4.5,
        minZ: -13.35,
        maxZ: -12.65,
      },
      'kitchen-breakfast-table': {
        minX: -7.9,
        maxX: -6.3,
        minZ: -6.4,
        maxZ: -5.2,
      },
      'kitchen-breakfast-stool-a': {
        minX: -9.3,
        maxX: -8.7,
        minZ: -6.1,
        maxZ: -5.5,
      },
      'kitchen-breakfast-stool-b': {
        minX: -5.8,
        maxX: -5.2,
        minZ: -6.1,
        maxZ: -5.5,
      },
      'kitchen-round-plant-stand': {
        minX: -7.35,
        maxX: -6.65,
        minZ: 13.15,
        maxZ: 13.85,
      },
      'kitchen-tall-pantry-south': {
        minX: -29.75,
        maxX: -28.65,
        minZ: -7.6,
        maxZ: -6.2,
      },
      'studio-paper-lamp': {
        minX: 20.725,
        maxX: 21.275,
        minZ: 7.725,
        maxZ: 8.275,
      },
      'studio-narrow-plant-east': {
        minX: 30.15,
        maxX: 30.85,
        minZ: 7.05,
        maxZ: 7.75,
      },
      'studio-round-side-table': {
        minX: 20.8,
        maxX: 21.6,
        minZ: 9.6,
        maxZ: 10.4,
      },
      'studio-low-storage-bench': {
        minX: 4.4,
        maxX: 7.6,
        minZ: -7.3,
        maxZ: -6.5,
      },
      'backyard-birdbath': { minX: 7.95, maxX: 9.05, minZ: 19.45, maxZ: 20.55 },
      'backyard-herb-trough-north': {
        // Nudged north by 0.1 to avoid the generated back-fence collider.
        minX: -7.0,
        maxX: -4.0,
        minZ: 30.5,
        maxZ: 31.1,
      },
      'backyard-flower-cluster-sw': {
        minX: -28.45,
        maxX: -27.55,
        minZ: 17.75,
        maxZ: 18.65,
      },
      'backyard-patio-umbrella-base': {
        minX: -22.45,
        maxX: -21.55,
        minZ: 24.55,
        maxZ: 25.45,
      },
      'backyard-garden-stool': {
        minX: 20.8,
        maxX: 21.6,
        minZ: 28.1,
        maxZ: 28.9,
      },
    };
    const newDecorativeIds = ['kitchen-runner-rug', 'studio-woven-rug'];
    const visualOnlyIds = [
      'living-room-wall-art-south-triptych',
      'living-room-console-plant',
      'living-room-coffee-table-bowl',
      'kitchen-wall-spice-rack',
      'kitchen-counter-herb-cluster',
      'studio-hanging-plant-east',
      'backyard-string-lights',
      'backyard-watering-can',
    ];

    Object.entries(newSolidBounds).forEach(([id, expected]) => {
      expect(
        colliders.filter((collider) => collider.furnishingId === id)
      ).toHaveLength(1);
      const collider = colliders.find(
        (candidate) => candidate.furnishingId === id
      );
      expect(collider?.minX).toBeCloseTo(expected.minX);
      expect(collider?.maxX).toBeCloseTo(expected.maxX);
      expect(collider?.minZ).toBeCloseTo(expected.minZ);
      expect(collider?.maxZ).toBeCloseTo(expected.maxZ);
      expect(group.getObjectByName(`Furnishing:${id}`)).toBeDefined();
    });
    newDecorativeIds.forEach((id) => {
      expect(
        decorativeFootprints.some((footprint) => footprint.furnishingId === id)
      ).toBe(true);
      expect(colliders.some((collider) => collider.furnishingId === id)).toBe(
        false
      );
      expect(group.getObjectByName(`Furnishing:${id}`)).toBeDefined();
    });
    visualOnlyIds.forEach((id) => {
      expect(colliders.some((collider) => collider.furnishingId === id)).toBe(
        false
      );
      expect(
        decorativeFootprints.some((footprint) => footprint.furnishingId === id)
      ).toBe(false);
      expect(group.getObjectByName(`Furnishing:${id}`)).toBeDefined();
    });
  });

  it('represents at least ten new downstairs plant and greenery visuals', () => {
    const greeneryIds = [
      'living-room-tv-pothos-left',
      'living-room-corner-fig',
      'living-room-reading-plant',
      'living-room-console-plant',
      'kitchen-round-plant-stand',
      'kitchen-counter-herb-cluster',
      'studio-narrow-plant-east',
      'studio-hanging-plant-east',
      'backyard-herb-trough-north',
      'backyard-flower-cluster-sw',
    ];
    const definitionIds = new Set(
      DEFAULT_LOWER_FLOOR_FURNISHINGS.map(({ id }) => id)
    );

    greeneryIds.forEach((id) => expect(definitionIds.has(id)).toBe(true));
  });

  it('adds backyard patio and landscaping AABBs with non-blocking gravel', () => {
    const { colliders, decorativeFootprints, group } =
      createLowerFloorFurnishings();
    const expectedBackyardBounds: Record<string, RectCollider> = {
      'backyard-lawn-chair-west-a': {
        minX: -27.6,
        maxX: -26.4,
        minZ: 26.4,
        maxZ: 28.2,
      },
      'backyard-lawn-chair-west-b': {
        minX: -24.8,
        maxX: -23.6,
        minZ: 26.7,
        maxZ: 28.5,
      },
      'backyard-side-table': {
        minX: -26.1,
        maxX: -25.1,
        minZ: 24.7,
        maxZ: 25.7,
      },
      'backyard-grill': {
        minX: 26.0,
        maxX: 27.4,
        minZ: 18.35,
        maxZ: 19.25,
      },
      'backyard-prep-cart': {
        minX: 23.8,
        maxX: 25.0,
        minZ: 18.4,
        maxZ: 19.2,
      },
      'backyard-rock-01': {
        minX: 0.85,
        maxX: 1.35,
        minZ: 28.75,
        maxZ: 29.25,
      },
      'backyard-rock-02': {
        minX: 3.15,
        maxX: 3.85,
        minZ: 28.25,
        maxZ: 28.95,
      },
      'backyard-rock-03': {
        minX: 5.6,
        maxX: 6.2,
        minZ: 29.1,
        maxZ: 29.7,
      },
      'backyard-planter-west-south': {
        minX: -30.55,
        maxX: -29.85,
        minZ: 19.95,
        maxZ: 20.65,
      },
      'backyard-planter-west-north': {
        minX: -30.45,
        maxX: -29.75,
        minZ: 29.2,
        maxZ: 29.9,
      },
      'backyard-planter-east-south': {
        minX: 29.75,
        maxX: 30.45,
        minZ: 21.15,
        maxZ: 21.85,
      },
      'backyard-planter-east-north': {
        minX: 29.65,
        maxX: 30.35,
        minZ: 29.15,
        maxZ: 29.85,
      },
    };

    expect(
      new Set(colliders.map(({ category }) => category)).has('backyard')
    ).toBe(true);

    Object.entries(expectedBackyardBounds).forEach(([id, expected]) => {
      const matchingColliders = colliders.filter(
        (collider) => collider.furnishingId === id
      );
      expect(matchingColliders).toHaveLength(1);
      expect(matchingColliders[0]).toMatchObject({
        ...expected,
        category: 'backyard',
        roomId: 'backyard',
      });
      expect(
        matchingColliders[0].maxX - matchingColliders[0].minX
      ).toBeGreaterThan(0);
      expect(
        matchingColliders[0].maxZ - matchingColliders[0].minZ
      ).toBeGreaterThan(0);
    });

    const gravel = decorativeFootprints.find(
      (footprint) => footprint.furnishingId === 'backyard-rock-garden-gravel'
    );
    expect(gravel).toMatchObject({
      category: 'backyard',
      roomId: 'backyard',
      bounds: { minX: 0.0, maxX: 7.0, minZ: 28.05, maxZ: 30.15 },
      allowSolidOverlap: true,
    });
    expect(
      colliders.some(
        (collider) => collider.furnishingId === 'backyard-rock-garden-gravel'
      )
    ).toBe(false);

    Object.keys(expectedBackyardBounds).forEach((id) => {
      expect(group.getObjectByName(`Furnishing:${id}`)).toBeDefined();
    });
    expect(
      group.getObjectByName('Furnishing:backyard-rock-garden-gravel')
    ).toBeDefined();
    expect(
      group.getObjectByName(
        'FurnishingPart:backyard-lawn-chair-west-a:chairSeatSlat0'
      )
    ).toBeDefined();
    expect(group.getObjectByName('FurnishingPart:grillLid')).toBeDefined();
    expect(
      group.getObjectByName(
        'FurnishingPart:backyard-planter-west-south:backyardPlantPot'
      )
    ).toBeDefined();
    expect(
      group.getObjectByName('FurnishingPart:backyard-rock-01:gardenRockCore')
    ).toBeDefined();
    expect(
      group.getObjectByName('FurnishingPart:prepCartLowerShelf')
    ).toBeDefined();
    expect(
      group.getObjectByName('FurnishingPart:gravelSpeckle0')
    ).toBeDefined();
  });

  it('keeps angled backyard chair and grill visuals inside authored colliders', () => {
    const { colliders, group } = createLowerFloorFurnishings();
    const ids = [
      'backyard-lawn-chair-west-a',
      'backyard-lawn-chair-west-b',
      'backyard-grill',
    ];
    const epsilon = 0.000001;

    ids.forEach((id) => {
      const collider = colliders.find(
        ({ furnishingId }) => furnishingId === id
      );
      const furnishing = group.getObjectByName(`Furnishing:${id}`);

      expect(collider).toBeDefined();
      expect(furnishing).toBeDefined();

      const visualBounds = new Box3().setFromObject(furnishing!);

      expect(visualBounds.min.x).toBeGreaterThanOrEqual(
        collider!.minX - epsilon
      );
      expect(visualBounds.max.x).toBeLessThanOrEqual(collider!.maxX + epsilon);
      expect(visualBounds.min.z).toBeGreaterThanOrEqual(
        collider!.minZ - epsilon
      );
      expect(visualBounds.max.z).toBeLessThanOrEqual(collider!.maxZ + epsilon);
    });
  });

  it('rejects unsupported backyard furnishing kinds instead of building empty groups', () => {
    const typoBackyardFurnishing: LowerFloorFurnishingDefinition = {
      id: 'backyard-typo-grill',
      category: 'backyard',
      roomId: 'backyard',
      position: { x: 0, z: 22 },
      orientationRadians: 0,
      solidFootprint: { width: 1, depth: 1 },
      solidBounds: { minX: -0.5, maxX: 0.5, minZ: 21.5, maxZ: 22.5 },
      kind: 'backyard-girll',
    };

    expect(() =>
      createLowerFloorFurnishings({ definitions: [typoBackyardFurnishing] })
    ).toThrow(/Unsupported backyard furnishing kind: backyard-girll/);
  });

  it('keeps backyard solid colliders clear of generated fence colliders', () => {
    const { colliders } = createLowerFloorFurnishings();
    const fenceColliders = createBackyardFenceColliders(
      createBackyardFenceSegments(LOWER_FLOOR_ROOM_BOUNDS.backyard)
    );
    const backyardColliders = colliders.filter(
      (collider) => collider.category === 'backyard'
    );

    expect(
      fenceColliders.some((collider) => collider.role === 'backFenceBoundary')
    ).toBe(true);
    backyardColliders.forEach((backyard) => {
      fenceColliders.forEach((fence) => {
        expect(rectanglesOverlap(backyard, fence)).toBe(false);
      });
    });
  });

  it('keeps backyard solids bounded, disjoint, and limited to parent colliders', () => {
    const { colliders } = createLowerFloorFurnishings();
    const backyardColliders = colliders.filter(
      (collider) => collider.category === 'backyard'
    );
    const priorPassColliders = colliders.filter(
      (collider) => collider.category !== 'backyard'
    );
    const backyardSolidDefinitions = DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
      (definition) =>
        definition.category === 'backyard' && definition.solidFootprint
    );

    expect(backyardColliders).toHaveLength(backyardSolidDefinitions.length);
    backyardSolidDefinitions.forEach((definition) => {
      expect(
        backyardColliders.filter(
          (collider) => collider.furnishingId === definition.id
        )
      ).toHaveLength(1);
    });

    backyardColliders.forEach((backyard, index) => {
      expect(isContainedBy(LOWER_FLOOR_ROOM_BOUNDS.backyard, backyard)).toBe(
        true
      );
      backyardColliders.slice(index + 1).forEach((otherBackyard) => {
        expect(rectanglesOverlap(backyard, otherBackyard)).toBe(false);
      });
      priorPassColliders.forEach((other) => {
        expect(rectanglesOverlap(backyard, other)).toBe(false);
      });
      LOWER_FLOOR_RESERVED_BLOCKERS.forEach((blocker) => {
        expect(rectanglesOverlap(backyard, blocker)).toBe(false);
      });
    });
  });

  it('adds the requested lower-floor storage AABBs with one collider each', () => {
    const { colliders } = createLowerFloorFurnishings();
    const expectedStorageBounds: Record<string, RectCollider> = {
      'living-room-south-bookcase-west': {
        minX: -26.4,
        maxX: -21.6,
        minZ: -31.575,
        maxZ: -30.825,
      },
      'living-room-south-open-shelf': {
        minX: -17.75,
        maxX: -13.25,
        minZ: -31.575,
        maxZ: -30.825,
      },
      'living-room-drawer-console': {
        minX: -4.5,
        maxX: -0.5,
        minZ: -31.5,
        maxZ: -30.7,
      },
      'studio-north-bookcase-east': {
        minX: 24.2,
        maxX: 29.0,
        minZ: 14.7,
        maxZ: 15.5,
      },
      'studio-drafting-drawers': {
        minX: 3.4,
        maxX: 8.2,
        minZ: 14.5,
        maxZ: 15.3,
      },
      'studio-east-dresser': {
        minX: 30.5,
        maxX: 31.5,
        minZ: 2.5,
        maxZ: 5.7,
      },
    };

    expect(
      new Set(colliders.map(({ category }) => category)).has('storage')
    ).toBe(true);

    Object.entries(expectedStorageBounds).forEach(([id, expected]) => {
      const matchingColliders = colliders.filter(
        (collider) => collider.furnishingId === id
      );
      expect(matchingColliders).toHaveLength(1);
      expect(matchingColliders[0]).toMatchObject({
        ...expected,
        category: 'storage',
      });
      expect(
        matchingColliders[0].maxX - matchingColliders[0].minX
      ).toBeGreaterThan(0);
      expect(
        matchingColliders[0].maxZ - matchingColliders[0].minZ
      ).toBeGreaterThan(0);
    });
  });

  it('keeps storage colliders in room bounds and away from solids and blockers', () => {
    const { colliders } = createLowerFloorFurnishings();
    const storageColliders = colliders.filter(
      (collider) => collider.category === 'storage'
    );
    const seatingAndKitchenColliders = colliders.filter((collider) =>
      ['living-room-seating', 'kitchenette'].includes(collider.category)
    );

    storageColliders.forEach((storage, index) => {
      expect(
        isContainedBy(LOWER_FLOOR_ROOM_BOUNDS[storage.roomId], storage)
      ).toBe(true);
      storageColliders.slice(index + 1).forEach((otherStorage) => {
        expect(rectanglesOverlap(storage, otherStorage)).toBe(false);
      });
      seatingAndKitchenColliders.forEach((other) => {
        expect(rectanglesOverlap(storage, other)).toBe(false);
      });
      LOWER_FLOOR_RESERVED_BLOCKERS.forEach((blocker) => {
        expect(rectanglesOverlap(storage, blocker)).toBe(false);
      });
    });
  });

  it('adds plants, lamps, and non-blocking decor with requested AABBs', () => {
    const { colliders, group } = createLowerFloorFurnishings();
    const expectedDecorBounds: Record<string, RectCollider> = {
      'living-room-large-plant': {
        minX: -28.95,
        maxX: -28.25,
        minZ: -26.55,
        maxZ: -25.85,
      },
      'living-room-plant-stool': {
        minX: 5.3,
        maxX: 6.3,
        minZ: -31.3,
        maxZ: -30.3,
      },
      'studio-floor-lamp': {
        minX: 24.125,
        maxX: 24.675,
        minZ: 13.825,
        maxZ: 14.375,
      },
      'studio-monstera': {
        minX: 30.1,
        maxX: 31.1,
        minZ: -5.9,
        maxZ: -4.9,
      },
    };

    expect(
      new Set(colliders.map(({ category }) => category)).has(
        'plants-lighting-decor'
      )
    ).toBe(true);

    Object.entries(expectedDecorBounds).forEach(([id, expected]) => {
      const matchingColliders = colliders.filter(
        (collider) => collider.furnishingId === id
      );
      expect(matchingColliders).toHaveLength(1);
      expect(matchingColliders[0]).toMatchObject({
        ...expected,
        category: 'plants-lighting-decor',
      });
      expect(
        matchingColliders[0].maxX - matchingColliders[0].minX
      ).toBeGreaterThan(0);
      expect(
        matchingColliders[0].maxZ - matchingColliders[0].minZ
      ).toBeGreaterThan(0);
    });

    expect(
      colliders.some(
        (collider) => collider.furnishingId === 'kitchen-herb-planter'
      )
    ).toBe(false);
    expect(
      colliders.some(
        (collider) => collider.furnishingId === 'kitchen-pendant-lights'
      )
    ).toBe(false);
    expect(
      group.getObjectByName('Furnishing:kitchen-herb-planter')
    ).toBeDefined();
    expect(
      group.getObjectByName('Furnishing:kitchen-pendant-lights')
    ).toBeDefined();
    expect(
      group.getObjectByName('FurnishingPart:kitchenHerbPlanterBox')
    ).toBeDefined();
    expect(group.getObjectByName('FurnishingPart:pendantShade0')).toBeDefined();

    const herbPlanter = DEFAULT_LOWER_FLOOR_FURNISHINGS.find(
      (definition) => definition.id === 'kitchen-herb-planter'
    );
    const kitchenCounter = colliders.find(
      (collider) => collider.furnishingId === 'kitchen-west-counter-run'
    );
    expect(herbPlanter?.position).toMatchObject({ x: -31, z: 7.9 });
    expect(kitchenCounter).toBeDefined();
    expect(herbPlanter!.position.x).toBeGreaterThan(kitchenCounter!.minX);
    expect(herbPlanter!.position.x).toBeLessThan(kitchenCounter!.maxX);
    expect(herbPlanter!.position.z).toBeGreaterThan(kitchenCounter!.minZ);
    expect(herbPlanter!.position.z).toBeLessThan(kitchenCounter!.maxZ);
  });

  it('uses unique leaf mesh names across stacked monstera leaves', () => {
    const { group } = createLowerFloorFurnishings();
    const monstera = group.getObjectByName('Furnishing:studio-monstera');
    const leafNames: string[] = [];

    monstera?.traverse((object) => {
      if (object.name.startsWith('FurnishingPart:plantLeaf')) {
        leafNames.push(object.name);
      }
    });

    expect(leafNames).toHaveLength(10);
    expect(new Set(leafNames)).toHaveLength(10);
    expect(leafNames).toContain('FurnishingPart:plantLeaflower0');
    expect(leafNames).toContain('FurnishingPart:plantLeafupper0');
  });

  it('anchors backyard flower-cluster leaves above their matching pots', () => {
    const { group } = createLowerFloorFurnishings();
    const flowerCluster = group.getObjectByName(
      'Furnishing:backyard-flower-cluster-sw'
    );

    expect(flowerCluster).toBeDefined();
    [-0.22, 0.18, 0].forEach((expectedX, index) => {
      const expectedZ = index === 2 ? 0.22 : -0.08;
      const flowerPot = flowerCluster?.getObjectByName(
        `FurnishingPart:flowerPot${index}`
      );
      const flowerLeaf = flowerCluster?.getObjectByName(
        `FurnishingPart:plantLeafflower${index}0`
      );

      expect(flowerPot).toBeDefined();
      expect(flowerLeaf).toBeDefined();
      expect(flowerPot!.position.x).toBeCloseTo(expectedX);
      expect(flowerPot!.position.z).toBeCloseTo(expectedZ);
      expect(flowerLeaf!.position.x).toBeCloseTo(expectedX);
      expect(flowerLeaf!.position.z).toBeCloseTo(expectedZ);
    });
  });

  it('validates visual-only details before building visible geometry', () => {
    const baseVisualDetail: LowerFloorFurnishingDefinition = {
      id: 'kitchen-window-herb-detail',
      category: 'plants-lighting-decor',
      roomId: 'kitchen',
      position: { x: -31, z: 7.9 },
      orientationRadians: 0,
      kind: 'herb-planter-detail',
    };

    expect(() =>
      validateLowerFloorFurnishingPlan([
        {
          ...baseVisualDetail,
          position: { x: -33, z: 7.9 },
        },
      ])
    ).toThrow(/visual detail position is outside kitchen/);

    expect(() =>
      createLowerFloorFurnishings({
        definitions: [
          {
            ...baseVisualDetail,
            kind: 'herb-planter-detial',
          },
        ],
      })
    ).toThrow(/Unsupported visual-only furnishing kind: herb-planter-detial/);
  });

  it('uses authored colors and glow materials for visual-only details', () => {
    const { group } = createLowerFloorFurnishings();
    const herbPot = group.getObjectByName(
      'FurnishingPart:tinyPlantPot-kitchen-counter-herb-cluster'
    );
    const stringLightBulb = group.getObjectByName(
      'FurnishingPart:backyard-string-lights:stringLightBulb0'
    );
    const stringLightCord = group.getObjectByName(
      'FurnishingPart:backyard-string-lights:stringLightCord0'
    );
    const herbDefinition = DEFAULT_LOWER_FLOOR_FURNISHINGS.find(
      (definition) => definition.id === 'kitchen-counter-herb-cluster'
    );

    expect(herbPot).toBeDefined();
    expect(stringLightBulb).toBeDefined();
    expect(stringLightCord).toBeDefined();
    expect(herbDefinition?.visual?.color).toBeDefined();
    expect(
      (
        herbPot as unknown as { material: MeshStandardMaterial }
      ).material.color.getHex()
    ).toBe(herbDefinition!.visual!.color);
    expect(
      (stringLightBulb as unknown as { material: MeshStandardMaterial })
        .material.emissiveIntensity
    ).toBeGreaterThan(0);
  });

  it('keeps plants and floor lamps within room bounds and collision exclusions', () => {
    const { colliders } = createLowerFloorFurnishings();
    const decorIds = new Set([
      'living-room-large-plant',
      'living-room-plant-stool',
      'studio-floor-lamp',
      'studio-monstera',
    ]);
    const decorColliders = colliders.filter((collider) =>
      decorIds.has(collider.furnishingId)
    );
    const priorPassColliders = colliders.filter(
      (collider) =>
        !decorIds.has(collider.furnishingId) &&
        [
          'living-room-seating',
          'kitchenette',
          'storage',
          'sleeping-nook',
          'plants-lighting-decor',
        ].includes(collider.category)
    );

    decorColliders.forEach((decor, index) => {
      expect(isContainedBy(LOWER_FLOOR_ROOM_BOUNDS[decor.roomId], decor)).toBe(
        true
      );
      decorColliders.slice(index + 1).forEach((otherDecor) => {
        expect(rectanglesOverlap(decor, otherDecor)).toBe(false);
      });
      priorPassColliders.forEach((other) => {
        expect(rectanglesOverlap(decor, other)).toBe(false);
      });
      LOWER_FLOOR_RESERVED_BLOCKERS.forEach((blocker) => {
        expect(rectanglesOverlap(decor, blocker)).toBe(false);
      });
    });
  });

  it('keeps collider source IDs valid and unique for the default plan', () => {
    const { colliders } = createLowerFloorFurnishings();
    const sourceIds = colliders.map((collider) => collider.sourceId);

    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(
      colliders.every((collider) => isLevelSourceId(collider.sourceId))
    ).toBe(true);
    colliders.forEach((collider) => {
      expect(collider.sourceId).toBe(
        `ground.furnishings.${collider.category}.${collider.furnishingId}.generated_collider`
      );
    });
  });

  it('adds named foot meshes to the living-room drawer console visual', () => {
    const { group } = createLowerFloorFurnishings();
    const drawerConsole = group.children.find(
      (child) => child.name === 'Furnishing:living-room-drawer-console'
    );
    const footMeshNames: string[] = [];

    expect(drawerConsole).toBeDefined();
    drawerConsole!.traverse((child) => {
      if (child.name.startsWith('FurnishingPart:drawerConsoleFoot')) {
        footMeshNames.push(child.name);
      }
    });

    expect(footMeshNames.sort()).toEqual([
      'FurnishingPart:drawerConsoleFoot0',
      'FurnishingPart:drawerConsoleFoot1',
      'FurnishingPart:drawerConsoleFoot2',
      'FurnishingPart:drawerConsoleFoot3',
    ]);
  });

  it('does not create extra colliders for storage visual details', () => {
    const { colliders } = createLowerFloorFurnishings();
    const storageDefinitions = DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
      (definition) => definition.category === 'storage'
    );
    const storageColliders = colliders.filter(
      (collider) => collider.category === 'storage'
    );

    expect(storageColliders).toHaveLength(storageDefinitions.length);
    storageDefinitions.forEach((definition) => {
      expect(definition.solidFootprint).toBeDefined();
      expect(
        storageColliders.filter(
          ({ furnishingId }) => furnishingId === definition.id
        )
      ).toHaveLength(1);
    });
  });

  it('adds the requested studio sleeping nook AABBs and non-blocking rug', () => {
    const { colliders, decorativeFootprints, group } =
      createLowerFloorFurnishings();
    const expectedSleepingBounds: Record<string, RectCollider> = {
      'studio-daybed': { minX: 25.7, maxX: 29.5, minZ: 9.6, maxZ: 11.6 },
      'studio-nightstand-south': {
        minX: 27.2,
        maxX: 28.0,
        minZ: 8.2,
        maxZ: 9.0,
      },
      'studio-nightstand-north': {
        minX: 27.2,
        maxX: 28.0,
        minZ: 12.2,
        maxZ: 13.0,
      },
      'studio-reading-chair': {
        minX: 21.5,
        maxX: 22.9,
        minZ: 11.9,
        maxZ: 13.3,
      },
    };

    Object.entries(expectedSleepingBounds).forEach(([id, expected]) => {
      const matchingColliders = colliders.filter(
        (collider) => collider.furnishingId === id
      );
      expect(matchingColliders).toHaveLength(1);
      expect(matchingColliders[0]).toMatchObject({
        ...expected,
        category: 'sleeping-nook',
        roomId: 'studio',
      });
    });

    const rug = decorativeFootprints.find(
      (footprint) => footprint.furnishingId === 'studio-bedside-rug'
    );
    expect(rug).toMatchObject({
      category: 'sleeping-nook',
      roomId: 'studio',
      bounds: { minX: 23.1, maxX: 27.9, minZ: 9.3, maxZ: 12.3 },
      allowSolidOverlap: true,
    });
    expect(
      colliders.some(
        (collider) => collider.furnishingId === 'studio-bedside-rug'
      )
    ).toBe(false);

    [
      'studio-daybed',
      'studio-nightstand-south',
      'studio-nightstand-north',
      'studio-reading-chair',
    ].forEach((id) => {
      expect(group.getObjectByName(`Furnishing:${id}`)).toBeDefined();
    });
    expect(
      group.getObjectByName('FurnishingPart:daybedHeadboardPanel')
    ).toBeDefined();
    expect(
      group.getObjectByName(
        'FurnishingPart:studio-nightstand-south:nightstandBody'
      )
    ).toBeDefined();
    expect(
      group.getObjectByName(
        'FurnishingPart:studio-nightstand-north:nightstandBody'
      )
    ).toBeDefined();
    expect(
      group.getObjectByName('FurnishingPart:readingChairCushion')
    ).toBeDefined();
  });

  it('keeps the rotated studio daybed visual aligned with its authored collider', () => {
    const { colliders, group } = createLowerFloorFurnishings();
    const epsilon = 0.000001;
    const requestedDaybedBounds = {
      minX: 25.7,
      maxX: 29.5,
      minZ: 9.6,
      maxZ: 11.6,
    };
    const daybedDefinition = DEFAULT_LOWER_FLOOR_FURNISHINGS.find(
      ({ id }) => id === 'studio-daybed'
    );
    const daybedCollider = colliders.find(
      ({ furnishingId }) => furnishingId === 'studio-daybed'
    );
    const nightstandSouthCollider = colliders.find(
      ({ furnishingId }) => furnishingId === 'studio-nightstand-south'
    );
    const nightstandNorthCollider = colliders.find(
      ({ furnishingId }) => furnishingId === 'studio-nightstand-north'
    );
    const daybed = group.getObjectByName('Furnishing:studio-daybed');

    expect(daybedDefinition?.orientationRadians).toBe(-Math.PI / 2);
    expect(daybedDefinition?.solidBounds).toMatchObject(requestedDaybedBounds);
    expect(daybedCollider).toMatchObject(requestedDaybedBounds);
    expect(daybed).toBeDefined();
    expect(nightstandSouthCollider).toBeDefined();
    expect(nightstandNorthCollider).toBeDefined();

    const visualBounds = new Box3().setFromObject(daybed!);

    expect(visualBounds.min.x).toBeCloseTo(daybedCollider!.minX, 6);
    expect(visualBounds.max.x).toBeCloseTo(daybedCollider!.maxX, 6);
    expect(visualBounds.min.z).toBeCloseTo(daybedCollider!.minZ, 6);
    expect(visualBounds.max.z).toBeCloseTo(daybedCollider!.maxZ, 6);
    expect(Math.abs(visualBounds.min.x - daybedCollider!.minX)).toBeLessThan(
      epsilon
    );
    expect(Math.abs(visualBounds.max.x - daybedCollider!.maxX)).toBeLessThan(
      epsilon
    );
    expect(Math.abs(visualBounds.min.z - daybedCollider!.minZ)).toBeLessThan(
      epsilon
    );
    expect(Math.abs(visualBounds.max.z - daybedCollider!.maxZ)).toBeLessThan(
      epsilon
    );
    expect(visualBounds.min.z).toBeGreaterThanOrEqual(
      nightstandSouthCollider!.maxZ
    );
    expect(visualBounds.max.z).toBeLessThanOrEqual(
      nightstandNorthCollider!.minZ
    );
  });

  it('uses the requested kitchen kitchenette and dining AABBs', () => {
    const { colliders } = createLowerFloorFurnishings();
    const expectedKitchenBounds: Record<string, RectCollider> = {
      'kitchen-west-counter-run': {
        minX: -31.625,
        maxX: -30.375,
        minZ: -0.8,
        maxZ: 8.4,
      },
      'kitchen-fridge': {
        minX: -31.675,
        maxX: -30.325,
        minZ: -6.35,
        maxZ: -4.85,
      },
      'kitchen-sink-cabinet': {
        minX: -31.6,
        maxX: -30.4,
        minZ: -2.9,
        maxZ: -1.1,
      },
      'kitchen-island': {
        minX: -15.4,
        maxX: -10.6,
        minZ: 10.1,
        maxZ: 11.7,
      },
      'kitchen-bar-stool-west': {
        minX: -16.25,
        maxX: -15.55,
        minZ: 12.55,
        maxZ: 13.25,
      },
      'kitchen-bar-stool-east': {
        minX: -10.45,
        maxX: -9.75,
        minZ: 12.55,
        maxZ: 13.25,
      },
      'kitchen-trash-drawer': {
        minX: -31.3,
        maxX: -30.3,
        minZ: 10.1,
        maxZ: 11.3,
      },
    };

    Object.entries(expectedKitchenBounds).forEach(([id, expected]) => {
      expect(
        colliders.find((collider) => collider.furnishingId === id)
      ).toMatchObject({
        ...expected,
        category: 'kitchenette',
        roomId: 'kitchen',
      });
    });
    expect(
      colliders.some(
        (collider) => collider.furnishingId === 'kitchen-stove-cabinet'
      )
    ).toBe(false);
  });

  it('keeps kitchen solidBounds aligned with authored centers and footprints', () => {
    const kitchenDefinitions = DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
      (definition) => definition.category === 'kitchenette'
    );

    kitchenDefinitions.forEach((definition) => {
      if (definition.id === 'kitchen-stove-cabinet') {
        expect(definition.solidFootprint).toBeUndefined();
        expect(definition.solidBounds).toBeUndefined();
        return;
      }

      if (!definition.solidFootprint) {
        expect(definition.solidBounds).toBeUndefined();
        return;
      }

      expect(definition.solidFootprint).toBeDefined();
      expect(definition.solidBounds).toMatchObject(
        deriveAabbFromCenterSize(definition)
      );
    });
  });

  it('keeps every kitchen collider inside the kitchen room bounds', () => {
    const { colliders } = createLowerFloorFurnishings();
    const kitchen = LOWER_FLOOR_ROOM_BOUNDS.kitchen;

    colliders
      .filter((collider) => collider.roomId === 'kitchen')
      .forEach((collider) => {
        expect(isContainedBy(kitchen, collider)).toBe(true);
      });
  });

  it('keeps both kitchen doorway buffers clear', () => {
    const { colliders } = createLowerFloorFurnishings();
    const kitchenDoorwayBuffers: RectCollider[] = [
      { minX: -5.2, maxX: -2.8, minZ: 0, maxZ: 8 },
      { minX: -22, maxX: -14, minZ: 14.8, maxZ: 17.2 },
    ];

    colliders
      .filter((collider) => collider.roomId === 'kitchen')
      .forEach((collider) => {
        kitchenDoorwayBuffers.forEach((buffer) => {
          expect(rectanglesOverlap(collider, buffer)).toBe(false);
        });
      });
  });

  it('keeps kitchen solids disjoint while stove details stay visual-only', () => {
    const { colliders, group } = createLowerFloorFurnishings();
    const kitchenColliders = colliders.filter(
      (collider) => collider.roomId === 'kitchen'
    );

    kitchenColliders.forEach((collider, index) => {
      kitchenColliders.slice(index + 1).forEach((other) => {
        expect(rectanglesOverlap(collider, other)).toBe(false);
      });
    });
    expect(
      colliders.some(
        (collider) => collider.furnishingId === 'kitchen-stove-cabinet'
      )
    ).toBe(false);
    expect(
      group.getObjectByName('Furnishing:kitchen-stove-cabinet')
    ).toBeDefined();
    expect(group.getObjectByName('FurnishingPart:stoveCooktop0')).toBeDefined();
  });

  it('keeps the wall counter visual narrow in world X and long in world Z', () => {
    const build = createLowerFloorFurnishings();
    const counterGroup = build.group.children.find(
      (child) => child.name === 'Furnishing:kitchen-west-counter-run'
    );

    expect(counterGroup).toBeDefined();

    const visualBounds = new Box3().setFromObject(counterGroup!);
    const visualWidthX = visualBounds.max.x - visualBounds.min.x;
    const visualDepthZ = visualBounds.max.z - visualBounds.min.z;

    expect(visualWidthX).toBeLessThan(1.5);
    expect(visualDepthZ).toBeGreaterThan(9);
    expect(visualDepthZ).toBeGreaterThan(visualWidthX * 5);
  });

  it('uses the requested living-room media seating AABBs', () => {
    const { colliders, decorativeFootprints } = createLowerFloorFurnishings();
    const expectedSolidBounds: Record<string, RectCollider> = {
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
        minX: -29.2,
        maxX: -27.8,
        minZ: -23.5,
        maxZ: -22.1,
      },
      'living-room-lounge-chair-east': {
        minX: -26.8,
        maxX: -25.4,
        minZ: -16.6,
        maxZ: -15.2,
      },
      'living-room-floor-lamp': {
        minX: -29.175,
        maxX: -28.625,
        minZ: -17.275,
        maxZ: -16.725,
      },
    };

    Object.entries(expectedSolidBounds).forEach(([id, expected]) => {
      expectColliderBoundsToBeCloseTo(colliders, id, expected);
    });
    expect(
      decorativeFootprints.find(
        (footprint) => footprint.furnishingId === 'living-room-media-rug'
      )?.bounds
    ).toMatchObject({ minX: -28.2, maxX: -21.2, minZ: -21.4, maxZ: -15.6 });
    expect(
      decorativeFootprints.find(
        (footprint) => footprint.furnishingId === 'living-room-media-rug'
      )?.allowSolidOverlap
    ).toBe(true);
  });

  it('keeps the media sofa visual inside its authored collider', () => {
    const build = createLowerFloorFurnishings();
    const sofaCollider = build.colliders.find(
      (collider) => collider.furnishingId === 'living-room-media-sofa'
    );
    const sofaGroup = build.group.children.find(
      (child) => child.name === 'Furnishing:living-room-media-sofa'
    );

    expect(sofaCollider).toMatchObject({
      minX: -26.9,
      maxX: -25.3,
      minZ: -22.1,
      maxZ: -17.5,
    });
    expect(sofaGroup).toBeDefined();

    const visualBounds = new Box3().setFromObject(sofaGroup!);
    expect(visualBounds.min.x).toBeGreaterThanOrEqual(
      sofaCollider!.minX - 0.00001
    );
    expect(visualBounds.max.x).toBeLessThanOrEqual(
      sofaCollider!.maxX + 0.00001
    );
    expect(visualBounds.min.z).toBeGreaterThanOrEqual(
      sofaCollider!.minZ - 0.00001
    );
    expect(visualBounds.max.z).toBeLessThanOrEqual(
      sofaCollider!.maxZ + 0.00001
    );
    expect(visualBounds.max.z - visualBounds.min.z).toBeGreaterThan(
      visualBounds.max.x - visualBounds.min.x
    );
  });

  it('keeps media lounge chairs west-facing and split across sofa ends', () => {
    const chairIds = [
      'living-room-lounge-chair-north',
      'living-room-lounge-chair-east',
    ];
    const chairDefinitions = chairIds.map((id) =>
      DEFAULT_LOWER_FLOOR_FURNISHINGS.find((definition) => definition.id === id)
    );
    const { colliders, decorativeFootprints } = createLowerFloorFurnishings();
    const byId = new Map(
      colliders.map((collider) => [collider.furnishingId, collider])
    );
    const sofa = byId.get('living-room-media-sofa')!;
    const sideTable = byId.get('living-room-side-table')!;
    const lamp = byId.get('living-room-floor-lamp')!;
    const rug = decorativeFootprints.find(
      (footprint) => footprint.furnishingId === 'living-room-media-rug'
    )!;
    const chairs = chairIds.map((id) => byId.get(id)!);

    chairDefinitions.forEach((definition) => {
      expect(definition?.orientationRadians).toBe(Math.PI / 2);
    });
    expect(chairs[0].maxZ).toBeLessThanOrEqual(sofa.minZ);
    expect(chairs[1].minZ).toBeGreaterThanOrEqual(sofa.maxZ);

    chairs.forEach((chair) => {
      expect(rectanglesOverlap(chair, sofa)).toBe(false);
      expect(rectanglesOverlap(chair, sideTable)).toBe(false);
      expect(rectanglesOverlap(chair, lamp)).toBe(false);
      expect(rug.allowSolidOverlap).toBe(true);
      LOWER_FLOOR_RESERVED_BLOCKERS.forEach((blocker) => {
        expect(rectanglesOverlap(chair, blocker)).toBe(false);
      });
    });
  });

  it('requires the default rug to explicitly allow overlapping nearby solids', () => {
    const definitionsWithoutRugAnySolidOverlap =
      DEFAULT_LOWER_FLOOR_FURNISHINGS.map((definition) => {
        if (definition.id !== 'living-room-media-rug') return definition;
        return {
          ...definition,
          visual: {
            ...definition.visual,
            allowDecorativeOverlapWithAnySolid: false,
          },
        };
      });

    expect(() =>
      validateLowerFloorFurnishingPlan(definitionsWithoutRugAnySolidOverlap)
    ).toThrow(/living-room-media-rug decorative footprint overlaps/);
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

  it('requires solid overlap allowlists to be mutual', () => {
    const overlappingDefinitions: LowerFloorFurnishingDefinition[] = [
      {
        id: 'living-overlap-a',
        category: 'living-room-seating',
        roomId: 'livingRoom',
        position: { x: -16, z: -21 },
        orientationRadians: 0,
        solidFootprint: { width: 2, depth: 2 },
        kind: 'couch',
        visual: { allowSolidOverlapWithIds: ['living-overlap-b'] },
      },
      {
        id: 'living-overlap-b',
        category: 'living-room-seating',
        roomId: 'livingRoom',
        position: { x: -15.5, z: -21 },
        orientationRadians: 0,
        solidFootprint: { width: 2, depth: 2 },
        kind: 'couch',
      },
    ];

    expect(() =>
      validateLowerFloorFurnishingPlan(overlappingDefinitions)
    ).toThrow(/living-overlap-a overlaps living-overlap-b/);
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

describe('upper floor furnishings foundation', () => {
  const upperDefinitions: UpperFloorFurnishingDefinition[] = [
    {
      id: 'upper-landing-bench-foundation',
      category: 'upper-landing',
      roomId: 'upperLanding',
      position: { x: 18.4, z: -28.4 },
      orientationRadians: 0,
      solidFootprint: { width: 2.4, depth: 1.0 },
      kind: 'bench',
    },
    {
      id: 'creators-studio-desk-foundation',
      category: 'creators-studio',
      roomId: 'creatorsStudio',
      position: { x: -12, z: -27 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 3.0, depth: 1.2 },
      kind: 'desk',
    },
    {
      id: 'loft-library-rug-foundation',
      category: 'loft-library',
      roomId: 'loftLibrary',
      position: { x: 14, z: -6 },
      orientationRadians: 0,
      decorativeFootprint: { width: 5.0, depth: 3.0 },
      kind: 'rug',
    },
  ];

  it('builds the default upstairs furnishing pass', () => {
    const build = createUpperFloorFurnishings();

    expect(build.group.name).toBe('UpperFloorFurnishings');
    expect(build.group.children).toHaveLength(44);
    expect(build.colliders).toHaveLength(29);
    expect(build.decorativeFootprints).toHaveLength(4);
  });

  it('keeps the complete upper-floor inventory accounted for by category', () => {
    const { colliders, decorativeFootprints, group } =
      createUpperFloorFurnishings();
    const expectedByCategory: Record<UpperFloorFurnishingCategory, number> = {
      'upper-landing': 6,
      'creators-studio': 8,
      'loft-library': 7,
      'focus-pods': 6,
      'plants-lighting-decor': 17,
    };

    expect(group.children).toHaveLength(DEFAULT_UPPER_FLOOR_FURNISHINGS.length);
    expect(countDefinitionsByCategory(DEFAULT_UPPER_FLOOR_FURNISHINGS)).toEqual(
      expectedByCategory
    );
    expect(colliders).toHaveLength(
      DEFAULT_UPPER_FLOOR_FURNISHINGS.filter(
        (definition) => definition.solidFootprint
      ).length
    );
    expect(decorativeFootprints).toHaveLength(
      DEFAULT_UPPER_FLOOR_FURNISHINGS.filter(
        (definition) => definition.decorativeFootprint
      ).length
    );
  });

  it('keeps every default upper furnishing collider finite, in-room, unique, and routed upper', () => {
    const { colliders } = createUpperFloorFurnishings();

    expectCompleteColliderMetadata({
      colliders,
      definitions: DEFAULT_UPPER_FLOOR_FURNISHINGS,
      floorId: 'upper',
      roomBounds: UPPER_FLOOR_ROOM_BOUNDS,
    });
  });

  it('keeps every default upper furnishing clear of solids and reserved blockers', () => {
    const { colliders } = createUpperFloorFurnishings();

    expectNoColliderOverlaps(
      colliders,
      UPPER_FLOOR_RESERVED_BLOCKERS,
      'upper floor'
    );
  });

  it('declares valid upper room bounds for authoring', () => {
    expect(UPPER_FLOOR_ROOM_BOUNDS).toEqual({
      upperLanding: { minX: 4, maxX: 20.8, minZ: -32, maxZ: -16 },
      creatorsStudio: { minX: -20, maxX: 4, minZ: -32, maxZ: 0 },
      loftLibrary: { minX: 4, maxX: 24, minZ: -16, maxZ: 12 },
      focusPods: { minX: -20, maxX: 24, minZ: 12, maxZ: 28 },
    });
    Object.values(UPPER_FLOOR_ROOM_BOUNDS).forEach((bounds) => {
      expect(bounds.maxX - bounds.minX).toBeGreaterThan(0);
      expect(bounds.maxZ - bounds.minZ).toBeGreaterThan(0);
    });
  });

  it('adds all requested default upstairs furniture with expected AABBs', () => {
    const { colliders, group } = createUpperFloorFurnishings();
    const expectedBounds: Record<string, RectCollider> = {
      'upper-landing-bench': { minX: 4.7, maxX: 7.7, minZ: -30.9, maxZ: -30.1 },
      'upper-landing-console': {
        minX: 19.4,
        maxX: 20.2,
        minZ: -25.75,
        maxZ: -22.25,
      },
      'upper-landing-planter': {
        minX: 19.35,
        maxX: 20.05,
        minZ: -18.15,
        maxZ: -17.45,
      },
      'creators-studio-corner-sofa': {
        minX: -4.8,
        maxX: -0.8,
        minZ: -24,
        maxZ: -22,
      },
      'creators-studio-coffee-table': {
        minX: -3.9,
        maxX: -1.7,
        minZ: -20.3,
        maxZ: -19.3,
      },
      'creators-studio-south-bookcase': {
        minX: -6.2,
        maxX: -2.2,
        minZ: -31.575,
        maxZ: -30.825,
      },
      'creators-studio-work-cabinet': {
        minX: 2.4,
        maxX: 3.2,
        minZ: -8,
        maxZ: -4,
      },
      'creators-studio-floor-plant': {
        minX: 2.4,
        maxX: 3.2,
        minZ: -1.7,
        maxZ: -0.9,
      },
      'loft-library-sectional': { minX: 5.4, maxX: 9.6, minZ: -13, maxZ: -11 },
      'loft-library-round-table': {
        minX: 7.6,
        maxX: 8.8,
        minZ: -9.6,
        maxZ: -8.4,
      },
      'loft-library-east-bookcase': {
        minX: 22.55,
        maxX: 23.45,
        minZ: -7,
        maxZ: -1,
      },
      'loft-library-reading-lamp': {
        minX: 4.725,
        maxX: 5.275,
        minZ: -8.275,
        maxZ: -7.725,
      },
      'loft-library-planter': { minX: 22.3, maxX: 23.1, minZ: 9.4, maxZ: 10.2 },
      'focus-pods-daybed': { minX: 17.8, maxX: 22.2, minZ: 24.4, maxZ: 26.2 },
      'focus-pods-round-table': {
        minX: 4.85,
        maxX: 6.15,
        minZ: 23.85,
        maxZ: 25.15,
      },
      'focus-pods-north-storage': {
        minX: 1.5,
        maxX: 6.5,
        minZ: 26.8,
        maxZ: 27.6,
      },
      'focus-pods-planter-east': {
        minX: 22.6,
        maxX: 23.4,
        minZ: 20.1,
        maxZ: 20.9,
      },
      'focus-pods-privacy-screen': {
        minX: -8.25,
        maxX: -3.75,
        minZ: 26.75,
        maxZ: 27.25,
      },
      'upper-landing-snake-plant': {
        minX: 4.65,
        maxX: 5.35,
        minZ: -17.95,
        maxZ: -17.25,
      },
      'upper-landing-gallery-plinth': {
        minX: 15.35,
        maxX: 16.25,
        minZ: -30.85,
        maxZ: -29.95,
      },
      'creators-studio-fern-stand': {
        minX: 0.4,
        maxX: 1.2,
        minZ: -13.6,
        maxZ: -12.8,
      },
      'creators-studio-floor-lamp': {
        minX: -1.275,
        maxX: -0.725,
        minZ: -25.875,
        maxZ: -25.325,
      },
      'creators-studio-tool-cart': {
        minX: -8.6,
        maxX: -7.4,
        minZ: -3.4,
        maxZ: -2.6,
      },
      'loft-library-window-planter': {
        minX: 4.6,
        maxX: 5.4,
        minZ: 9.8,
        maxZ: 10.6,
      },
      'loft-library-east-snake-plant': {
        minX: 22.65,
        maxX: 23.35,
        minZ: -12.35,
        maxZ: -11.65,
      },
      'loft-library-ottoman': {
        minX: 10.55,
        maxX: 11.45,
        minZ: -12.05,
        maxZ: -11.15,
      },
      'focus-pods-tree-planter': {
        minX: 22.25,
        maxX: 23.15,
        minZ: 26.35,
        maxZ: 27.25,
      },
      'focus-pods-low-plant-row-west': {
        minX: -18.6,
        maxX: -17.4,
        minZ: 24.65,
        maxZ: 25.35,
      },
      'focus-pods-floor-lamp': {
        minX: 7.725,
        maxX: 8.275,
        minZ: 26.025,
        maxZ: 26.575,
      },
    };

    Object.entries(expectedBounds).forEach(([id, expected]) => {
      expect(group.getObjectByName(`Furnishing:${id}`)).toBeDefined();
      expectColliderBoundsToBeCloseTo(colliders, id, expected);
    });
  });

  it('keeps the narrow loft library bookcase visual inside its collider', () => {
    const { colliders, group } = createUpperFloorFurnishings();
    const collider = colliders.find(
      ({ furnishingId }) => furnishingId === 'loft-library-east-bookcase'
    );
    const bookcase = group.getObjectByName(
      'Furnishing:loft-library-east-bookcase'
    );
    const epsilon = 0.000001;

    expect(collider).toBeDefined();
    expect(bookcase).toBeDefined();
    if (!collider || !bookcase) return;

    const visualBounds = new Box3().setFromObject(bookcase);

    expect(visualBounds.min.x).toBeGreaterThanOrEqual(collider.minX - epsilon);
    expect(visualBounds.max.x).toBeLessThanOrEqual(collider.maxX + epsilon);
    expect(visualBounds.min.z).toBeGreaterThanOrEqual(collider.minZ - epsilon);
    expect(visualBounds.max.z).toBeLessThanOrEqual(collider.maxZ + epsilon);
  });

  it('keeps default upper solids in rooms and clear of solids and blockers', () => {
    const { colliders } = createUpperFloorFurnishings();

    colliders.forEach((collider, index) => {
      expect(collider.floorId).toBe('upper');
      expect(
        isContainedBy(UPPER_FLOOR_ROOM_BOUNDS[collider.roomId], collider)
      ).toBe(true);
      UPPER_FLOOR_RESERVED_BLOCKERS.forEach((blocker) => {
        expect(rectanglesOverlap(collider, blocker)).toBe(false);
      });
      colliders.slice(index + 1).forEach((other) => {
        expect(rectanglesOverlap(collider, other)).toBe(false);
      });
    });
  });

  it('represents upstairs visual-only decor without blocking colliders', () => {
    const { colliders, group, decorativeFootprints } =
      createUpperFloorFurnishings();
    const detailOffsets = new Map([
      ['upper-landing-gallery-wall', 1.8],
      ['upper-landing-small-vase', 0.98],
      ['creators-studio-hanging-plant-west', 2.05],
      ['creators-studio-pinboard', 1.55],
      ['creators-studio-table-books', 0.52],
      ['loft-library-book-stacks', 0.62],
      ['loft-library-wall-art', 1.75],
      ['loft-library-hanging-vine', 1.95],
      ['focus-pods-cushion-scatter', 0.78],
      ['focus-pods-wall-planters', 1.65],
      ['focus-pods-soft-light-strip', 1.82],
    ]);

    detailOffsets.forEach((localOffset, id) => {
      const detail = group.getObjectByName(`Furnishing:${id}`);
      expect(detail).toBeDefined();
      expect(detail?.position.y).toBeCloseTo(
        UPPER_FLOOR_TOP_ELEVATION + localOffset
      );
      expect(colliders.some((collider) => collider.furnishingId === id)).toBe(
        false
      );
      expect(
        decorativeFootprints.some((footprint) => footprint.furnishingId === id)
      ).toBe(false);
    });
  });

  it('represents at least ten upstairs plant and greenery visuals', () => {
    const plantDefinitions = DEFAULT_UPPER_FLOOR_FURNISHINGS.filter(
      (definition) =>
        definition.kind.includes('plant') ||
        definition.kind.includes('fern') ||
        definition.kind.includes('snake') ||
        definition.kind.includes('vine') ||
        definition.kind.includes('planter') ||
        definition.id.includes('plant') ||
        definition.id.includes('fern') ||
        definition.id.includes('vine')
    );

    expect(plantDefinitions.length).toBeGreaterThanOrEqual(10);
  });

  it('keeps default upstairs rugs decorative and non-blocking', () => {
    const { colliders, decorativeFootprints } = createUpperFloorFurnishings();
    const expectedRugs: Record<string, RectCollider> = {
      'upper-landing-runner': {
        minX: 4.05,
        maxX: 7.05,
        minZ: -29.5,
        maxZ: -22.5,
      },
      'creators-studio-sofa-rug': {
        minX: -5.2,
        maxX: -0.4,
        minZ: -23.6,
        maxZ: -19,
      },
      'loft-library-area-rug': {
        minX: 5.2,
        maxX: 10.8,
        minZ: -12.7,
        maxZ: -8.5,
      },
      'focus-pods-soft-rug': { minX: 1.9, maxX: 8.1, minZ: 22.8, maxZ: 26.8 },
    };

    Object.entries(expectedRugs).forEach(([id, bounds]) => {
      expect(colliders.some((collider) => collider.furnishingId === id)).toBe(
        false
      );
      const footprint = decorativeFootprints.find(
        (decorativeFootprint) => decorativeFootprint.furnishingId === id
      );

      expect(footprint).toBeDefined();
      if (!footprint) return;

      expect(footprint.allowSolidOverlap).toBe(true);
      expectRectToBeCloseTo(footprint.bounds, bounds);
    });
  });

  it('keeps every default upstairs decorative footprint in-room and blocker-clear', () => {
    const { colliders, decorativeFootprints } = createUpperFloorFurnishings();

    decorativeFootprints.forEach((footprint) => {
      expect(
        colliders.some(
          (collider) => collider.furnishingId === footprint.furnishingId
        )
      ).toBe(false);
      expect(
        isContainedBy(
          UPPER_FLOOR_ROOM_BOUNDS[footprint.roomId],
          footprint.bounds
        )
      ).toBe(true);
      UPPER_FLOOR_RESERVED_BLOCKERS.forEach((blocker) => {
        expect(rectanglesOverlap(footprint.bounds, blocker)).toBe(false);
      });
    });
  });

  it('creates valid unique default upper source IDs and floor-routed metadata', () => {
    const { colliders } = createUpperFloorFurnishings();
    const sourceIds = colliders.map(({ sourceId }) => sourceId);

    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    colliders.forEach(({ floorId, sourceId }) => {
      expect(isLevelSourceId(sourceId)).toBe(true);
      expect(floorId).toBe('upper');
      expect(sourceId.startsWith('upper.furnishings.')).toBe(true);
    });
  });

  it('creates expected custom upper source IDs and floor-routed metadata', () => {
    const build = createUpperFloorFurnishings({
      definitions: upperDefinitions,
      baseElevation: 6,
    });

    expect(build.colliders).toHaveLength(2);
    expect(build.colliders.map(({ sourceId }) => sourceId)).toEqual([
      'upper.furnishings.upper-landing.upper-landing-bench-foundation.generated_collider',
      'upper.furnishings.creators-studio.creators-studio-desk-foundation.generated_collider',
    ]);
    expect(build.colliders.map(({ debugName }) => debugName)).toEqual([
      'UpperFloorFurnishingCollider:upper-landing-bench-foundation',
      'UpperFloorFurnishingCollider:creators-studio-desk-foundation',
    ]);
    expect(build.group.children.map(({ name }) => name)).toEqual([
      'Furnishing:upper-landing-bench-foundation',
      'Furnishing:creators-studio-desk-foundation',
      'Furnishing:loft-library-rug-foundation',
    ]);
    expect(build.group.children[0].position.y).toBe(6);
  });

  it('keeps upper decorative footprints non-blocking', () => {
    const build = createUpperFloorFurnishings({
      definitions: upperDefinitions,
    });

    expect(build.decorativeFootprints).toHaveLength(1);
    expect(build.decorativeFootprints[0]).toMatchObject({
      furnishingId: 'loft-library-rug-foundation',
      category: 'loft-library',
      roomId: 'loftLibrary',
      allowSolidOverlap: false,
    });
    expect(
      build.colliders.some(
        ({ furnishingId }) => furnishingId === 'loft-library-rug-foundation'
      )
    ).toBe(false);
  });

  it('validates upper containment, reserved blockers, and overlap rigor', () => {
    expect(() =>
      validateUpperFloorFurnishingPlan(upperDefinitions)
    ).not.toThrow();
    expect(() =>
      validateUpperFloorFurnishingPlan([
        {
          ...upperDefinitions[0],
          id: 'upper-landing-blocked-foundation',
          position: { x: 11.5, z: -20.8 },
        },
      ])
    ).toThrow(/reserved blocker/);
    expect(() =>
      validateUpperFloorFurnishingPlan([
        { ...upperDefinitions[0], position: { x: 3.5, z: -28 } },
      ])
    ).toThrow(/outside upperLanding/);
    expect(() =>
      validateUpperFloorFurnishingPlan([
        upperDefinitions[0],
        {
          ...upperDefinitions[0],
          id: 'upper-landing-overlap-foundation',
          position: { x: 18.6, z: -28.4 },
        },
      ])
    ).toThrow(/overlaps/);
  });

  it('reserves current upper POI footprints without blocking landing navigation', () => {
    const upperPoiBlockers = [
      {
        label: 'jobbot-studio-terminal',
        roomId: 'creatorsStudio',
        position: { x: -16.76, z: -28.8 },
        expectedBlocker: {
          minX: -18.4,
          maxX: -15.1,
          minZ: -30.4,
          maxZ: -27.2,
        },
      },
      {
        label: 'axel-studio-tracker',
        roomId: 'creatorsStudio',
        position: { x: -12.42, z: -19.18 },
        expectedBlocker: {
          minX: -14.0,
          maxX: -10.8,
          minZ: -20.8,
          maxZ: -17.6,
        },
      },
      {
        label: 'wove-kitchen-loom',
        roomId: 'loftLibrary',
        position: { x: 16.48, z: 4.27 },
        expectedBlocker: { minX: 14.8, maxX: 18.2, minZ: 2.6, maxZ: 5.9 },
      },
    ] satisfies {
      label: string;
      roomId: 'creatorsStudio' | 'loftLibrary';
      position: { x: number; z: number };
      expectedBlocker: RectCollider;
    }[];

    upperPoiBlockers.forEach(({ label, roomId, position, expectedBlocker }) => {
      expect(UPPER_FLOOR_RESERVED_BLOCKERS).toContainEqual(expectedBlocker);
      expect(() =>
        validateUpperFloorFurnishingPlan([
          {
            id: `${label}-solid-probe`,
            category:
              roomId === 'loftLibrary' ? 'loft-library' : 'creators-studio',
            roomId,
            position,
            orientationRadians: 0,
            solidFootprint: { width: 0.8, depth: 0.8 },
            kind: 'poi-probe',
          },
        ])
      ).toThrow(/reserved blocker/);
    });

    expect(
      UPPER_FLOOR_RESERVED_BLOCKERS.some(
        (blocker) =>
          blocker.minX < 7 &&
          blocker.maxX > 4 &&
          blocker.minZ < -24 &&
          blocker.maxZ > -32
      )
    ).toBe(false);
  });
});

describe('token.place placement reflow', () => {
  const sofaMediaCluster: RectCollider = {
    minX: -29.2,
    maxX: -21.4,
    minZ: -23.8,
    maxZ: -15.2,
  };
  const tokenPlaceBounds: RectCollider = {
    minX: -20.7,
    maxX: -15.4,
    minZ: -30.8,
    maxZ: -25.5,
  };

  it('keeps token.place in the living room at the reflowed workstation spot', () => {
    expect(MANUAL_POI_PLACEMENTS['tokenplace-studio-cluster']).toMatchObject({
      roomId: 'livingRoom',
      position: { x: -18, z: -28.2 },
      interactionAnchorPosition: { x: -18, z: -28.2 },
      headingRadians: Math.PI * 0.25,
    });
  });

  it('keeps the token.place reserved blocker clear of the media seating cluster', () => {
    const tokenPlaceBlocker = LOWER_FLOOR_RESERVED_BLOCKERS.find((blocker) =>
      isContainedBy(blocker, tokenPlaceBounds)
    );

    expect(tokenPlaceBlocker).toEqual(tokenPlaceBounds);
    expect(rectanglesOverlap(tokenPlaceBlocker!, sofaMediaCluster)).toBe(false);
  });

  it('keeps token.place clear of current lower-floor solid furnishings', () => {
    const { colliders } = createLowerFloorFurnishings();
    const tokenPlaceBlocker = LOWER_FLOOR_RESERVED_BLOCKERS.find((blocker) =>
      isContainedBy(blocker, tokenPlaceBounds)
    );

    colliders.forEach((collider) => {
      expect(rectanglesOverlap(tokenPlaceBlocker!, collider)).toBe(false);
    });
  });
});

describe('whole-home furnishing density QA', () => {
  it('balances plant coverage across floors with varied greenery types', () => {
    const greeneryMatchers = [
      /fig|monstera|large-plant|floor-plant|tree-planter/,
      /pothos|vine|hanging/,
      /snake/,
      /fern/,
      /herb/,
      /flower/,
      /plant-row|trough|planter/,
    ];
    const allDefinitions = [
      ...DEFAULT_LOWER_FLOOR_FURNISHINGS,
      ...DEFAULT_UPPER_FLOOR_FURNISHINGS,
    ];
    const lowerPlantIds = plantLikeDefinitionIds(
      DEFAULT_LOWER_FLOOR_FURNISHINGS
    );
    const upperPlantIds = plantLikeDefinitionIds(
      DEFAULT_UPPER_FLOOR_FURNISHINGS
    );

    expect(lowerPlantIds.length).toBeGreaterThanOrEqual(10);
    expect(upperPlantIds.length).toBeGreaterThanOrEqual(10);
    greeneryMatchers.forEach((matcher) => {
      expect(
        allDefinitions.some(
          (definition) =>
            matcher.test(definition.id) || matcher.test(definition.kind)
        ),
        `Expected at least one greenery definition matching ${matcher}.`
      ).toBe(true);
    });
  });

  it('keeps decorative footprints and visual-only details out of movement colliders on both floors', () => {
    const floors = [
      {
        label: 'lower floor',
        build: createLowerFloorFurnishings(),
        definitions: DEFAULT_LOWER_FLOOR_FURNISHINGS,
      },
      {
        label: 'upper floor',
        build: createUpperFloorFurnishings(),
        definitions: DEFAULT_UPPER_FLOOR_FURNISHINGS,
      },
    ];

    floors.forEach(({ label, build, definitions }) => {
      const colliderIds = new Set(
        build.colliders.map(({ furnishingId }) => furnishingId)
      );
      const decorativeIds = new Set(
        build.decorativeFootprints.map(({ furnishingId }) => furnishingId)
      );

      definitions.forEach((definition) => {
        if (definition.solidFootprint) {
          expect(
            colliderIds.has(definition.id),
            `${label} solid ${definition.id} should create one collider.`
          ).toBe(true);
          return;
        }

        expect(
          colliderIds.has(definition.id),
          `${label} non-solid ${definition.id} should not create a collider.`
        ).toBe(false);
        expect(
          decorativeIds.has(definition.id),
          `${label} decorative footprint ${definition.id} should only be tracked when authored.`
        ).toBe(Boolean(definition.decorativeFootprint));
      });
    });
  });
});

function deriveAabbFromCenterSize(
  definition: LowerFloorFurnishingDefinition
): RectCollider {
  const footprint = definition.solidFootprint;
  if (!footprint)
    throw new Error(`${definition.id} is missing a solid footprint.`);
  return {
    minX: roundAabbCoordinate(definition.position.x - footprint.width / 2),
    maxX: roundAabbCoordinate(definition.position.x + footprint.width / 2),
    minZ: roundAabbCoordinate(definition.position.z - footprint.depth / 2),
    maxZ: roundAabbCoordinate(definition.position.z + footprint.depth / 2),
  };
}

function roundAabbCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function isContainedBy(container: RectCollider, bounds: RectCollider): boolean {
  return (
    bounds.minX >= container.minX &&
    bounds.maxX <= container.maxX &&
    bounds.minZ >= container.minZ &&
    bounds.maxZ <= container.maxZ
  );
}

function countDefinitionsByCategory<Category extends string>(
  definitions: readonly { category: Category }[]
): Record<Category, number> {
  return definitions.reduce(
    (counts, definition) => ({
      ...counts,
      [definition.category]: (counts[definition.category] ?? 0) + 1,
    }),
    {} as Record<Category, number>
  );
}

function expectCompleteColliderMetadata<
  Category extends string,
  RoomId extends string,
>({
  colliders,
  definitions,
  floorId,
  roomBounds,
}: {
  colliders: FloorFurnishingCollider<Category, RoomId>[];
  definitions: readonly FloorFurnishingColliderDefinition<Category, RoomId>[];
  floorId: FloorFurnishingFloorId;
  roomBounds: Record<RoomId, RectCollider>;
}): void {
  const solidDefinitions = definitions.filter(
    (definition) => definition.solidFootprint
  );
  const colliderIds = colliders.map(({ furnishingId }) => furnishingId);
  const sourceIds = colliders.map(({ sourceId }) => sourceId);

  expect(colliders).toHaveLength(solidDefinitions.length);
  expect(new Set(colliderIds).size).toBe(colliderIds.length);
  expect(new Set(sourceIds).size).toBe(sourceIds.length);
  solidDefinitions.forEach((definition) => {
    expect(
      colliders.filter(({ furnishingId }) => furnishingId === definition.id),
      `${floorId} furnishing ${definition.id} should have exactly one collider.`
    ).toHaveLength(1);
  });
  colliders.forEach((collider) => {
    const matchingDefinition = definitions.find(
      ({ id }) => id === collider.furnishingId
    );

    expect(
      matchingDefinition,
      `${collider.furnishingId} has no definition.`
    ).toBeDefined();
    expect(Number.isFinite(collider.minX), collider.furnishingId).toBe(true);
    expect(Number.isFinite(collider.maxX), collider.furnishingId).toBe(true);
    expect(Number.isFinite(collider.minZ), collider.furnishingId).toBe(true);
    expect(Number.isFinite(collider.maxZ), collider.furnishingId).toBe(true);
    expect(
      collider.maxX - collider.minX,
      collider.furnishingId
    ).toBeGreaterThan(0);
    expect(
      collider.maxZ - collider.minZ,
      collider.furnishingId
    ).toBeGreaterThan(0);
    expect(collider.floorId, collider.furnishingId).toBe(floorId);
    expect(collider.category, collider.furnishingId).toBe(
      matchingDefinition?.category
    );
    expect(collider.roomId, collider.furnishingId).toBe(
      matchingDefinition?.roomId
    );
    expect(collider.sourceId, collider.furnishingId).toBe(
      `${floorId}.furnishings.${collider.category}.${collider.furnishingId}.generated_collider`
    );
    expect(isLevelSourceId(collider.sourceId), collider.furnishingId).toBe(
      true
    );
    expect(collider.debugName, collider.furnishingId).toContain(
      collider.furnishingId
    );
    expect(
      isContainedBy(roomBounds[collider.roomId], collider),
      `${collider.furnishingId} should stay inside ${collider.roomId}.`
    ).toBe(true);
  });
}

function expectNoColliderOverlaps<
  Category extends string,
  RoomId extends string,
>(
  colliders: FloorFurnishingCollider<Category, RoomId>[],
  reservedBlockers: readonly RectCollider[],
  label: string
): void {
  colliders.forEach((collider, index) => {
    colliders.slice(index + 1).forEach((other) => {
      expect(
        rectanglesOverlap(collider, other),
        `${label} ${collider.furnishingId} overlaps ${other.furnishingId}.`
      ).toBe(false);
    });
    reservedBlockers.forEach((blocker, blockerIndex) => {
      expect(
        rectanglesOverlap(collider, blocker),
        `${label} ${collider.furnishingId} overlaps reserved blocker ${blockerIndex}.`
      ).toBe(false);
    });
  });
}

function plantLikeDefinitionIds(
  definitions: readonly FloorFurnishingColliderDefinition<string, string>[]
): string[] {
  return definitions
    .filter((definition) =>
      /plant|planter|pothos|fig|fern|herb|flower|vine|snake|monstera|trough/.test(
        `${definition.id} ${definition.kind}`
      )
    )
    .map(({ id }) => id);
}

type FloorFurnishingColliderDefinition<
  Category extends string,
  RoomId extends string,
> = {
  id: string;
  category: Category;
  roomId: RoomId;
  kind: string;
  solidFootprint?: unknown;
  decorativeFootprint?: unknown;
};
