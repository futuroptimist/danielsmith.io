import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { collidesWithColliders } from '../../../systems/collision';
import {
  createUpperStairwellLanding,
  createUpperStairwellVoidGuardColliders,
} from '../upperStairwellLanding';

const overlaps = (
  first: { minX: number; maxX: number; minZ: number; maxZ: number },
  second: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  first.minX < second.maxX &&
  first.maxX > second.minX &&
  first.minZ < second.maxZ &&
  first.maxZ > second.minZ;

describe('createUpperStairwellLanding', () => {
  it('keeps the stair-top landing entry open while blocking the hidden run', () => {
    const playerRadius = 0.75;
    const colliders = createUpperStairwellVoidGuardColliders({
      openingBounds: { minX: 8, maxX: 16, minZ: -31.9, maxZ: -16 },
      descentCorridorBounds: {
        minX: 10.05,
        maxX: 14.75,
        minZ: -25.9,
        maxZ: -10.6,
      },
      landingEntryBounds: { minX: 9.3, maxX: 15.5, minZ: -30.3, maxZ: -25.9 },
      stairTopZ: -25.9,
      stairDirection: -1,
      playerRadius,
      landingTriggerMargin: 0.4,
      hiddenRunMaxZ: -18.7,
    });
    const bounds = colliders.map((collider) => collider.bounds);

    expect(colliders.map((collider) => collider.name)).toEqual([
      'UpperStairwellVoidGuard-WestLower',
      'UpperStairwellVoidGuard-WestUpper',
      'UpperStairwellVoidGuard-East',
      'UpperStairwellVoidGuard-HiddenRun',
    ]);
    expect(collidesWithColliders(12.4, -27.7, playerRadius, bounds)).toBe(
      false
    );
    expect(collidesWithColliders(10.8, -29.5, playerRadius, bounds)).toBe(
      false
    );
    expect(collidesWithColliders(12.7, -23.72, playerRadius, bounds)).toBe(
      true
    );
  });

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

  it('fills floorless shoulder strips while leaving the descent corridor open', () => {
    const openingBounds = { minX: -2, maxX: 2, minZ: -8, maxZ: 6 };
    const descentCorridorBounds = {
      minX: -1.2,
      maxX: 1.1,
      minZ: -7.6,
      maxZ: 6,
    };
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds,
      descentCorridorBounds,
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        material: { color: 0xff0000 },
      },
    });

    expect(result.colliders).toHaveLength(5);
    expect(result.colliders).toContainEqual({
      minX: -2,
      maxX: -1.2,
      minZ: -8,
      maxZ: 6,
    });
    expect(result.colliders).toContainEqual({
      minX: 1.1,
      maxX: 2,
      minZ: -8,
      maxZ: 6,
    });

    const descentPath = { minX: -1.2, maxX: 1.1, minZ: -7.5, maxZ: 6 };
    expect(
      result.colliders.some((collider) => overlaps(collider, descentPath))
    ).toBe(false);
  });

  it('clamps guard colliders to the landing room when the opening touches an edge', () => {
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -2, maxX: 4, minZ: -6, maxZ: 6 },
      openingBounds: { minX: -2, maxX: 2, minZ: -4, maxZ: 4 },
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.4,
        material: { color: 0xff0000 },
      },
    });

    expect(result.colliders).not.toContainEqual({
      minX: -2.4,
      maxX: -2,
      minZ: -4,
      maxZ: 4,
    });
    expect(result.colliders).toHaveLength(2);
    for (const collider of result.colliders) {
      expect(collider.minX).toBeGreaterThanOrEqual(-2);
      expect(collider.maxX).toBeLessThanOrEqual(4);
      expect(collider.minZ).toBeGreaterThanOrEqual(-6);
      expect(collider.maxZ).toBeLessThanOrEqual(6);
    }
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
