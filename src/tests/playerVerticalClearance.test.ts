import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  WALL_THICKNESS,
} from '../assets/floorPlan';
import { createUpperStairSafetyColliders } from '../scene/level/stairSafetyColliders';
import {
  STAIRCASE_CONFIG,
  STAIRCASE_TRANSITION_MARGIN,
} from '../scene/structures/portfolioSceneLayout';
import {
  AVATAR_COLLISION_RADIUS as radius,
  TARGET_AVATAR_HEIGHT,
  DOOR_CLEAR_HEIGHT,
  TARGET_ROOM_CLEAR_HEIGHT,
} from '../scene/units';
import { collidesWithColliders } from '../systems/collision';
import {
  computeStairLayout,
  computeStairwellOpeningBounds,
} from '../systems/movement/stairLayout';
import { createStairNavigationZones } from '../systems/movement/stairs';

describe('enlarged player physical clearance regressions', () => {
  it('rejects old lintels and ceilings while clearing their raised replacements', () => {
    const actor = {
      feetY: 0,
      height: TARGET_AVATAR_HEIGHT,
      activeConnectionId: null,
    };
    for (const [oldHeight, newHeight] of [
      [2.1, DOOR_CLEAR_HEIGHT],
      [2.74, TARGET_ROOM_CLEAR_HEIGHT],
    ]) {
      const slab = {
        minX: -2,
        maxX: 2,
        minZ: -2,
        maxZ: 2,
        minY: oldHeight,
        maxY: oldHeight + 0.3,
      };
      expect(collidesWithColliders(0, 0, radius, [slab], actor)).toBe(true);
      expect(
        collidesWithColliders(
          0,
          0,
          radius,
          [{ ...slab, minY: newHeight, maxY: newHeight + 0.3 }],
          actor
        )
      ).toBe(false);
    }
  });
  it('keeps the full capsule within the real stair width and retains positive void guards', () => {
    const c = STAIRCASE_CONFIG;
    const transitionMargin = STAIRCASE_TRANSITION_MARGIN,
      landingTriggerMargin = 0.2 * FLOOR_PLAN_SCALE;
    const layout = computeStairLayout({
      baseZ: c.basePosition.z,
      stepRun: c.step.run,
      stepCount: c.step.count,
      landingDepth: c.landing.depth,
      direction: c.direction,
      guardMargin: transitionMargin,
      stairwellMargin: 0.4 * FLOOR_PLAN_SCALE,
    });
    const geometry = {
      centerX: c.basePosition.x,
      halfWidth: c.step.width / 2,
      bottomZ: c.basePosition.z,
      topZ: layout.topZ,
      landingMinZ: layout.landingMinZ,
      landingMaxZ: layout.landingMaxZ,
      totalRise: c.step.count * c.step.rise,
      direction: layout.directionMultiplier,
    };
    const zones = createStairNavigationZones(geometry, {
      transitionMargin,
      landingTriggerMargin,
      stepRise: c.step.rise,
      descentCorridorInset: radius,
    });
    expect(zones.explicitDescentCorridor.minX - radius).toBeCloseTo(
      geometry.centerX - geometry.halfWidth,
      8
    );
    expect(zones.explicitDescentCorridor.maxX + radius).toBeCloseTo(
      geometry.centerX + geometry.halfWidth,
      8
    );
    expect(
      zones.explicitDescentCorridor.maxX - zones.explicitDescentCorridor.minX
    ).toBeCloseTo(0.15, 8);
    const room = UPPER_FLOOR_PLAN.rooms.find((r) => r.id === 'upperLanding')!;
    const opening = computeStairwellOpeningBounds({
      centerX: geometry.centerX,
      halfWidth: geometry.halfWidth,
      marginX: 0.2 * FLOOR_PLAN_SCALE,
      roomBounds: room.bounds,
      layout,
    });
    const guards = createUpperStairSafetyColliders({
      stairCenterX: geometry.centerX,
      stairHalfWidth: geometry.halfWidth,
      playerRadius: radius,
      wallThickness: WALL_THICKNESS,
      doorwayDepth: WALL_THICKNESS + radius * 2,
      stairwellMarginX: 0.2 * FLOOR_PLAN_SCALE,
      stairTopZ: layout.topZ,
      stairLandingTriggerMargin: landingTriggerMargin,
      stairLayoutDirectionMultiplier: layout.directionMultiplier,
      upperLandingRoomBounds: room.bounds,
      upperStairwellOpening: opening,
      stairNavigationZones: zones,
      upperStairBannisterThickness: c.landing.guard.thickness,
    });
    expect(guards.map((g) => g.name)).toContain('UpperStairEastUpperVoidGuard');
    for (const g of guards) {
      expect(g.bounds.maxX).toBeGreaterThan(g.bounds.minX);
      expect(g.bounds.maxZ).toBeGreaterThan(g.bounds.minZ);
    }
  });
});
