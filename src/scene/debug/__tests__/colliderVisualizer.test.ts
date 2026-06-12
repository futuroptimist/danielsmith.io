import type { Material, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createColliderDebugId,
  createColliderVisualizer,
  type DebugColliderIdMetadata,
} from '../colliderVisualizer';

const collider = {
  minX: 1,
  maxX: 3,
  minZ: 2,
  maxZ: 5,
};

const debugMetadata: DebugColliderIdMetadata = {
  floor: 'ground',
  category: 'walls',
  name: 'GroundWallWest',
  bounds: collider,
};

const expectHexId = (id: string) => {
  expect(id).toMatch(/^[0-9A-F]{4,8}$/);
};

describe('createColliderDebugId', () => {
  it('is deterministic for the same stable collider metadata', () => {
    const first = createColliderDebugId(debugMetadata);
    const second = createColliderDebugId({
      ...debugMetadata,
      bounds: { ...collider },
    });

    expect(second).toBe(first);
    expectHexId(first);
  });

  it('changes when meaningful metadata changes', () => {
    const first = createColliderDebugId(debugMetadata);
    const renamed = createColliderDebugId({
      ...debugMetadata,
      name: 'GroundWallEast',
    });
    const moved = createColliderDebugId({
      ...debugMetadata,
      bounds: { ...collider, maxZ: collider.maxZ + 0.25 },
    });

    expect(renamed).not.toBe(first);
    expect(moved).not.toBe(first);
  });

  it('produces uppercase hex IDs', () => {
    expect(createColliderDebugId(debugMetadata)).toMatch(/^[0-9A-F]+$/);
  });

  it('resolves used-ID collisions deterministically by extending the hash', () => {
    const first = createColliderDebugId(debugMetadata);
    const second = createColliderDebugId(debugMetadata, new Set([first]));
    const third = createColliderDebugId(
      debugMetadata,
      new Set([first, second])
    );

    expect(second).toHaveLength(first.length + 1);
    expect(third).toHaveLength(second.length + 1);
    expect(second.startsWith(first)).toBe(true);
    expect(third.startsWith(second)).toBe(true);
    expect(new Set([first, second, third]).size).toBe(3);
    expectHexId(second);
    expectHexId(third);
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
      visibleLabelCount: 0,
      totalLabelCount: 0,
    });

    visualizer.setEnabled(true);
    expect(visualizer.getState()).toEqual({
      enabled: true,
      visibleColliderCount: 2,
      totalColliderCount: 3,
      visibleLabelCount: 0,
      totalLabelCount: 0,
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

    const [metadata] = visualizer.getColliders();
    metadata.bounds.minX = 99;

    const [colliderCopy] = visualizer.getColliders();
    expect(colliderCopy).toEqual({
      id: metadata.id,
      floor: 'ground',
      category: 'static',
      name: 'static-0',
      bounds: collider,
    });
    expectHexId(colliderCopy.id);
    expect(visualizer.getColliderById(colliderCopy.id)).toEqual(colliderCopy);
    expect(visualizer.getColliderById(colliderCopy.id.toLowerCase())).toEqual(
      colliderCopy
    );
    const mesh = visualizer.group.children[0] as Mesh;
    const material = mesh.material as Material;

    expect(mesh.raycast({} as never, [] as never)).toBeUndefined();
    expect(material.depthTest).toBe(false);
  });

  it('assigns unique IDs to duplicate registered colliders', () => {
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });

    visualizer.register([
      {
        floor: 'ground',
        category: 'walls',
        name: 'duplicate-wall',
        bounds: collider,
      },
      {
        floor: 'ground',
        category: 'walls',
        name: 'duplicate-wall',
        bounds: collider,
      },
    ]);

    const ids = visualizer.getColliders().map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(expectHexId);
  });
});
