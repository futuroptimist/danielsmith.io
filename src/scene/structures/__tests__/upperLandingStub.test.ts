import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { computeStairLayout } from '../../../systems/movement/stairLayout';
import {
  createUpperStairwellHoleBounds,
  createUpperStairwellLanding,
} from '../upperLandingStub';

const overlaps = (
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  other: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  bounds.minX < other.maxX &&
  bounds.maxX > other.minX &&
  bounds.minZ < other.maxZ &&
  bounds.maxZ > other.minZ;

describe('createUpperStairwellHoleBounds', () => {
  it('matches the stair layout hole range plus side margin', () => {
    const layout = computeStairLayout({
      baseZ: -10.6,
      stepRun: 1.7,
      stepCount: 9,
      landingDepth: 5.2,
      direction: 'negativeZ',
      guardMargin: 1.2,
      stairwellMargin: 0.8,
    });

    const bounds = createUpperStairwellHoleBounds({
      roomBounds: { minX: 4, maxX: 20.8, minZ: -32, maxZ: -16 },
      stairCenterX: 12.4,
      stairHalfWidth: 3.1,
      stairwellMarginX: 0.4,
      stairHoleRange: layout.stairHoleRange,
    });

    expect(bounds.minX).toBeCloseTo(8.9);
    expect(bounds.maxX).toBeCloseTo(15.9);
    expect(bounds.minZ).toBeCloseTo(layout.stairHoleRange.minZ);
    expect(bounds.maxZ).toBeCloseTo(-16);
  });
});

describe('createUpperStairwellLanding', () => {
  const stairwellBounds = { minX: 8.9, maxX: 15.9, minZ: -31.9, maxZ: -16 };
  const descentPath = { minX: 10.05, maxX: 14.75, minZ: -25.9, maxZ: -16 };

  it('does not add a slab or any mesh covering the descent opening', () => {
    const result = createUpperStairwellLanding({
      stairwellBounds,
      elevation: 4.16,
      guard: {
        height: 0.62,
        thickness: 0.24,
        material: { color: 0x2a3241 },
      },
    });

    expect(result.group.name).toBe('UpperStairwellLanding');
    expect(result.group.children.map((child) => child.name)).toEqual([
      'UpperStairwellLandingGuardLeft',
      'UpperStairwellLandingGuardRight',
    ]);

    for (const child of result.group.children) {
      expect(child.name).not.toContain('Slab');
      const mesh = child as Mesh;
      const geometry = mesh.geometry as BoxGeometry;
      const meshBounds = {
        minX: mesh.position.x - geometry.parameters.width / 2,
        maxX: mesh.position.x + geometry.parameters.width / 2,
        minZ: mesh.position.z - geometry.parameters.depth / 2,
        maxZ: mesh.position.z + geometry.parameters.depth / 2,
      };
      expect(overlaps(meshBounds, descentPath)).toBe(false);
    }
  });

  it('adds guard colliders around non-traversable edges but not across the stair path', () => {
    const result = createUpperStairwellLanding({
      stairwellBounds,
      elevation: 4.16,
      guard: {
        height: 0.62,
        thickness: 0.24,
        material: { color: 0x2a3241 },
      },
    });

    expect(result.colliders).toHaveLength(2);
    expect(result.colliders[0].minX).toBeCloseTo(8.9);
    expect(result.colliders[0].maxX).toBeCloseTo(9.14);
    expect(result.colliders[0].minZ).toBeCloseTo(-31.9);
    expect(result.colliders[0].maxZ).toBeCloseTo(-16);
    expect(result.colliders[1].minX).toBeCloseTo(15.66);
    expect(result.colliders[1].maxX).toBeCloseTo(15.9);
    expect(result.colliders[1].minZ).toBeCloseTo(-31.9);
    expect(result.colliders[1].maxZ).toBeCloseTo(-16);

    for (const collider of result.colliders) {
      expect(overlaps(collider, descentPath)).toBe(false);
    }
  });
});
