import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../assets/floorPlan';
import { createExteriorDoorDefinitions } from '../scene/level/exteriorLayout';
import { FLOOR_TOP_ELEVATIONS } from '../scene/level/floorElevations';
import { createGarageDoorDefinitions } from '../scene/level/garageLayout';
import { createBasementStaircase } from '../scene/structures/basementStaircase';
import { createRoomCeilingPanels } from '../scene/structures/ceilingPanels';
import { STAIRCASE_CONFIG } from '../scene/structures/portfolioSceneLayout';
import { createStaircase } from '../scene/structures/staircase';
import { createWoodworkingWorkshop } from '../scene/structures/woodworkingWorkshop';
import { AVATAR_COLLISION_RADIUS, TARGET_AVATAR_HEIGHT } from '../scene/units';

describe('metre-scaled room assemblies', () => {
  it.each(Object.entries(FLOOR_TOP_ELEVATIONS))(
    'provides 4.11m clear height on %s with an open stair aperture',
    (_floor, elevation) => {
      const opening = { minX: 2, maxX: 4, minZ: 3, maxZ: 7 };
      const ceiling = createRoomCeilingPanels(
        [
          {
            id: 'test-room',
            name: 'Test room',
            ledColor: 0xffffff,
            bounds: { minX: 0, maxX: 10, minZ: 0, maxZ: 10 },
          },
        ],
        {
          height: elevation + 4.26,
          thickness: 0.3,
          inset: 0,
          cutouts: [opening],
        }
      );
      expect(ceiling.panels.length).toBeGreaterThan(1);
      for (const { mesh } of ceiling.panels) {
        const bounds = new Box3().setFromObject(mesh);
        expect(bounds.min.y - elevation).toBeCloseTo(4.11);
        expect(bounds.max.y - elevation).toBeCloseTo(4.41);
        expect(
          bounds.min.x < opening.maxX &&
            bounds.max.x > opening.minX &&
            bounds.min.z < opening.maxZ &&
            bounds.max.z > opening.minZ
        ).toBe(false);
      }
    }
  );

  it('joins both floors with eighteen uniform rises and a level slab', () => {
    const basement = createBasementStaircase();
    for (const [config, build] of [
      [STAIRCASE_CONFIG, createStaircase(STAIRCASE_CONFIG)],
      [basement.config, basement],
    ] as const) {
      build.group.updateMatrixWorld(true);
      expect(config.step.count).toBe(18);
      expect(config.step.run).toBeCloseTo(0.28);
      expect(config.step.width).toBeCloseTo(2.4);
      let previous = config.basePosition.y;
      for (let i = 1; i <= config.step.count; i++) {
        const bounds = new Box3().setFromObject(
          build.group.getObjectByName(`StaircaseStep-${i}`)!
        );
        expect(bounds.max.y - previous).toBeCloseTo(4.41 / 18);
        previous = bounds.max.y;
      }
      const landing = new Box3().setFromObject(
        build.group.getObjectByName('StaircaseLanding')!
      );
      expect(landing.max.y).toBeCloseTo(previous);
      expect(landing.max.y - config.basePosition.y).toBeCloseTo(4.41);
      expect(landing.max.y - landing.min.y).toBeCloseTo(0.3);
    }
  });

  it('retains authored aperture widths and fits the taller player through doors with physical head clearance', () => {
    const doors = [
      ...createExteriorDoorDefinitions(FLOOR_PLAN_SCALE),
      ...createGarageDoorDefinitions(FLOOR_PLAN_SCALE),
    ];
    for (const door of doors) {
      expect(door.width).toBe(door.id === 'garage-door' ? 5 : 2.4);
      expect(AVATAR_COLLISION_RADIUS).toBe(1.125);
      expect(door.height).toBeGreaterThan(TARGET_AVATAR_HEIGHT);
      expect(door.height).toBeLessThan(4.11);
    }
  });

  it('keeps workshop visual bounds inside matching physical collider envelopes below the ceiling', () => {
    const workshop = createWoodworkingWorkshop('high');
    workshop.group.updateMatrixWorld(true);
    for (const station of workshop.stations) {
      const bounds = new Box3().setFromObject(station.group);
      expect(bounds.max.y - FLOOR_TOP_ELEVATIONS.basement).toBeLessThan(2);
      expect(bounds.min.x).toBeGreaterThanOrEqual(station.collider.minX - 0.01);
      expect(bounds.max.x).toBeLessThanOrEqual(station.collider.maxX + 0.01);
      expect(bounds.min.z).toBeGreaterThanOrEqual(station.collider.minZ - 0.01);
      expect(bounds.max.z).toBeLessThanOrEqual(station.collider.maxZ + 0.01);
    }
    workshop.dispose();
  });
});
