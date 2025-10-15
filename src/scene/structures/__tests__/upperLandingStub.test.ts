import { BoxGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { createUpperLandingStub } from '../upperLandingStub';

describe('createUpperLandingStub', () => {
  it('creates a landing slab that starts past the stair landing', () => {
    const result = createUpperLandingStub({
      bounds: { minX: -4, maxX: 4, minZ: -20, maxZ: -8 },
      landingMaxZ: -12,
      elevation: 4,
      thickness: 0.4,
      landingClearance: 0.2,
      material: { color: 0xffffff },
    });

    const slab = result.group.children.find(
      (child) => child.name === 'UpperLandingStubSlab'
    );
    if (!slab) {
      throw new Error('Expected slab mesh to be created');
    }

    const geometry = slab.geometry as BoxGeometry;
    expect(geometry.parameters.width).toBeCloseTo(8);
    expect(geometry.parameters.depth).toBeCloseTo(3.8);
    expect(slab.position.x).toBeCloseTo(0);
    expect(slab.position.y).toBeCloseTo(3.8);
    expect(slab.position.z).toBeCloseTo(-9.9);
  });

  it('adds a guard rail collider when configured', () => {
    const result = createUpperLandingStub({
      bounds: { minX: -4, maxX: 4, minZ: -20, maxZ: -8 },
      landingMaxZ: -12,
      elevation: 4,
      thickness: 0.4,
      landingClearance: 0.2,
      material: { color: 0xffffff },
      guard: {
        height: 0.6,
        thickness: 0.2,
        inset: 0.4,
        material: { color: 0xff0000 },
      },
    });

    const guard = result.group.children.find(
      (child) => child.name === 'UpperLandingStubGuard'
    );
    if (!guard) {
      throw new Error('Expected guard mesh to be created');
    }

    expect(guard.position.x).toBeCloseTo(0);
    expect(guard.position.y).toBeCloseTo(4.3);
    expect(guard.position.z).toBeCloseTo(-8.1);

    expect(result.colliders).toHaveLength(1);
    const [collider] = result.colliders;
    expect(collider.minX).toBeCloseTo(-3.6);
    expect(collider.maxX).toBeCloseTo(3.6);
    expect(collider.minZ).toBeCloseTo(-8.2);
    expect(collider.maxZ).toBeCloseTo(-8);
  });
});
