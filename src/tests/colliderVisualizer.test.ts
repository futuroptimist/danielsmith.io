import { Scene } from 'three';
import { describe, expect, it } from 'vitest';

import { createColliderVisualizer } from '../scene/debug/colliderVisualizer';

const colliders = [
  {
    floor: 'ground' as const,
    category: 'ground',
    name: 'ground-wall',
    bounds: { minX: 0, maxX: 2, minZ: 0, maxZ: 1 },
  },
  {
    floor: 'upper' as const,
    category: 'upper-floor',
    name: 'upper-wall',
    bounds: { minX: 3, maxX: 4, minZ: 3, maxZ: 5 },
    elevation: 6,
  },
  {
    floor: 'all' as const,
    category: 'stairs',
    name: 'handoff',
    bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
  },
];

describe('createColliderVisualizer', () => {
  it('hides debug geometry until enabled and filters by active floor', () => {
    const scene = new Scene();
    const visualizer = createColliderVisualizer({
      scene,
      colliders,
      activeFloorId: 'ground',
    });

    expect(scene.children).toContain(visualizer.group);
    expect(visualizer.group.visible).toBe(false);
    expect(visualizer.getState()).toEqual({
      enabled: false,
      visibleColliderCount: 0,
      totalColliderCount: 3,
    });

    visualizer.setEnabled(true);

    expect(visualizer.group.visible).toBe(true);
    expect(visualizer.getState()).toEqual({
      enabled: true,
      visibleColliderCount: 2,
      totalColliderCount: 3,
    });
    expect(visualizer.group.children.map((child) => child.visible)).toEqual([
      true,
      false,
      true,
    ]);

    visualizer.setActiveFloorId('upper');

    expect(visualizer.getState().visibleColliderCount).toBe(2);
    expect(visualizer.group.children.map((child) => child.visible)).toEqual([
      false,
      true,
      true,
    ]);

    visualizer.dispose();
    expect(scene.children).not.toContain(visualizer.group);
  });

  it('returns redacted collider metadata and disables raycasting', () => {
    const visualizer = createColliderVisualizer({
      scene: new Scene(),
      colliders,
      activeFloorId: 'ground',
      enabled: true,
    });

    expect(visualizer.getColliders()).toEqual(
      colliders.map(({ floor, category, name, bounds }) => ({
        floor,
        category,
        name,
        bounds,
      }))
    );
    expect((visualizer.group.raycast as () => undefined)()).toBeUndefined();
    expect(
      (visualizer.group.children[0].raycast as () => undefined)()
    ).toBeUndefined();
  });
});
