import type { Material, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createColliderDebugId,
  createColliderVisualizer,
} from '../colliderVisualizer';

const collider = {
  minX: 1,
  maxX: 3,
  minZ: 2,
  maxZ: 5,
};

const metadata = {
  floor: 'ground' as const,
  category: 'walls',
  name: 'ground-0',
  bounds: collider,
};

describe('createColliderDebugId', () => {
  it('is deterministic for the same collider metadata', () => {
    expect(createColliderDebugId(metadata)).toBe(
      createColliderDebugId(metadata)
    );
  });

  it('changes when meaningful metadata changes', () => {
    expect(createColliderDebugId(metadata)).not.toBe(
      createColliderDebugId({
        ...metadata,
        bounds: { ...metadata.bounds, maxX: metadata.bounds.maxX + 1 },
      })
    );
  });

  it('produces short uppercase hexadecimal labels', () => {
    expect(createColliderDebugId(metadata)).toMatch(/^[0-9A-F]{4,6}$/);
  });

  it('resolves ID collisions deterministically by extending the hash', () => {
    const baseId = createColliderDebugId(metadata);
    const resolvedId = createColliderDebugId(metadata, {
      usedIds: new Set([baseId]),
    });

    expect(resolvedId).toMatch(/^[0-9A-F]{4,6}$/);
    expect(resolvedId).not.toBe(baseId);
    expect(resolvedId).toBe(
      createColliderDebugId(metadata, { usedIds: new Set([baseId]) })
    );
  });
});

describe('createColliderVisualizer', () => {
  it('tracks total and active-floor visible collider counts', () => {
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });

    visualizer.register([
      {
        floor: 'ground',
        category: 'walls',
        name: 'ground-0',
        bounds: collider,
      },
      {
        floor: 'upper',
        category: 'walls',
        name: 'upper-0',
        bounds: { minX: -2, maxX: -1, minZ: -3, maxZ: -2 },
      },
      {
        floor: 'all',
        category: 'stairs',
        name: 'transition-0',
        bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 },
      },
    ]);

    expect(visualizer.getState()).toEqual({
      enabled: false,
      visibleColliderCount: 0,
      totalColliderCount: 3,
    });

    visualizer.setEnabled(true);
    expect(visualizer.getState()).toEqual({
      enabled: true,
      visibleColliderCount: 2,
      totalColliderCount: 3,
    });

    visualizer.setActiveFloor('upper');
    expect(visualizer.getState().visibleColliderCount).toBe(2);
  });

  it('returns redacted metadata copies and non-raycasting meshes', () => {
    const visualizer = createColliderVisualizer({
      activeFloorId: 'ground',
      enabled: true,
    });
    visualizer.register([
      {
        floor: 'ground',
        category: 'static',
        name: 'static-0',
        bounds: collider,
      },
    ]);

    const metadata = visualizer.getColliders();
    const id = metadata[0].id;
    metadata[0].bounds.minX = 99;

    expect(visualizer.getColliders()[0]).toEqual({
      id,
      floor: 'ground',
      category: 'static',
      name: 'static-0',
      bounds: collider,
    });
    expect(visualizer.getColliderById(id)).toEqual(
      visualizer.getColliders()[0]
    );
    const mesh = visualizer.group.children[0] as Mesh;
    const material = mesh.material as Material;

    expect(mesh.raycast({} as never, [] as never)).toBeUndefined();
    expect(material.depthTest).toBe(false);
  });

  it('creates floor-aware non-raycasting labels for registered colliders', () => {
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });
    visualizer.register([
      {
        floor: 'ground',
        category: 'walls',
        name: 'ground-0',
        bounds: collider,
      },
      {
        floor: 'upper',
        category: 'walls',
        name: 'upper-0',
        bounds: { minX: -2, maxX: -1, minZ: -3, maxZ: -2 },
      },
    ]);

    const labels = visualizer.group.children.filter((child) =>
      child.name.startsWith('DebugColliderLabel:')
    );
    expect(labels).toHaveLength(2);
    expect(labels[0].visible).toBe(false);

    visualizer.setEnabled(true);
    expect(labels[0].visible).toBe(true);
    expect(labels[1].visible).toBe(false);

    visualizer.setActiveFloor('upper');
    expect(labels[0].visible).toBe(false);
    expect(labels[1].visible).toBe(true);
    expect(labels[1].raycast({} as never, [] as never)).toBeUndefined();
  });
});
