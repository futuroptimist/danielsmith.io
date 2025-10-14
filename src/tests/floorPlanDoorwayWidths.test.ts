import { describe, expect, it } from 'vitest';

import {
  assertDoorwayWidths,
  type FloorPlanDefinition,
  FLOOR_PLAN,
  UPPER_FLOOR_PLAN,
} from '../assets/floorPlan';

const createPlan = (doorWidth: number): FloorPlanDefinition => ({
  outline: [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 4],
  ],
  rooms: [
    {
      id: 'testRoom',
      name: 'Test Room',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
      ledColor: 0xffffff,
      doorways: [
        {
          wall: 'north',
          start: 1,
          end: 1 + doorWidth,
        },
      ],
    },
  ],
});

describe('assertDoorwayWidths', () => {
  it('does not throw for the current floor plans', () => {
    expect(() => assertDoorwayWidths(FLOOR_PLAN)).not.toThrow();
    expect(() => assertDoorwayWidths(UPPER_FLOOR_PLAN)).not.toThrow();
  });

  it('throws when a doorway is narrower than the minimum width', () => {
    const plan = createPlan(0.6);
    expect(() => assertDoorwayWidths(plan, { minWidth: 0.8 })).toThrow(
      /Doorway widths below 0\.80 units/
    );
  });

  it('allows minor tolerance overshoot', () => {
    const plan = createPlan(0.79995);
    expect(() =>
      assertDoorwayWidths(plan, { minWidth: 0.8, tolerance: 0.0002 })
    ).not.toThrow();
  });
});
