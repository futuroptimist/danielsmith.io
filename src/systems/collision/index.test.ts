import { describe, expect, it } from 'vitest';

import { collidesWithColliders, type RectCollider } from './index';

describe('collidesWithColliders', () => {
  const collider: RectCollider = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };

  it('returns false when there are no colliders', () => {
    expect(collidesWithColliders(0, 0, 0.5, [])).toBe(false);
  });

  it('returns false when the circle is outside the collider radius', () => {
    expect(collidesWithColliders(2, 0.5, 0.4, [collider])).toBe(false);
  });

  it('detects overlap along an axis', () => {
    expect(collidesWithColliders(1.2, 0.5, 0.3, [collider])).toBe(true);
  });

  it('detects overlap near a corner', () => {
    const result = collidesWithColliders(1.2, 1.2, 0.3, [collider]);
    expect(result).toBe(true);
  });

  it('honors collider bounds for interior points', () => {
    expect(collidesWithColliders(0.5, 0.5, 0.3, [collider])).toBe(true);
  });
});

describe('elevated collision volumes', () => {
  const solid: RectCollider = {
    minX: 0,
    maxX: 1,
    minZ: 0,
    maxZ: 1,
    minY: 3,
    maxY: 4,
  };
  const actor = { feetY: 0, height: 2.6, activeConnectionId: null };
  it('allows clearance below and above solids while rejecting body overlap', () => {
    expect(collidesWithColliders(0.5, 0.5, 0.3, [solid], actor)).toBe(false);
    expect(
      collidesWithColliders(0.5, 0.5, 0.3, [solid], { ...actor, feetY: 0.5 })
    ).toBe(true);
    expect(
      collidesWithColliders(0.5, 0.5, 0.3, [solid], { ...actor, feetY: 4 })
    ).toBe(false);
    expect(collidesWithColliders(0.5, 0.5, 0.3, [solid])).toBe(true);
  });
  it('exempts only the admitted connection surface, retaining its elevated side guards', () => {
    const tread = { ...solid, traversableConnectionId: 'upper-stairs' };
    const onRamp = { ...actor, feetY: 2, activeConnectionId: 'upper-stairs' };
    expect(collidesWithColliders(0.5, 0.5, 0.3, [tread], onRamp)).toBe(false);
    expect(collidesWithColliders(0.5, 0.5, 0.3, [solid], onRamp)).toBe(true);
    expect(
      collidesWithColliders(0.5, 0.5, 0.3, [tread], {
        ...onRamp,
        activeConnectionId: 'basement-stairs',
      })
    ).toBe(true);
  });
});
