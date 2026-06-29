import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  LOWER_FLOOR_RESERVED_BLOCKERS,
  LOWER_FLOOR_ROOM_BOUNDS,
  DEFAULT_LOWER_FLOOR_FURNISHINGS,
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

describe('lower floor furnishings foundation', () => {
  it('renders the default living-room media seating cluster', () => {
    const build = createLowerFloorFurnishings();

    expect(build.group.name).toBe('LowerFloorFurnishings');
    expect(build.colliders).toHaveLength(28);
    expect(build.decorativeFootprints).toHaveLength(2);
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
    ]);
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
      'kitchen-stove-cabinet': {
        minX: -31.6,
        maxX: -30.4,
        minZ: 6.2,
        maxZ: 7.8,
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
  });

  it('keeps kitchen solidBounds aligned with authored centers and footprints', () => {
    const kitchenDefinitions = DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
      (definition) => definition.category === 'kitchenette'
    );

    kitchenDefinitions.forEach((definition) => {
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

  it('keeps kitchen solids disjoint except the authored stove counter integration', () => {
    const { colliders } = createLowerFloorFurnishings();
    const kitchenColliders = colliders.filter(
      (collider) => collider.roomId === 'kitchen'
    );
    const allowedOverlap = new Set([
      'kitchen-stove-cabinet|kitchen-west-counter-run',
      'kitchen-west-counter-run|kitchen-stove-cabinet',
    ]);

    kitchenColliders.forEach((collider, index) => {
      kitchenColliders.slice(index + 1).forEach((other) => {
        const pairKey = `${collider.furnishingId}|${other.furnishingId}`;
        expect(rectanglesOverlap(collider, other)).toBe(
          allowedOverlap.has(pairKey)
        );
      });
    });
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
      expect(
        colliders.find((collider) => collider.furnishingId === id)
      ).toMatchObject(expected);
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
    const oneSidedDefinitions = DEFAULT_LOWER_FLOOR_FURNISHINGS.map(
      (definition) => {
        if (definition.id !== 'kitchen-stove-cabinet') return definition;
        return {
          ...definition,
          visual: {
            ...definition.visual,
            allowSolidOverlapWithIds: [],
          },
        };
      }
    );

    expect(() => validateLowerFloorFurnishingPlan(oneSidedDefinitions)).toThrow(
      /kitchen-west-counter-run overlaps kitchen-stove-cabinet/
    );
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
