import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { createUpperStairwellLanding } from '../upperLandingStub';

const overlaps = (
  first: { minX: number; maxX: number; minZ: number; maxZ: number },
  second: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  first.minX < second.maxX &&
  first.maxX > second.minX &&
  first.minZ < second.maxZ &&
  first.maxZ > second.minZ;

describe('createUpperStairwellLanding', () => {
  it('adds guard colliders around sealed stairwell edges but not across the stair path', () => {
    const openingBounds = { minX: -2, maxX: 2, minZ: -8, maxZ: 6 };
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds,
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        material: { color: 0xff0000 },
      },
    });

    expect(result.group.name).toBe('UpperStairwellLanding');
    expect(result.colliders).toHaveLength(3);
    expect(result.colliders).toContainEqual({
      minX: -2.2,
      maxX: -2,
      minZ: -8,
      maxZ: 6,
    });
    expect(result.colliders).toContainEqual({
      minX: 2,
      maxX: 2.2,
      minZ: -8,
      maxZ: 6,
    });
    expect(result.colliders).toContainEqual({
      minX: -2,
      maxX: 2,
      minZ: -8,
      maxZ: -7.8,
    });

    const descentPath = { minX: -1.6, maxX: 1.6, minZ: -7.5, maxZ: 6 };
    expect(
      result.colliders.some((collider) => overlaps(collider, descentPath))
    ).toBe(false);
  });

  it('does not create a landing slab that covers the descent opening', () => {
    const openingBounds = { minX: -2, maxX: 2, minZ: -8, maxZ: 6 };
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds,
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        material: { color: 0xff0000 },
      },
    });

    const slab = result.group.children.find((child) =>
      child.name.includes('Slab')
    );
    expect(slab).toBeUndefined();

    for (const child of result.group.children) {
      const mesh = child as Mesh;
      const geometry = mesh.geometry as BoxGeometry;
      const bounds = {
        minX: mesh.position.x - geometry.parameters.width / 2,
        maxX: mesh.position.x + geometry.parameters.width / 2,
        minZ: mesh.position.z - geometry.parameters.depth / 2,
        maxZ: mesh.position.z + geometry.parameters.depth / 2,
      };
      expect(
        bounds.minX <= openingBounds.minX &&
          bounds.maxX >= openingBounds.maxX &&
          bounds.minZ <= openingBounds.minZ &&
          bounds.maxZ >= openingBounds.maxZ
      ).toBe(false);
    }
  });
});
