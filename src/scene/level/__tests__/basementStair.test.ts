import { Box3, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import {
  BASEMENT_FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
} from '../../../assets/floorPlan';
import {
  createBasementStaircase,
  getBasementStairLayout,
} from '../../structures/basementStaircase';
import { DEFAULT_LOWER_FLOOR_FURNISHINGS } from '../../structures/lowerFloorFurnishings';
import { generateFloorSurfaces } from '../generateFloorSurfaces';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { validateLevelDefinition } from '../schema';

const radius = 0.75;
const intersects = (
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: typeof a
) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

describe('basement shell and stairs', () => {
  it('authors the museum in level units and compiles horizontal measurements once', () => {
    expect(validateLevelDefinition(PORTFOLIO_LEVEL).errors).toEqual([]);
    const room = BASEMENT_FLOOR_PLAN.rooms[0];
    expect(room.id).toBe('careerMuseum');
    expect(room.bounds.minZ).toBeCloseTo(-18 * FLOOR_PLAN_SCALE);
    expect(room.bounds.maxX).toBeCloseTo(16 * FLOOR_PLAN_SCALE);
    const build = createBasementStaircase(radius);
    expect(build.connection.lowerFloorElevation).toBe(-5);
    expect(build.geometry.topZ).toBeCloseTo(-7 * FLOOR_PLAN_SCALE);
    expect(build.geometry.landingMaxZ).toBeCloseTo(-4.4 * FLOOR_PLAN_SCALE);
    expect(build.connection.upperFloorElevation).toBe(0);
  });

  it('keeps a visible open run and exactly level landing without an opaque floor slab', () => {
    const stair = createBasementStaircase(radius);
    const floor = PORTFOLIO_LEVEL.floors.find(
      (entry) => entry.id === 'ground'
    )!;
    const tiles = generateFloorSurfaces(floor, {
      elevation: 0,
      cutoutsBySurfaceId: {
        'livingRoom-floor-main': stair.floorCutouts,
      },
    });
    for (let index = 0; index < stair.config.step.count; index += 1) {
      const x = stair.geometry.centerX;
      const z = stair.geometry.bottomZ + (index + 0.5) * stair.config.step.run;
      expect(
        tiles.tiles.some(
          ({ bounds }) =>
            x >= bounds.minX &&
            x <= bounds.maxX &&
            z >= bounds.minZ &&
            z <= bounds.maxZ
        )
      ).toBe(false);
      const step = stair.group.getObjectByName(`StaircaseStep-${index + 1}`)!;
      const box = new Box3().setFromObject(step);
      expect(box.max.y).toBeCloseTo(-5 + (index + 1) * stair.config.step.rise);
    }
    const landing = new Box3().setFromObject(
      stair.group.getObjectByName('StaircaseLanding')!
    );
    expect(landing.max.y).toBeCloseTo(0);
  });

  it('uses source-backed positive-area guards and shared tread geometry', () => {
    const stair = createBasementStaircase(radius);
    const sourceIds = stair.safety.map((guard) => guard.sourceId);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    const visualSources = new Set<string>();
    const treadGeometries = new Set();
    stair.group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      visualSources.add(object.userData.levelSourceId as string);
      if (object.name.startsWith('StaircaseStep-'))
        treadGeometries.add(object.geometry);
    });
    expect(treadGeometries.size).toBe(1);
    for (const guard of stair.safety) {
      expect(guard.bounds.maxX).toBeGreaterThan(guard.bounds.minX);
      expect(guard.bounds.maxZ).toBeGreaterThan(guard.bounds.minZ);
      expect(visualSources.has(guard.sourceId)).toBe(true);
    }
  });

  it('reserves radius-adjusted circulation and turning pads without using the parallel stair gap', () => {
    const stair = getBasementStairLayout(radius);
    const westGuard = stair.safety.find(
      (guard) => guard.name === 'BasementStairs-ground-westVoidRail'
    )!;
    expect(stair.config.step.width - radius * 2).toBeGreaterThanOrEqual(3);
    const lowerRoomWallInnerZ = BASEMENT_FLOOR_PLAN.rooms[0].bounds.minZ + 0.25;
    const lowerRailToe = stair.geometry.bottomZ - stair.thickness;
    expect(
      lowerRailToe - lowerRoomWallInnerZ - radius * 2
    ).toBeGreaterThanOrEqual(3);
    const northWallInnerZ = -8.25;
    expect(
      northWallInnerZ - westGuard.bounds.maxZ - radius * 2
    ).toBeGreaterThanOrEqual(3);
    // The current portfolio exhibit is the west-side limiting obstacle near spawn.
    expect(westGuard.bounds.minX - -5.14 - radius * 2).toBeGreaterThanOrEqual(
      2.5
    );
    const console = DEFAULT_LOWER_FLOOR_FURNISHINGS.find(
      (item) => item.id === 'living-room-slim-entry-console'
    )!;
    const consoleBounds = {
      minX: console.position.x - 1.3,
      maxX: console.position.x + 1.3,
      minZ: console.position.z - 0.35,
      maxZ: console.position.z + 0.35,
    };
    expect(intersects(consoleBounds, stair.landing)).toBe(false);
    expect(
      stair.landing.minX - consoleBounds.maxX - radius * 2
    ).toBeGreaterThanOrEqual(2.5);
    // Future exhibit reservations remain clear of the stair and each other.
    const exhibitCenters = [
      [-9, -9],
      [-9, 1],
      [10, 1],
      [10, -10],
    ];
    for (const [x, z] of exhibitCenters) {
      const reservation = {
        minX: x * FLOOR_PLAN_SCALE - 2.4 - radius,
        maxX: x * FLOOR_PLAN_SCALE + 2.4 + radius,
        minZ: z * FLOOR_PLAN_SCALE - 1.5 - radius,
        maxZ: z * FLOOR_PLAN_SCALE + 1.5 + radius,
      };
      expect(
        stair.safety
          .filter((guard) => guard.floor === 'basement')
          .some((guard) => intersects(reservation, guard.bounds))
      ).toBe(false);
    }
  });
});
