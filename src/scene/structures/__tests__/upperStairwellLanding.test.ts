import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { createUpperStairwellLanding } from '../upperStairwellLanding';

const overlaps = (
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

const fullyCovers = (
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  a.minX <= b.minX && a.maxX >= b.maxX && a.minZ <= b.minZ && a.maxZ >= b.maxZ;

describe('createUpperStairwellLanding', () => {
  it('adds side guard colliders without crossing the traversable stair path', () => {
    const stairwellOpening = { minX: -1, maxX: 1, minZ: -4, maxZ: 4 };
    const result = createUpperStairwellLanding({
      bounds: { minX: -4, maxX: 4, minZ: -5, maxZ: 5 },
      stairwellOpening,
      elevation: 4,
      material: { color: 0xffffff },
      guard: {
        height: 0.6,
        thickness: 0.2,
        endInset: 0.5,
        material: { color: 0xff0000 },
      },
    });

    expect(result.group.name).toBe('UpperStairwellLanding');
    expect(result.colliders).toHaveLength(2);
    expect(result.colliders[0].minX).toBeCloseTo(-1.2);
    expect(result.colliders[0].maxX).toBeCloseTo(-1);
    expect(result.colliders[0].minZ).toBeCloseTo(-3.5);
    expect(result.colliders[0].maxZ).toBeCloseTo(3.5);
    expect(result.colliders[1].minX).toBeCloseTo(1);
    expect(result.colliders[1].maxX).toBeCloseTo(1.2);
    expect(result.colliders[1].minZ).toBeCloseTo(-3.5);
    expect(result.colliders[1].maxZ).toBeCloseTo(3.5);

    for (const collider of result.colliders) {
      expect(overlaps(collider, stairwellOpening)).toBe(false);
    }
  });

  it('does not create a slab or mesh that fully covers the descent opening', () => {
    const stairwellOpening = { minX: -1, maxX: 1, minZ: -4, maxZ: 4 };
    const result = createUpperStairwellLanding({
      bounds: { minX: -4, maxX: 4, minZ: -5, maxZ: 5 },
      stairwellOpening,
      elevation: 4,
      material: { color: 0xffffff },
      guard: {
        height: 0.6,
        thickness: 0.2,
        endInset: 0,
      },
    });

    expect(result.group.children).toHaveLength(2);
    expect(
      result.group.children.some((child) => child.name.includes('Slab'))
    ).toBe(false);

    for (const child of result.group.children) {
      expect(child).toBeInstanceOf(Mesh);
      const mesh = child as Mesh;
      const geometry = mesh.geometry as BoxGeometry;
      const bounds = {
        minX: mesh.position.x - geometry.parameters.width / 2,
        maxX: mesh.position.x + geometry.parameters.width / 2,
        minZ: mesh.position.z - geometry.parameters.depth / 2,
        maxZ: mesh.position.z + geometry.parameters.depth / 2,
      };

      expect(fullyCovers(bounds, stairwellOpening)).toBe(false);
    }
  });
});
