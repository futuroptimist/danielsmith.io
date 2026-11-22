import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_LEVELS } from '../../../assets/floorPlan';
import { createBasementStaircase } from '../../structures/basementStaircase';
import { DEFAULT_LOWER_FLOOR_FURNISHINGS } from '../../structures/lowerFloorFurnishings';
import { STAIRCASE_CONFIG } from '../../structures/portfolioSceneLayout';
import { TARGET_AVATAR_HEIGHT, TARGET_ROOM_CLEAR_HEIGHT } from '../../units';

const before: Record<string, [number, number]> = {
  careerMuseum: [64, 52],
  livingRoom: [64, 24],
  studio: [36, 24],
  kitchen: [28, 24],
  garage: [18, 24],
  upperLanding: [16.8, 16],
  creatorsStudio: [24, 32],
  loftLibrary: [20, 28],
  focusPods: [44, 16],
};
describe('half-area house footprint', () => {
  it.each(Object.entries(before))(
    '%s halves area without changing aspect ratio',
    (id, [width, depth]) => {
      const room = FLOOR_PLAN_LEVELS.flatMap((level) => level.plan.rooms).find(
        (room) => room.id === id
      )!;
      const w = room.bounds.maxX - room.bounds.minX,
        d = room.bounds.maxZ - room.bounds.minZ;
      expect(w * d).toBeCloseTo(width * depth * 0.5, 8);
      expect(w / d).toBeCloseTo(width / depth, 8);
    }
  );
  it('retains horizontal stair dimensions with the expanded vertical scale', () => {
    expect(TARGET_ROOM_CLEAR_HEIGHT).toBeCloseTo(4.11);
    expect(TARGET_AVATAR_HEIGHT).toBeCloseTo(2.85);
    for (const stair of [STAIRCASE_CONFIG, createBasementStaircase().config]) {
      expect(stair.step.width).toBe(2.4);
      expect(stair.step.run).toBe(0.28);
      expect(stair.step.count).toBe(18);
    }
  });
  it('preserves the physical kitchenette counter while moving its collider with it', () => {
    const item = DEFAULT_LOWER_FLOOR_FURNISHINGS.find(
      (item) => item.id === 'kitchen-west-counter-run'
    )!;
    expect(item.solidBounds!.maxX - item.solidBounds!.minX).toBeCloseTo(
      item.solidFootprint!.width
    );
    expect(item.solidBounds!.maxZ - item.solidBounds!.minZ).toBeCloseTo(
      item.solidFootprint!.depth
    );
  });
});
