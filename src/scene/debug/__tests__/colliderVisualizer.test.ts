import type { Material, Mesh, Sprite } from 'three';
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
  name: 'GroundWallWest',
  bounds: collider,
};

describe('createColliderDebugId', () => {
  it('is deterministic for the same stable collider metadata', () => {
    expect(createColliderDebugId(metadata)).toBe(
      createColliderDebugId(metadata)
    );
  });

  it('changes when meaningful collider metadata changes', () => {
    expect(createColliderDebugId(metadata)).not.toBe(
      createColliderDebugId({
        ...metadata,
        bounds: { ...metadata.bounds, maxZ: 5.5 },
      })
    );
  });

  it('produces short uppercase hexadecimal IDs', () => {
    expect(createColliderDebugId(metadata)).toMatch(/^[0-9A-F]{4,6}$/);
  });

  it('handles collisions deterministically by extending the hexadecimal hash', () => {
    const firstId = createColliderDebugId(metadata);
    const collidingId = createColliderDebugId(metadata, new Set([firstId]));

    expect(collidingId).toMatch(/^[0-9A-F]{5,8}$/);
    expect(collidingId.startsWith(firstId)).toBe(true);
    expect(createColliderDebugId(metadata, new Set([firstId]))).toBe(
      collidingId
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

    const metadataCopy = visualizer.getColliders();
    const expectedId = createColliderDebugId({
      floor: 'ground',
      category: 'static',
      name: 'static-0',
      bounds: collider,
    });
    metadataCopy[0].bounds.minX = 99;

    expect(visualizer.getColliders()[0]).toEqual({
      id: expectedId,
      floor: 'ground',
      category: 'static',
      name: 'static-0',
      bounds: collider,
    });
    expect(visualizer.getColliderById(expectedId)).toEqual({
      id: expectedId,
      floor: 'ground',
      category: 'static',
      name: 'static-0',
      bounds: collider,
    });
    expect(visualizer.getColliderById(expectedId.toLowerCase())?.id).toBe(
      expectedId
    );
    const mesh = visualizer.group.children.find(
      (child) => child.type === 'Mesh'
    ) as Mesh;
    const label = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    ) as Sprite;
    const material = mesh.material as Material;

    expect(mesh.raycast({} as never, [] as never)).toBeUndefined();
    expect(label.raycast({} as never, [] as never)).toBeUndefined();
    expect(material.depthTest).toBe(false);
  });

  it('creates floor-aware labels that toggle with debug collider visibility', () => {
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

    const labels = visualizer.group.children.filter(
      (child) => child.type === 'Sprite'
    );
    expect(labels).toHaveLength(2);
    expect(labels.every((label) => label.visible === false)).toBe(true);
    expect(
      labels.every((label) =>
        label.name.match(/^DebugColliderLabel:[0-9A-F]{4,}/)
      )
    ).toBe(true);

    visualizer.setEnabled(true);
    expect(labels.map((label) => label.visible)).toEqual([true, false]);

    visualizer.setActiveFloor('upper');
    expect(labels.map((label) => label.visible)).toEqual([false, true]);

    visualizer.setEnabled(false);
    expect(labels.every((label) => label.visible === false)).toBe(true);
  });
});
