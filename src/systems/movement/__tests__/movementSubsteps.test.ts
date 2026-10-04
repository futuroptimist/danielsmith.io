import { describe, expect, it } from 'vitest';

import { planMovementSubsteps } from '../movementSubsteps';

describe('planMovementSubsteps', () => {
  it('preserves ordinary displacement and zero-motion height updates', () => {
    expect(planMovementSubsteps(0, 0, 0.375)).toEqual({
      count: 1,
      stepX: 0,
      stepZ: 0,
      truncated: false,
    });
    expect(planMovementSubsteps(0.1, -0.2, 0.375)).toEqual({
      count: 1,
      stepX: 0.1,
      stepZ: -0.2,
      truncated: false,
    });
  });

  it.each([
    [0, -1.8],
    [0, 1.92],
    [-12, 9],
    [12, -9],
  ])(
    'subdivides a slow-frame vector (%s, %s) without losing travel',
    (dx, dz) => {
      const plan = planMovementSubsteps(dx, dz, 0.375);
      expect(plan.count).toBeGreaterThan(1);
      expect(Math.hypot(plan.stepX, plan.stepZ)).toBeLessThanOrEqual(
        0.375 + Number.EPSILON
      );
      expect(plan.stepX * plan.count).toBeCloseTo(dx, 12);
      expect(plan.stepZ * plan.count).toBeCloseTo(dz, 12);
      expect(plan.truncated).toBe(false);
    }
  );

  it('bounds work after extreme stalls without widening steps or reversing input', () => {
    const plan = planMovementSubsteps(3000, -4000, 0.375);
    expect(plan.count).toBe(64);
    expect(plan.truncated).toBe(true);
    expect(Math.hypot(plan.stepX, plan.stepZ)).toBeCloseTo(0.375, 12);
    expect(plan.stepX / plan.stepZ).toBeCloseTo(-0.75, 12);
    expect(Math.hypot(plan.stepX, plan.stepZ) * plan.count).toBe(24);
  });

  it.each([
    [NaN, 0, 0.375, 64],
    [0, Infinity, 0.375, 64],
    [0, 0, 0, 64],
    [0, 0, -1, 64],
    [0, 0, Infinity, 64],
    [0, 0, 0.375, 0],
    [0, 0, 0.375, 1.5],
    [Number.MAX_VALUE, Number.MAX_VALUE, 0.375, 64],
  ])('rejects invalid or overflowing inputs', (dx, dz, limit, count) => {
    expect(() => planMovementSubsteps(dx, dz, limit, count)).toThrow();
  });
});
