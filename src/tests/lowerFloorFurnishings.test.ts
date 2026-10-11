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
  type LowerFloorFurnishingDefinition,
  type UpperFloorFurnishingDefinition,
} from '../scene/structures/lowerFloorFurnishings';
import type { RectCollider } from '../systems/collision';

const LOWER_FLOOR_GREENERY_EXPECTATIONS = {
  total: 18,
  byRoom: {
    backyard: 6,
    kitchen: 3,
    livingRoom: 6,
    studio: 3,
  },
  byVariety: {
    broadLeafFigMonstera: [
      'living-room-large-plant',
      'living-room-plant-stool',
      'living-room-corner-fig',
      'living-room-console-plant',
      'kitchen-round-plant-stand',
      'studio-monstera',
    ],
    pothosTrailingHangingVines: [
      'living-room-tv-pothos-left',
      'studio-hanging-plant-east',
    ],
    snakePlants: ['studio-narrow-plant-east'],
    ferns: ['living-room-reading-plant'],
    herbs: [
      'kitchen-herb-planter',
      'kitchen-counter-herb-cluster',
      'backyard-herb-trough-north',
    ],
    flowers: ['backyard-flower-cluster-sw'],
    lowPlanterRows: [
      'backyard-planter-west-south',
      'backyard-planter-west-north',
      'backyard-planter-east-south',
      'backyard-planter-east-north',
    ],
    treePlanters: ['living-room-corner-fig'],
  },
} as const;

const UPPER_FLOOR_GREENERY_EXPECTATIONS = {
  total: 13,
  byRoom: {
    creatorsStudio: 3,
    focusPods: 4,
    loftLibrary: 4,
    upperLanding: 2,
  },
  byVariety: {
    broadLeafFigMonstera: [
      'upper-landing-planter',
      'creators-studio-floor-plant',
      'loft-library-planter',
      'loft-library-window-planter',
      'focus-pods-planter-east',
    ],
    pothosTrailingHangingVines: [
      'creators-studio-hanging-plant-west',
      'loft-library-hanging-vine',
    ],
    snakePlants: ['upper-landing-snake-plant', 'loft-library-east-snake-plant'],
    ferns: ['creators-studio-fern-stand'],
    herbs: [],
    flowers: [],
    lowPlanterRows: [
      'focus-pods-low-plant-row-west',
      'focus-pods-wall-planters',
    ],
    treePlanters: ['focus-pods-tree-planter'],
  },
} as const;

