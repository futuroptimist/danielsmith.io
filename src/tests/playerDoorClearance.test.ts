import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  WALL_THICKNESS,
} from '../assets/floorPlan';
import { getNormalizedDoorways } from '../assets/floorPlan/doorways';
import { createExteriorDoorDefinitions } from '../scene/level/exteriorLayout';
import { createDoorwayOpenings } from '../scene/structures/doorwayOpenings';
import { WALL_HEIGHT } from '../scene/structures/portfolioSceneLayout';
import {
  AVATAR_COLLISION_RADIUS,
  DOOR_CLEAR_HEIGHT,
  TARGET_AVATAR_HEIGHT,
} from '../scene/units';

describe('full player clearance through rendered ordinary doorways', () => {
  const owned = createExteriorDoorDefinitions(FLOOR_PLAN_SCALE).map((d) => ({
    axis: 'vertical' as const,
    center: d.center,
    width: d.width,
  }));
  const openings = getNormalizedDoorways(FLOOR_PLAN).filter(
    (d) =>
      !owned.some(
        (o) =>
          o.axis === d.axis &&
          Math.abs(o.center.x - d.center.x) < 1e-5 &&
          Math.abs(o.center.z - d.center.z) < 1e-5 &&
          Math.abs(o.width - d.width) < 1e-5
      )
  );
  const built = createDoorwayOpenings(FLOOR_PLAN, {
    factoryFramedOpenings: owned,
    wallHeight: WALL_HEIGHT,
    doorHeight: DOOR_CLEAR_HEIGHT,
    jambThickness: WALL_THICKNESS * 0.76,
    lintelThickness: 0.26,
    trimDepth: WALL_THICKNESS * 0.92,
  });
  built.group.updateMatrixWorld(true);
  it.each(openings.map((door, i) => ({ door, i })))(
    'keeps the full capsule clear at opening $i',
    ({ door, i }) => {
      const group = built.group.children[i];
      const key = door.axis === 'horizontal' ? 'x' : 'z';
      const jambs = group.children
        .filter((o) => o.name.includes('Jamb'))
        .map((o) => new Box3().setFromObject(o))
        .sort((a, b) => a.min[key] - b.min[key]);
      const clear = jambs[1].min[key] - jambs[0].max[key];
      // The rendered aperture must match the authoritative wall/navigation gap.
      expect(clear).toBeCloseTo(door.width, 5);
      expect(clear).toBeGreaterThan(2 * AVATAR_COLLISION_RADIUS);
      const lintel = group.children.find((o) => o.name.includes('Lintel'))!;
      const lintelBounds = new Box3().setFromObject(lintel);
      expect(lintelBounds.min.y).toBeCloseTo(DOOR_CLEAR_HEIGHT, 5);
      expect(lintelBounds.min.y - TARGET_AVATAR_HEIGHT).toBeGreaterThan(0.29);
    }
  );
});
