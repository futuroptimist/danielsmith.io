import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, WALL_THICKNESS } from '../assets/floorPlan';
import { generateWallSegmentInstances } from '../scene/level/generateWalls';
import { PORTFOLIO_LEVEL } from '../scene/level/portfolioLevel';
import {
  AVATAR_COLLISION_RADIUS,
  TARGET_ROOM_CLEAR_HEIGHT,
} from '../scene/units';
import { collidesWithColliders } from '../systems/collision';

for (const floor of PORTFOLIO_LEVEL.floors.filter((f) => f.id !== 'basement')) {
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
  describe(`${floor.id} enlarged-player doorway wall clearance`, () => {
    for (const wall of floor.walls) {
      const run = wall.run;
      if (!run) continue;
      for (const gap of run.gaps ?? []) {
        it(`crosses ${wall.id}: ${gap.label} in both directions`, () => {
          const dx = run.end.x - run.start.x,
            dz = run.end.z - run.start.z;
          const length = Math.hypot(dx, dz),
            along = (gap.start + gap.end) / 2;
          const cx = (run.start.x + (dx / length) * along) * FLOOR_PLAN_SCALE;
          const cz = (run.start.z + (dz / length) * along) * FLOOR_PLAN_SCALE;
          expect((gap.end - gap.start) * FLOOR_PLAN_SCALE).toBeGreaterThan(
            2 * AVATAR_COLLISION_RADIUS
          );
          for (const direction of [-1, 1])
            for (let step = 0; step <= 40; step++) {
              const offset = (-1.5 + step * 0.075) * direction;
              expect(
                collidesWithColliders(
                  cx - (dz / length) * offset,
                  cz + (dx / length) * offset,
                  AVATAR_COLLISION_RADIUS,
                  walls.map((w) => w.collider)
                ),
                `sample ${step}, direction ${direction}`
              ).toBe(false);
            }
        });
      }
    }
  });
}
