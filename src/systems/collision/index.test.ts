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
