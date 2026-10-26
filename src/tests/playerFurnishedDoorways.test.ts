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