const validDefinitions: LowerFloorFurnishingDefinition[] = [
  {
    id: 'living-couch-foundation',
    category: 'living-room-seating',
    roomId: 'livingRoom',
    position: { x: 15, z: -17 },
    orientationRadians: 0,
    solidFootprint: { width: 5.2, depth: 1.4 },
    kind: 'couch',
  },
  {
    id: 'kitchen-counter-foundation',
    category: 'kitchenette',
    roomId: 'kitchen',
    position: { x: -9, z: 8 },
    orientationRadians: Math.PI / 2,
    solidFootprint: { width: 4, depth: 1.2 },
    kind: 'counter',
  },
  {
    id: 'studio-storage-foundation',
    category: 'storage',
    roomId: 'studio',
    position: { x: 18, z: 9 },
    orientationRadians: 0,
    solidFootprint: { width: 3, depth: 1.1 },
    kind: 'cabinet',
  },
  {
    id: 'studio-bed-foundation',
    category: 'sleeping-nook',
    roomId: 'studio',
    position: { x: 16, z: 4 },
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
    position: { x: 17, z: 15 },
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
        minX: -21.42178207935912,
        maxX: -20.721782079359116,
        minZ: -24.8 * Math.SQRT1_2 - 0.35 - 0.8,
        maxZ: -24.8 * Math.SQRT1_2 + 0.35 - 0.8,
      },
      'living-room-corner-fig': {
        minX: 20.854624791833736,
        maxX: 21.854624791833736,
        minZ: -21.359650045003153,
        maxZ: -20.359650045003153,
      },
      'living-room-reading-plant': {
        minX: -16.65916664540925,
        maxX: -16.009166645409252,
        minZ: -9.305256121069153,
        maxZ: -8.655256121069154,
      },
      'living-room-floor-cushion-west': {
        minX: -14.874978336205569,
        maxX: -13.97497833620557,
        minZ: -11.339444430272833,
        maxZ: -10.439444430272834,
      },
      'living-room-round-pouf': {
        minX: -13.460764773832473,
        maxX: -12.560764773832474,
        minZ: -12.470815280171308,
        maxZ: -11.57081528017131,
      },
      'living-room-slim-entry-console': {
        minX: -5.896194077712559,
        maxX: -3.29619407771256,
        minZ: -7.421067811865475,
        maxZ: -6.721067811865476,
      },
      'kitchen-breakfast-table': {
        minX: -5.820458146424488,
        maxX: -4.2204581464244875,
        minZ: -4.701219330881976,
        maxZ: -3.501219330881976,
      },
      'kitchen-breakfast-stool-a': {
        minX: -6.663961030678929,
        maxX: -6.063961030678928,
        minZ: -4.401219330881975,
        maxZ: -3.8012193308819757,
      },
      'kitchen-breakfast-stool-b': {
        minX: -4.1890872965260115,
        maxX: -3.589087296526012,
        minZ: -4.401219330881975,
        maxZ: -3.8012193308819757,
      },
      'kitchen-round-plant-stand': {
        minX: -5.299747468305832,
        maxX: -4.599747468305833,
        minZ: 9.195941546018393,
        maxZ: 9.895941546018392,
      },
      'kitchen-tall-pantry-south': {
        minX: -20.69751801064719,
        maxX: -19.59751801064719,
        minZ: -5.579036790187177,
        maxZ: -4.179036790187178,
      },
      'studio-paper-lamp': {
        minX: 14.574242404917499,
        maxX: 15.1242424049175,
        minZ: 5.38185424949238,
        maxZ: 5.931854249492381,
      },
      'studio-narrow-plant-east': {
        minX: 21.216756826189698,
        maxX: 21.9167568261897,
        minZ: 4.882590180780452,
        maxZ: 5.582590180780452,
      },
      'studio-round-side-table': {
        minX: 14.590663761154808,
        maxX: 15.390663761154808,
        minZ: 6.171067811865475,
        maxZ: 6.971067811865476,
      },
      'studio-low-storage-bench': {
        minX: 2.6426406871192856,
        maxX: 5.842640687119285,
        minZ: -5.279036790187178,
        maxZ: -4.479036790187178,
      },
      'backyard-birdbath': {
        minX: 5.460407640085655,
        maxX: 6.560407640085654,
        minZ: 13.59213562373095,
        maxZ: 14.692135623730952,
      },
      'backyard-herb-trough-north': {
        minX: -5.389087296526012,
        maxX: -2.3890872965260117,
        minZ: 21.478888860545666,
        maxZ: 22.078888860545668,
      },
      'backyard-flower-cluster-sw': {
        minX: -20.24898987322333,
        maxX: -19.34898987322333,
        minZ: 12.419343417595167,
        maxZ: 13.319343417595165,
      },
      'backyard-patio-umbrella-base': {
        minX: -16.006349186104046,
        maxX: -15.106349186104048,
        minZ: 17.22766952966369,
        maxZ: 18.127669529663688,
      },
      'backyard-garden-stool': {
        minX: 14.590663761154808,
        maxX: 15.390663761154808,
        minZ: 19.50254326381661,
        maxZ: 20.302543263816606,
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
        minX: -19.691883092036786,
        maxX: -18.491883092036783,
        minZ: 18.404015126392746,
        maxZ: 20.204015126392747,
      },
      'backyard-lawn-chair-west-b': {
        minX: -17.711984104714453,
        maxX: -16.511984104714454,
        minZ: 18.61614716074871,
        maxZ: 20.41614716074871,
      },
      'backyard-side-table': {
        minX: -18.60193359837562,
        maxX: -17.60193359837562,
        minZ: 17.319090885900998,
        maxZ: 18.319090885900998,
      },
      'backyard-grill': {
        minX: 18.17975105768082,
        maxX: 19.57975105768082,
        minZ: 12.843607486307096,
        maxZ: 13.743607486307095,
      },
      'backyard-prep-cart': {
        minX: 16.653405460951763,
        maxX: 17.853405460951763,
        minZ: 12.893607486307094,
        maxZ: 13.693607486307094,
      },
      'backyard-rock-01': {
        minX: 0.5278174593052023,
        maxX: 1.0278174593052025,
        minZ: 19.55609665440988,
        maxZ: 20.05609665440988,
      },
      'backyard-rock-02': {
        minX: 2.1248737341529162,
        maxX: 2.8248737341529164,
        minZ: 19.17325394193526,
        maxZ: 19.87325394193526,
      },
      'backyard-rock-03': {
        minX: 3.8719300090006303,
        maxX: 4.471930009000631,
        minZ: 19.788939366884502,
        maxZ: 20.3889393668845,
      },
      'backyard-planter-west-south': {
        minX: -21.704624791833737,
        maxX: -21.004624791833738,
        minZ: 14.004267658086915,
        maxZ: 14.704267658086914,
      },
      'backyard-planter-west-north': {
        minX: -21.633914113715083,
        maxX: -20.933914113715083,
        minZ: 19.645005384062483,
        maxZ: 20.345005384062482,
      },
      'backyard-planter-east-south': {
        minX: 20.933914113715083,
        maxX: 21.633914113715083,
        minZ: 14.85279579551077,
        maxZ: 15.552795795510773,
      },
      'backyard-planter-east-north': {
        minX: 20.863203435596425,
        maxX: 21.563203435596428,
        minZ: 19.609650045003153,
        maxZ: 20.309650045003156,
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
      bounds: {
        minX: -1.0251262658470837,
        maxX: 5.974873734152917,
        minZ: 18.826807332528535,
        maxZ: 20.926807332528533,
      },
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
        minX: -19.37056274847714,
        maxX: -14.570562748477144,
        minZ: -22.436731573020285,
        maxZ: -21.686731573020285,
      },
      'living-room-south-open-shelf': {
        minX: -13.210155108391488,
        maxX: -8.710155108391488,
        minZ: -22.436731573020285,
        maxZ: -21.686731573020285,
      },
      'living-room-drawer-console': {
        minX: -3.767766952966369,
        maxX: 0.23223304703363112,
        minZ: -22.39102089490163,
        maxZ: -21.59102089490163,
      },
      'studio-north-bookcase-east': {
        minX: 16.409040379562164,
        maxX: 21.209040379562165,
        minZ: 10.277312395916868,
        maxZ: 11.077312395916868,
      },
      'studio-drafting-drawers': {
        minX: 1.7012193308819756,
        maxX: 6.501219330881975,
        minZ: 10.135891039679558,
        maxZ: 10.935891039679559,
      },
      'studio-east-dresser': {
        minX: 21.420310216782976,
        maxX: 22.420310216782976,
        minZ: 1.2991378028648453,
        maxZ: 4.499137802864846,
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
        minX: -20.57325394193526,
        maxX: -19.87325394193526,
        minZ: -18.87619766708755,
        maxZ: -18.17619766708755,
      },
      'living-room-plant-stool': {
        minX: 3.6012193308819755,
        maxX: 4.6012193308819755,
        minZ: -22.278888860545667,
        maxZ: -21.278888860545667,
      },
      'studio-floor-lamp': {
        minX: 16.978405460951763,
        maxX: 17.528405460951763,
        minZ: 9.69520561473032,
        maxZ: 10.24520561473032,
      },
      'studio-monstera': {
        minX: 21.137467504308358,
        maxX: 22.137467504308358,
        minZ: -4.318376618407357,
        maxZ: -3.318376618407357,
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
    expect(herbPlanter?.position).toMatchObject({
      x: -31 * Math.SQRT1_2,
      z: 7.9 * Math.SQRT1_2,
    });
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
      position: { x: -31 * Math.SQRT1_2, z: 7.9 * Math.SQRT1_2 },
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
      expect(collider).toMatchObject({
        floorId: 'ground',
        sourceType: 'generatedCollider',
        purpose: 'lower-floor-furnishing',
      });
    });
  });

  it('keeps default lower-floor inventory complete by category and collider intent', () => {
    expect(DEFAULT_LOWER_FLOOR_FURNISHINGS).toHaveLength(75);
    expect(countDefinitionsByCategory(DEFAULT_LOWER_FLOOR_FURNISHINGS)).toEqual(
      {
        backyard: 20,
        kitchenette: 13,
        'living-room-seating': 9,
        'plants-lighting-decor': 17,
        'sleeping-nook': 7,
        storage: 9,
      }
    );

    const { colliders, decorativeFootprints } = createLowerFloorFurnishings();
    const solidDefinitions = DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
      (definition) => definition.solidFootprint
    );
    const decorativeDefinitions = DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
      (definition) => definition.decorativeFootprint
    );
    const visualOnlyDefinitions = DEFAULT_LOWER_FLOOR_FURNISHINGS.filter(
      (definition) =>
        !definition.solidFootprint && !definition.decorativeFootprint
    );

    expect(colliders).toHaveLength(solidDefinitions.length);
    expect(decorativeFootprints).toHaveLength(decorativeDefinitions.length);
    expect(new Set(colliders.map(({ furnishingId }) => furnishingId))).toEqual(
      new Set(solidDefinitions.map(({ id }) => id))
    );
    expect(
      new Set(decorativeFootprints.map(({ furnishingId }) => furnishingId))
    ).toEqual(new Set(decorativeDefinitions.map(({ id }) => id)));

    visualOnlyDefinitions.forEach(({ id }) => {
      expect(colliders.some(({ furnishingId }) => furnishingId === id)).toBe(
        false
      );
      expect(
        decorativeFootprints.some(({ furnishingId }) => furnishingId === id)
      ).toBe(false);
    });
  });

  it('keeps deterministic lower-floor plant and greenery coverage', () => {
    expectGreeneryCoverage(
      DEFAULT_LOWER_FLOOR_FURNISHINGS,
      LOWER_FLOOR_GREENERY_EXPECTATIONS
    );
  });

  it('keeps every default lower-floor collider finite, in-room, and disjoint', () => {
    const { colliders } = createLowerFloorFurnishings();
    const sourceIds = new Set<string>();

    colliders.forEach((collider, index) => {
      expectFinitePositiveCollider(collider);
      expect(sourceIds.has(collider.sourceId)).toBe(false);
      sourceIds.add(collider.sourceId);
      expect(
        isContainedBy(LOWER_FLOOR_ROOM_BOUNDS[collider.roomId], collider),
        `${collider.furnishingId} should stay inside room ${collider.roomId}`
      ).toBe(true);
      LOWER_FLOOR_RESERVED_BLOCKERS.forEach((blocker, blockerIndex) => {
        expect(
          rectanglesOverlap(collider, blocker, 0.001),
          `${collider.furnishingId} should not overlap reserved blocker ${blockerIndex}`
        ).toBe(false);
      });
      colliders.slice(index + 1).forEach((other) => {
        expectDefaultCollidersDoNotOverlap(
          collider,
          other,
          DEFAULT_LOWER_FLOOR_FURNISHINGS
        );
      });
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
      'studio-daybed': {
        minX: 17.61614716074871,
        maxX: 21.41614716074871,
        minZ: 6.495331880577404,
        maxZ: 8.495331880577403,
      },
      'studio-nightstand-south': {
        minX: 19.11614716074871,
        maxX: 19.91614716074871,
        minZ: 5.681118318204309,
        maxZ: 6.4811183182043095,
      },
      'studio-nightstand-north': {
        minX: 19.11614716074871,
        maxX: 19.91614716074871,
        minZ: 8.509545442950499,
        maxZ: 9.3095454429505,
      },
      'studio-reading-chair': {
        minX: 14.997770542341357,
        maxX: 16.397770542341355,
        minZ: 8.2095454429505,
        maxZ: 9.6095454429505,
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
      bounds: {
        minX: 15.631222920256963,
        maxX: 20.43122292025696,
        minZ: 6.136753236814714,
        maxZ: 9.136753236814714,
      },
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
      minX: 17.61614716074871,
      maxX: 21.41614716074871,
      minZ: 6.495331880577404,
      maxZ: 8.495331880577403,
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
        minX: -22.245310216782975,
        maxX: -20.995310216782975,
        minZ: -0.7129942314911191,
        maxZ: 8.487005768508881,
      },
      'kitchen-fridge': {
        minX: -22.295310216782976,
        maxX: -20.945310216782975,
        minZ: -4.709797974644666,
        maxZ: -3.2097979746446663,
      },
      'kitchen-sink-cabinet': {
        minX: -22.220310216782977,
        maxX: -21.020310216782974,
        minZ: -2.964213562373095,
        maxZ: -1.1642135623730954,
      },
      'kitchen-island': {
        minX: -11.59238815542512,
        maxX: -6.792388155425119,
        minZ: 6.907463914933368,
        maxZ: 8.507463914933368,
      },
      'kitchen-bar-stool-west': {
        minX: -11.592997820866106,
        maxX: -10.892997820866107,
        minZ: 8.771677477306465,
        maxZ: 9.471677477306464,
      },
      'kitchen-bar-stool-east': {
        minX: -7.49177848998413,
        maxX: -6.7917784899841305,
        minZ: 8.771677477306465,
        maxZ: 9.471677477306464,
      },
      'kitchen-trash-drawer': {
        minX: -20.678888860545666,
        maxX: -19.678888860545666,
        minZ: 6.966042558696059,
        maxZ: 8.16604255869606,
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
      expectRectToBeCloseTo(
        definition.solidBounds!,
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
        minX: -19.25548698896889,
        maxX: -17.655486988968892,
        minZ: -16.300714267493642,
        maxZ: -11.700714267493641,
      },
      'living-room-coffee-table': {
        minX: -17.00990257669732,
        maxX: -14.809902576697318,
        minZ: -13.610764773832475,
        maxZ: -12.410764773832476,
      },
      'living-room-side-table': {
        minX: -18.784776310850237,
        maxX: -17.98477631085024,
        minZ: -17.396298679765213,
        maxZ: -16.596298679765212,
      },
      'living-room-lounge-chair-north': {
        minX: -20.552543263816606,
        maxX: -19.152543263816607,
        minZ: -17.72203461105328,
        maxZ: -16.322034611053283,
      },
      'living-room-lounge-chair-east': {
        minX: -19.155486988968892,
        maxX: -17.75548698896889,
        minZ: -11.392997820866107,
        maxZ: -9.992997820866105,
      },
      'living-room-floor-lamp': {
        minX: -20.710385976291224,
        maxX: -20.160385976291224,
        minZ: -12.295815280171308,
        maxZ: -11.74581528017131,
      },
    };

    Object.entries(expectedSolidBounds).forEach(([id, expected]) => {
      expectColliderBoundsToBeCloseTo(colliders, id, expected);
    });
    expect(
      decorativeFootprints.find(
        (footprint) => footprint.furnishingId === 'living-room-media-rug'
      )?.bounds
    ).toMatchObject({
      minX: -20.965537495307725,
      maxX: -13.965537495307725,
      minZ: -15.981475451951129,
      maxZ: -10.18147545195113,
    });
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
      minX: -19.25548698896889,
      maxX: -17.655486988968892,
      minZ: -16.300714267493642,
      maxZ: -11.700714267493641,
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
        position: { x: 15, z: -17 },
        orientationRadians: 0,
        solidFootprint: { width: 2, depth: 2 },
        kind: 'couch',
        visual: { allowSolidOverlapWithIds: ['living-overlap-b'] },
      },
      {
        id: 'living-overlap-b',
        category: 'living-room-seating',
        roomId: 'livingRoom',
        position: { x: 15.5, z: -17 },
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
          position: { x: 18.45, z: 4 },
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
      position: { x: 12.5, z: -20 },
      orientationRadians: 0,
      solidFootprint: { width: 2.4, depth: 1.0 },
      kind: 'bench',
    },
    {
      id: 'creators-studio-desk-foundation',
      category: 'creators-studio',
      roomId: 'creatorsStudio',
      position: { x: -6, z: -19 },
      orientationRadians: Math.PI / 2,
      solidFootprint: { width: 3.0, depth: 1.2 },
      kind: 'desk',
    },
    {
      id: 'loft-library-rug-foundation',
      category: 'loft-library',
      roomId: 'loftLibrary',
      position: { x: 10, z: -4 },
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

  it('declares valid upper room bounds for authoring', () => {
    expect(UPPER_FLOOR_ROOM_BOUNDS).toEqual({
      upperLanding: {
        minX: 4 * Math.SQRT1_2,
        maxX: 20.8 * Math.SQRT1_2,
        minZ: -32 * Math.SQRT1_2,
        maxZ: -16 * Math.SQRT1_2,
      },
      creatorsStudio: {
        minX: -20 * Math.SQRT1_2,
        maxX: 4 * Math.SQRT1_2,
        minZ: -32 * Math.SQRT1_2,
        maxZ: 0 * Math.SQRT1_2,
      },
      loftLibrary: {
        minX: 4 * Math.SQRT1_2,
        maxX: 24 * Math.SQRT1_2,
        minZ: -16 * Math.SQRT1_2,
        maxZ: 12 * Math.SQRT1_2,
      },
      focusPods: {
        minX: -20 * Math.SQRT1_2,
        maxX: 24 * Math.SQRT1_2,
        minZ: 12 * Math.SQRT1_2,
        maxZ: 28 * Math.SQRT1_2,
      },
    });
    Object.values(UPPER_FLOOR_ROOM_BOUNDS).forEach((bounds) => {
      expect(bounds.maxX - bounds.minX).toBeGreaterThan(0);
      expect(bounds.maxZ - bounds.minZ).toBeGreaterThan(0);
    });
  });

  it('adds all requested default upstairs furniture with expected AABBs', () => {
    const { colliders, group } = createUpperFloorFurnishings();
    const expectedBounds: Record<string, RectCollider> = {
      'upper-landing-bench': {
        minX: 2.884062043356595,
        maxX: 5.884062043356595,
        minZ: -22.216756826189698,
        maxZ: -21.4167568261897,
      },
      'upper-landing-console': {
        minX: 13.600714267493641,
        maxX: 14.400714267493642,
        minZ: -18.720562748477143,
        maxZ: -15.220562748477143,
      },
      'upper-landing-planter': {
        minX: 13.580003589374988,
        maxX: 14.280003589374987,
        minZ: -12.936500705120547,
        maxZ: -12.236500705120548,
      },
      'creators-studio-corner-sofa': {
        minX: -3.979898987322333,
        maxX: 0.02010101267766684,
        minZ: -17.263455967290593,
        maxZ: -15.263455967290593,
      },
      'creators-studio-coffee-table': {
        minX: -3.0798989873223332,
        maxX: -0.8798989873223331,
        minZ: -14.500714267493642,
        maxZ: -13.500714267493642,
      },
      'creators-studio-south-bookcase': {
        minX: -4.9698484809835,
        maxX: -0.9698484809835,
        minZ: -22.436731573020285,
        maxZ: -21.686731573020285,
      },
      'creators-studio-work-cabinet': {
        minX: 1.5798989873223332,
        maxX: 2.379898987322333,
        minZ: -4.5426406871192855,
        maxZ: -0.5426406871192855,
      },
      'creators-studio-floor-plant': {
        minX: 0.3798989873223332,
        maxX: 1.1798989873223333,
        minZ: -1.3192388155425119,
        maxZ: -0.5192388155425118,
      },
      'loft-library-sectional': {
        minX: 3.2033008588991065,
        maxX: 7.403300858899106,
        minZ: -9.485281374238571,
        maxZ: -7.485281374238571,
      },
      'loft-library-round-table': {
        minX: 5.19827560572969,
        maxX: 6.3982756057296895,
        minZ: -6.963961030678928,
        maxZ: -5.763961030678929,
      },
      'loft-library-east-bookcase': {
        minX: 15.813455967290594,
        maxX: 16.713455967290592,
        minZ: -5.82842712474619,
        maxZ: 0.1715728752538097,
      },
      'loft-library-reading-lamp': {
        minX: 3.260533905932738,
        maxX: 3.8105339059327377,
        minZ: -4.33185424949238,
        maxZ: -3.78185424949238,
      },
      'loft-library-planter': {
        minX: 15.651323932934629,
        maxX: 16.451323932934628,
        minZ: 6.529646455628166,
        maxZ: 7.329646455628167,
      },
      'focus-pods-daybed': {
        minX: 11.942135623730952,
        maxX: 16.34213562373095,
        minZ: 16.989801564019654,
        maxZ: 18.78980156401965,
      },
      'focus-pods-round-table': {
        minX: 3.239087296526012,
        maxX: 4.539087296526012,
        minZ: 16.674116139070417,
        maxZ: 17.974116139070414,
      },
      'focus-pods-north-storage': {
        minX: 0.3284271247461903,
        maxX: 5.32842712474619,
        minZ: 18.833304448274095,
        maxZ: 19.633304448274092,
      },
      'focus-pods-planter-east': {
        minX: 15.863455967290593,
        maxX: 16.66345596729059,
        minZ: 14.095689014324225,
        maxZ: 14.895689014324226,
      },
      'focus-pods-privacy-screen': {
        minX: -6.492640687119286,
        maxX: -1.9926406871192857,
        minZ: 18.841883092036785,
        maxZ: 19.341883092036785,
      },
      'upper-landing-snake-plant': {
        minX: 3.1855339059327377,
        maxX: 3.885533905932738,
        minZ: -12.795079348883238,
        maxZ: -12.095079348883239,
      },
      'upper-landing-gallery-plinth': {
        minX: 10.722287142747453,
        maxX: 11.622287142747451,
        minZ: -21.946046148071044,
        maxZ: -21.046046148071046,
      },
      'creators-studio-fern-stand': {
        minX: 0.1656854249492381,
        maxX: 0.9656854249492381,
        minZ: -9.733809511662427,
        maxZ: -8.933809511662426,
      },
      'creators-studio-floor-lamp': {
        minX: -0.9821067811865476,
        maxX: -0.43210678118654755,
        minZ: -18.37693359837562,
        maxZ: -17.82693359837562,
      },
      'creators-studio-tool-cart': {
        minX: -6.25685424949238,
        maxX: -5.056854249492381,
        minZ: -2.5213203435596427,
        maxZ: -1.721320343559643,
      },
      'loft-library-window-planter': {
        minX: 3.135533905932738,
        maxX: 3.9355339059327377,
        minZ: 6.812489168102784,
        maxZ: 7.612489168102785,
      },
      'loft-library-east-snake-plant': {
        minX: 15.913455967290593,
        maxX: 16.613455967290594,
        minZ: -8.835281374238571,
        maxZ: -8.135281374238572,
      },
      'loft-library-ottoman': {
        minX: 7.728174593052024,
        maxX: 8.628174593052023,
        minZ: -8.65243866176395,
        maxZ: -7.752438661763951,
      },
      'focus-pods-tree-planter': {
        minX: 15.60132393293463,
        maxX: 16.50132393293463,
        minZ: 15.600461735799477,
        maxZ: 16.500461735799476,
      },
      'focus-pods-low-plant-row-west': {
        minX: -13.327922061357857,
        maxX: -12.127922061357857,
        minZ: 17.327669529663687,
        maxZ: 18.02766952966369,
      },
      'focus-pods-floor-lamp': {
        minX: 5.38185424949238,
        maxX: 5.931854249492381,
        minZ: 18.321908345206204,
        maxZ: 18.8719083452062,
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

  it('keeps every default upper-floor collider finite, in-room, and disjoint', () => {
    const { colliders } = createUpperFloorFurnishings();
    const sourceIds = new Set<string>();

    colliders.forEach((collider, index) => {
      expectFinitePositiveCollider(collider);
      expect(collider.floorId).toBe('upper');
      expect(sourceIds.has(collider.sourceId)).toBe(false);
      sourceIds.add(collider.sourceId);
      expect(
        isContainedBy(UPPER_FLOOR_ROOM_BOUNDS[collider.roomId], collider),
        `${collider.furnishingId} should stay inside room ${collider.roomId}`
      ).toBe(true);
      UPPER_FLOOR_RESERVED_BLOCKERS.forEach((blocker, blockerIndex) => {
        expect(
          rectanglesOverlap(collider, blocker, 0.001),
          `${collider.furnishingId} should not overlap reserved blocker ${blockerIndex}`
        ).toBe(false);
      });
      colliders.slice(index + 1).forEach((other) => {
        expectDefaultCollidersDoNotOverlap(
          collider,
          other,
          DEFAULT_UPPER_FLOOR_FURNISHINGS
        );
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
        minX: 3.124442635585339,
        maxX: 6.124442635585339,
        minZ: -21.88477631085024,
        maxZ: -14.884776310850238,
      },
      'creators-studio-sofa-rug': {
        minX: -4.379898987322333,
        maxX: 0.42010101267766675,
        minZ: -17.361374439273465,
        maxZ: -12.761374439273464,
      },
      'loft-library-area-rug': {
        minX: 2.8568542494923808,
        maxX: 8.45685424949238,
        minZ: -9.595331880577405,
        maxZ: -5.3953318805774035,
      },
      'focus-pods-soft-rug': {
        minX: 0.43553390593273766,
        maxX: 6.635533905932737,
        minZ: 15.53624817342638,
        maxZ: 19.53624817342638,
      },
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
    colliders.forEach(({ floorId, purpose, sourceId, sourceType }) => {
      expect(isLevelSourceId(sourceId)).toBe(true);
      expect(floorId).toBe('upper');
      expect(sourceType).toBe('generatedCollider');
      expect(purpose).toBe('upper-floor-furnishing');
      expect(sourceId.startsWith('upper.furnishings.')).toBe(true);
    });
  });

  it('keeps default upper-floor inventory complete by category and collider intent', () => {
    expect(DEFAULT_UPPER_FLOOR_FURNISHINGS).toHaveLength(44);
    expect(countDefinitionsByCategory(DEFAULT_UPPER_FLOOR_FURNISHINGS)).toEqual(
      {
        'creators-studio': 8,
        'focus-pods': 6,
        'loft-library': 7,
        'plants-lighting-decor': 17,
        'upper-landing': 6,
      }
    );

    const { colliders, decorativeFootprints } = createUpperFloorFurnishings();
    const solidDefinitions = DEFAULT_UPPER_FLOOR_FURNISHINGS.filter(
      (definition) => definition.solidFootprint
    );
    const decorativeDefinitions = DEFAULT_UPPER_FLOOR_FURNISHINGS.filter(
      (definition) => definition.decorativeFootprint
    );
    const visualOnlyDefinitions = DEFAULT_UPPER_FLOOR_FURNISHINGS.filter(
      (definition) =>
        !definition.solidFootprint && !definition.decorativeFootprint
    );

    expect(colliders).toHaveLength(solidDefinitions.length);
    expect(decorativeFootprints).toHaveLength(decorativeDefinitions.length);
    expect(new Set(colliders.map(({ furnishingId }) => furnishingId))).toEqual(
      new Set(solidDefinitions.map(({ id }) => id))
    );
    expect(
      new Set(decorativeFootprints.map(({ furnishingId }) => furnishingId))
    ).toEqual(new Set(decorativeDefinitions.map(({ id }) => id)));

    visualOnlyDefinitions.forEach(({ id }) => {
      expect(colliders.some(({ furnishingId }) => furnishingId === id)).toBe(
        false
      );
      expect(
        decorativeFootprints.some(({ furnishingId }) => furnishingId === id)
      ).toBe(false);
    });
  });

  it('keeps deterministic upper-floor plant and greenery coverage', () => {
    expectGreeneryCoverage(
      DEFAULT_UPPER_FLOOR_FURNISHINGS,
      UPPER_FLOOR_GREENERY_EXPECTATIONS
    );
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
          position: { x: 8.8, z: -14 },
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
          position: { x: 12.7, z: -20 },
        },
      ])
    ).toThrow(/overlaps/);
  });

  it('reserves current upper POI footprints without blocking landing navigation', () => {
    const upperPoiBlockers = [
      {
        label: 'jobbot-studio-terminal',
        roomId: 'creatorsStudio',
        position: { x: -16.76 * Math.SQRT1_2, z: -28.8 * Math.SQRT1_2 },
        expectedBlocker: {
          minX: -18.4 * Math.SQRT1_2,
          maxX: -15.1 * Math.SQRT1_2,
          minZ: -30.4 * Math.SQRT1_2,
          maxZ: -27.2 * Math.SQRT1_2,
        },
      },
      {
        label: 'axel-studio-tracker',
        roomId: 'creatorsStudio',
        position: { x: -12.42 * Math.SQRT1_2, z: -19.18 * Math.SQRT1_2 },
        expectedBlocker: {
          minX: -14.0 * Math.SQRT1_2,
          maxX: -10.8 * Math.SQRT1_2,
          minZ: -20.8 * Math.SQRT1_2,
          maxZ: -17.6 * Math.SQRT1_2,
        },
      },
      {
        label: 'wove-kitchen-loom',
        roomId: 'loftLibrary',
        position: { x: 16.48 * Math.SQRT1_2, z: 4.27 * Math.SQRT1_2 },
        expectedBlocker: {
          minX: 14.8 * Math.SQRT1_2,
          maxX: 18.2 * Math.SQRT1_2,
          minZ: 2.6 * Math.SQRT1_2,
          maxZ: 5.9 * Math.SQRT1_2,
        },
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
    minX: -20.7 * Math.SQRT1_2,
    maxX: -15.4 * Math.SQRT1_2,
    minZ: -30.8 * Math.SQRT1_2 + 1,
    maxZ: -25.5 * Math.SQRT1_2 + 1,
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

function countDefinitionsByCategory(
  definitions: readonly { category: string }[]
): Record<string, number> {
  return definitions.reduce<Record<string, number>>((counts, definition) => {
    counts[definition.category] = (counts[definition.category] ?? 0) + 1;
    return counts;
  }, {});
}

function expectGreeneryCoverage(
  definitions: readonly { id: string; kind: string; roomId: string }[],
  expectations: {
    total: number;
    byRoom: Record<string, number>;
    byVariety: Record<string, readonly string[]>;
  }
): void {
  const expectedGreeneryIds = new Set(
    Object.values(expectations.byVariety).flat()
  );
  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition])
  );
  const greeneryDefinitions = [...expectedGreeneryIds].map((id) => {
    const definition = definitionsById.get(id);

    expect(
      definition,
      `${id} should exist in default greenery coverage`
    ).toBeDefined();
    return definition;
  });

  expect(greeneryDefinitions).toHaveLength(expectations.total);
  expect(countDefinitionsByRoom(greeneryDefinitions)).toEqual(
    expectations.byRoom
  );

  Object.entries(expectations.byVariety).forEach(([variety, ids]) => {
    ids.forEach((id) => {
      const definition = definitionsById.get(id);

      expect(
        definition,
        `${id} should exist for ${variety} greenery coverage`
      ).toBeDefined();
      expect(
        expectedGreeneryIds.has(id),
        `${id} should be counted in total greenery coverage`
      ).toBe(true);
    });
  });
}

function countDefinitionsByRoom(
  definitions: readonly ({ roomId: string } | undefined)[]
): Record<string, number> {
  return definitions.reduce<Record<string, number>>((counts, definition) => {
    if (!definition) return counts;

    counts[definition.roomId] = (counts[definition.roomId] ?? 0) + 1;
    return counts;
  }, {});
}

function expectDefaultCollidersDoNotOverlap(
  collider: FloorFurnishingCollider<string, string>,
  other: FloorFurnishingCollider<string, string>,
  definitions: readonly {
    id: string;
    visual?: { allowSolidOverlapWithIds?: readonly string[] };
  }[]
): void {
  const definitionById = new Map(
    definitions.map((definition) => [definition.id, definition])
  );
  const colliderDefinition = definitionById.get(collider.furnishingId);
  const otherDefinition = definitionById.get(other.furnishingId);
  const allowedOverlap =
    colliderDefinition?.visual?.allowSolidOverlapWithIds?.includes(
      other.furnishingId
    ) &&
    otherDefinition?.visual?.allowSolidOverlapWithIds?.includes(
      collider.furnishingId
    );

  if (allowedOverlap) return;

  expect(
    rectanglesOverlap(collider, other, 0.001),
    `${collider.furnishingId} (${collider.category}) should not overlap ` +
      `${other.furnishingId} (${other.category})`
  ).toBe(false);
}

function expectFinitePositiveCollider(
  collider: FloorFurnishingCollider<string, string>
): void {
  expect(Number.isFinite(collider.minX)).toBe(true);
  expect(Number.isFinite(collider.maxX)).toBe(true);
  expect(Number.isFinite(collider.minZ)).toBe(true);
  expect(Number.isFinite(collider.maxZ)).toBe(true);
  expect(collider.maxX - collider.minX).toBeGreaterThan(0);
  expect(collider.maxZ - collider.minZ).toBeGreaterThan(0);
}
