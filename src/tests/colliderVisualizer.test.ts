import { describe, expect, it } from 'vitest';

import { createColliderVisualizer } from '../scene/debug/colliderVisualizer';

const testColliders = [
  {
    floor: 'ground' as const,
    category: 'ground' as const,
    name: 'ground-wall',
    collider: { minX: 0, maxX: 2, minZ: 0, maxZ: 1 },
  },
  {
    floor: 'upper' as const,
    category: 'upper' as const,
    name: 'upper-wall',
    collider: { minX: 4, maxX: 6, minZ: 2, maxZ: 3 },
  },
  {
    floor: 'all' as const,
    category: 'stair' as const,
    name: 'transition-blocker',
    collider: { minX: -1, maxX: 1, minZ: -2, maxZ: -1 },
  },
];

describe('createColliderVisualizer', () => {
  it('keeps debug geometry hidden until enabled and filters by active floor', () => {
    const visualizer = createColliderVisualizer({
      colliders: testColliders,
      activeFloor: 'ground',
      floorHeights: { ground: 0, upper: 6 },
    });

    expect(visualizer.group.visible).toBe(false);
    expect(visualizer.getState()).toEqual({
      enabled: false,
      visibleColliderCount: 0,
      totalColliderCount: 3,
    });

    visualizer.setEnabled(true);

    expect(visualizer.group.visible).toBe(true);
    expect(visualizer.getState().visibleColliderCount).toBe(2);
    expect(visualizer.group.children.map((child) => child.visible)).toEqual([
      true,
      false,
      true,
    ]);

    visualizer.setActiveFloor('upper');

    expect(visualizer.getState().visibleColliderCount).toBe(2);
    expect(visualizer.group.children.map((child) => child.visible)).toEqual([
      false,
      true,
      true,
    ]);

    visualizer.setEnabled(false);

    expect(visualizer.group.visible).toBe(false);
    expect(visualizer.getState().visibleColliderCount).toBe(0);

    visualizer.dispose();
  });

  it('exposes cloned collider metadata without mutating source registrations', () => {
    const visualizer = createColliderVisualizer({
      colliders: testColliders,
      activeFloor: 'ground',
    });

    const [metadata] = visualizer.getColliders();
    metadata.bounds.minX = 99;

    expect(testColliders[0].collider.minX).toBe(0);
    expect(visualizer.getColliders()[0]).toEqual({
      floor: 'ground',
      category: 'ground',
      name: 'ground-wall',
      bounds: { minX: 0, maxX: 2, minZ: 0, maxZ: 1 },
    });

    visualizer.dispose();
  });
});
