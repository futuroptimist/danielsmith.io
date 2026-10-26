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
          // Probe angled entries and nonzero lateral offsets separately. These
          // verify passability; combined steering error is measured below.
          for (const [degrees, lateral] of [
            [0, 0],
            [0, -0.05],
            [0, 0.05],
            [-10, 0],
            [10, 0],
          ]) {
            for (const direction of [-1, 1]) {
              for (let step = 0; step <= 120; step++) {
                const normal = (-1.5 + step * 0.025) * direction;
                const tangent =
                  lateral + normal * Math.tan((degrees * Math.PI) / 180);
                expect(
                  collidesWithColliders(
                    cx - (dz / length) * normal + (dx / length) * tangent,
                    cz + (dx / length) * normal + (dz / length) * tangent,
                    AVATAR_COLLISION_RADIUS,
                    walls.map((w) => w.collider)
                  ),
                  `sample ${step}, direction ${direction}, angle ${degrees}, offset ${lateral}`
                ).toBe(false);
              }
            }
          }
          if (Math.abs((gap.end - gap.start) * FLOOR_PLAN_SCALE - 2.4) < 1e-6) {
            // Characterize the existing usability limit; this is not an accepted
            // combined-error target and does not replace the crossing assertions.
            const blocked = Array.from({ length: 601 }, (_, i) => {
              const normal = -1.5 + i * 0.005;
              const tangent = 0.05 + normal * Math.tan(Math.PI / 18);
              return collidesWithColliders(
                cx - (dz / length) * normal + (dx / length) * tangent,
                cz + (dx / length) * normal + (dz / length) * tangent,
                AVATAR_COLLISION_RADIUS,
                walls.map((w) => w.collider)
              );
            }).some(Boolean);
            expect(blocked).toBe(true);
          }
        });
      }
    }
  });
}

// A circular capsule sweeping obliquely through a wall of finite thickness
// needs a wider aperture than its diameter, even when its path crosses the center.
it('distinguishes centered passability from combined steering-error clearance', () => {
  const angle = (10 * Math.PI) / 180;
  const lateralError = 0.05;
  const requiredWidth =
    (2 * AVATAR_COLLISION_RADIUS) / Math.cos(angle) +
    WALL_THICKNESS * Math.tan(angle) +
    2 * lateralError;
  expect(requiredWidth).toBeGreaterThan(2.4);
  expect(requiredWidth - 2.4).toBeLessThan(0.08);
});
