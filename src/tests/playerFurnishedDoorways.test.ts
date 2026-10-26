import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  UPPER_FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  WALL_THICKNESS,
} from '../assets/floorPlan';
import { getNormalizedDoorways } from '../assets/floorPlan/doorways';
import { generateWallSegmentInstances } from '../scene/level/generateWalls';
import { PORTFOLIO_LEVEL } from '../scene/level/portfolioLevel';
import { createUpperFloorFurnishings } from '../scene/structures/lowerFloorFurnishings';
import {
  AVATAR_COLLISION_RADIUS,
  TARGET_ROOM_CLEAR_HEIGHT,
} from '../scene/units';
import { collidesWithColliders } from '../systems/collision';

const floor = PORTFOLIO_LEVEL.floors.find((f) => f.id === 'upper')!;
const walls = generateWallSegmentInstances(floor, {
  coordinateScale: FLOOR_PLAN_SCALE,
  baseElevation: 0,
  wallHeight: TARGET_ROOM_CLEAR_HEIGHT,
  wallThickness: WALL_THICKNESS,
  fenceHeight: 2.4,
  fenceThickness: 0.28,
  getRoomCategory: (id) =>
    floor.rooms.find((r) => r.id === id)?.category ?? 'interior',
});
const furnishings = createUpperFloorFurnishings();
const colliders = [...walls.map((w) => w.collider), ...furnishings.colliders];
describe('upper doorways with actual furniture footprints', () => {
  it.each(
    getNormalizedDoorways(UPPER_FLOOR_PLAN).map((door, i) => ({ door, i }))
  )('keeps a full-radius center crossing open at doorway $i', ({ door }) => {
    expect(
      collidesWithColliders(
        door.center.x,
        door.center.z,
        AVATAR_COLLISION_RADIUS,
        colliders
      )
    ).toBe(false);
  });
});

it('moves the landing bench with its collider and preserves the wall-side gap', () => {
  const bench = furnishings.colliders.find(
    (c) => c.furnishingId === 'upper-landing-bench'
  )!;
  const mesh = furnishings.group.getObjectByName(
    'Furnishing:upper-landing-bench'
  )!;
  const bounds = new Box3().setFromObject(mesh);
  expect(bounds.min.x).toBeCloseTo(bench.minX, 6);
  expect(bounds.max.x).toBeCloseTo(bench.maxX, 6);
  expect(bounds.min.z).toBeCloseTo(bench.minZ, 6);
  expect(bounds.max.z).toBeCloseTo(bench.maxZ, 6);
  const southWall = walls
    .map((w) => w.collider)
    .find(
      (c) => c.maxZ < bench.minZ && c.minX < bench.maxX && c.maxX > bench.minX
    )!;
  expect(bench.minZ - southWall.maxZ).toBeGreaterThan(0.07);
  const door = getNormalizedDoorways(UPPER_FLOOR_PLAN).find(
    (d) => d.axis === 'vertical' && d.center.z < -15
  )!;
  const oldBench = {
    ...bench,
    minZ: bench.minZ + 0.34,
    maxZ: bench.maxZ + 0.34,
  };
  expect(
    collidesWithColliders(
      door.center.x,
      door.center.z,
      AVATAR_COLLISION_RADIUS,
      [oldBench]
    )
  ).toBe(true);
  for (let offset = -1.5; offset <= 1.5; offset += 0.05) {
    expect(
      collidesWithColliders(
        door.center.x + offset,
        door.center.z,
        AVATAR_COLLISION_RADIUS,
        colliders
      )
    ).toBe(false);
  }
  for (const other of colliders.filter((c) => c !== bench)) {
    if (
      bench.minX < other.maxX &&
      bench.maxX > other.minX &&
      bench.minZ < other.maxZ &&
      bench.maxZ > other.minZ
    ) {
      // The fitted bench already intersects the west wall slightly; add no new contacts.
      expect(
        oldBench.minX < other.maxX &&
          oldBench.maxX > other.minX &&
          oldBench.minZ < other.maxZ &&
          oldBench.maxZ > other.minZ
      ).toBe(true);
    }
  }
});
