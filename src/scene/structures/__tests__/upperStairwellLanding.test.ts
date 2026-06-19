import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { assertLevelSourceId } from '../../level/sourceIds';
import { UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES } from '../../level/upperStairwellLandingSegments';
import { createUpperStairwellLanding } from '../upperStairwellLanding';

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
    expect(result.segments.map((segment) => segment.bounds)).toHaveLength(3);
    expect(result.segments.map((segment) => segment.bounds)).toContainEqual({
      minX: -2.2,
      maxX: -2,
      minZ: -8,
      maxZ: 6,
    });
    expect(result.segments.map((segment) => segment.bounds)).toContainEqual({
      minX: 2,
      maxX: 2.2,
      minZ: -8,
      maxZ: 6,
    });
    expect(result.segments.map((segment) => segment.bounds)).toContainEqual({
      minX: -2,
      maxX: 2,
      minZ: -8,
      maxZ: -7.8,
    });

    const descentPath = { minX: -1.6, maxX: 1.6, minZ: -7.5, maxZ: 6 };
    expect(
      result.segments
        .map((segment) => segment.bounds)
        .some((collider) => overlaps(collider, descentPath))
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

    expect(result.segments.map((segment) => segment.bounds)).toHaveLength(5);
    expect(result.segments.map((segment) => segment.bounds)).toContainEqual({
      minX: -2,
      maxX: -1.2,
      minZ: -8,
      maxZ: 6,
    });
    expect(result.segments.map((segment) => segment.bounds)).toContainEqual({
      minX: 1.1,
      maxX: 2,
      minZ: -8,
      maxZ: 6,
    });

    const descentPath = { minX: -1.2, maxX: 1.1, minZ: -7.5, maxZ: 6 };
    expect(
      result.segments
        .map((segment) => segment.bounds)
        .some((collider) => overlaps(collider, descentPath))
    ).toBe(false);
  });

  it('renders visual-only segments while emitting only policy-enabled colliders', () => {
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds: { minX: -2, maxX: 2, minZ: -8, maxZ: 6 },
      descentCorridorBounds: {
        minX: -1.2,
        maxX: 1.1,
        minZ: -7.6,
        maxZ: 6,
      },
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        segments: [
          {
            role: 'side-east',
            render: true,
            collision: false,
            sourceId: assertLevelSourceId('test.upper.sideEast'),
          },
          {
            role: 'far',
            render: true,
            collision: false,
            sourceId: assertLevelSourceId('test.upper.far'),
          },
          {
            role: 'shoulder-east',
            render: true,
            collision: true,
            sourceId: assertLevelSourceId('test.upper.shoulderEast'),
            colliderName: 'UpperStairwellLandingGuard-3',
          },
        ],
        material: { color: 0xff0000 },
      },
    });

    expect(result.group.children.map((child) => child.name)).toEqual([
      'UpperStairwellLandingSideGuard-East',
      'UpperStairwellLandingFarGuard',
      'UpperStairwellLandingShoulderGuard-East',
    ]);
    expect(result.segments).toEqual([
      {
        role: 'shoulder-east',
        sourceId: assertLevelSourceId('test.upper.shoulderEast'),
        name: 'UpperStairwellLandingGuard-3',
        bounds: {
          minX: 1.1,
          maxX: 2,
          minZ: -8,
          maxZ: 6,
        },
      },
    ]);
  });

  it('emits only the production east shoulder collider with source metadata', () => {
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds: { minX: -2, maxX: 2, minZ: -8, maxZ: 6 },
      descentCorridorBounds: {
        minX: -1.2,
        maxX: 1.1,
        minZ: -7.6,
        maxZ: 6,
      },
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        segments: UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES,
        material: { color: 0xff0000 },
      },
    });

    expect(result.group.children.map((child) => child.name)).toEqual([
      'UpperStairwellLandingSideGuard-East',
      'UpperStairwellLandingFarGuard',
      'UpperStairwellLandingShoulderGuard-East',
    ]);
    expect(result.segments).toEqual([
      {
        role: 'shoulder-east',
        sourceId: assertLevelSourceId(
          'upper.stairwell.landing.shoulderEast.generatedCollider'
        ),
        name: 'UpperStairwellLandingGuard-3',
        bounds: {
          minX: 1.1,
          maxX: 2,
          minZ: -8,
          maxZ: 6,
        },
      },
    ]);
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

    expect(result.segments.map((segment) => segment.bounds)).not.toContainEqual(
      {
        minX: -2.4,
        maxX: -2,
        minZ: -4,
        maxZ: 4,
      }
    );
    expect(result.segments.map((segment) => segment.bounds)).toHaveLength(2);
    for (const collider of result.segments.map((segment) => segment.bounds)) {
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
