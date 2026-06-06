import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { createUpperStairwellLanding } from '../upperStairwellLanding';

const roomBounds = { minX: 4, maxX: 20, minZ: -32, maxZ: -16 };
const opening = { minX: 9, maxX: 15, minZ: -31.5, maxZ: -10 };

const getMeshes = (result: ReturnType<typeof createUpperStairwellLanding>) =>
  result.group.children.filter((child): child is Mesh => child instanceof Mesh);

describe('createUpperStairwellLanding', () => {
  it('builds guard rails without adding a slab over the descent opening', () => {
    const result = createUpperStairwellLanding({
      roomBounds,
      opening,
      elevation: 4,
      material: { color: 0xffffff },
      guard: { height: 0.6, thickness: 0.2, endInset: 0.4 },
    });

    const meshes = getMeshes(result);
    expect(meshes.map((mesh) => mesh.name)).toEqual([
      'UpperStairwellLandingGuardLeft',
      'UpperStairwellLandingGuardRight',
    ]);

    meshes.forEach((mesh) => {
      const geometry = mesh.geometry as BoxGeometry;
      expect(geometry.parameters.width).toBeCloseTo(0.2);
      expect(geometry.parameters.height).toBeCloseTo(0.6);
      expect(geometry.parameters.depth).toBeCloseTo(14.7);
    });
  });

  it('adds guard colliders on sealed side edges without crossing the stair path', () => {
    const result = createUpperStairwellLanding({
      roomBounds,
      opening,
      elevation: 4,
      material: { color: 0xffffff },
      guard: { height: 0.6, thickness: 0.2, endInset: 0.4 },
    });

    expect(result.colliders).toHaveLength(2);
    const [left, right] = result.colliders;
    expect(left).toEqual({ minX: 9, maxX: 9.2, minZ: -31.1, maxZ: -16.4 });
    expect(right).toEqual({ minX: 14.8, maxX: 15, minZ: -31.1, maxZ: -16.4 });
    expect(left.maxX).toBeLessThan(right.minX);
  });
});
