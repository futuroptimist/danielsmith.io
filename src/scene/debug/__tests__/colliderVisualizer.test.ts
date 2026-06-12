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

  it('produces stable six-character uppercase hexadecimal IDs from collider metadata', () => {
    expect(createColliderDebugId(metadata)).toMatch(/^[0-9A-F]{6}$/);
  });

  it('ignores occupied four-character prefixes when the six-character ID is free', () => {
    const firstId = createColliderDebugId(metadata);
    const prefixOnlyIds = new Set([firstId.slice(0, 4), firstId.slice(0, 5)]);

    expect(createColliderDebugId(metadata, prefixOnlyIds)).toBe(firstId);
  });

  it('handles collisions with deterministic short hexadecimal retry IDs', () => {
    const firstId = createColliderDebugId(metadata);
    const firstRetryId = createColliderDebugId(metadata, new Set([firstId]));
    const secondRetryId = createColliderDebugId(
      metadata,
      new Set([firstId, firstRetryId])
    );
    const thirdRetryId = createColliderDebugId(
      metadata,
      new Set([firstId, firstRetryId, secondRetryId])
    );

    expect(firstRetryId).toMatch(/^[0-9A-F]{4}$/);
    expect(secondRetryId).toMatch(/^[0-9A-F]{5}$/);
    expect(secondRetryId.startsWith(firstRetryId)).toBe(true);
    expect(thirdRetryId).toMatch(/^[0-9A-F]{6}$/);
    expect(thirdRetryId.startsWith(secondRetryId)).toBe(true);
    expect(
      [firstRetryId, secondRetryId, thirdRetryId].every(
        (id) => !id.includes('-')
      )
    ).toBe(true);
    expect(createColliderDebugId(metadata, new Set([firstId]))).toBe(
      firstRetryId
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
    expect(visualizer.getColliderById('')).toBeUndefined();
    expect(visualizer.getColliderById(null)).toBeUndefined();
    expect(visualizer.getColliderById(undefined)).toBeUndefined();
    expect(visualizer.getColliderById(1234)).toBeUndefined();
    expect(visualizer.getColliderById('missing')).toBeUndefined();
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

  it('keeps six-character IDs stable across four-character prefix collisions', () => {
    const colliders = [
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'prefix-collider-142',
        bounds: collider,
      },
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'prefix-collider-182',
        bounds: collider,
      },
    ];
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });
    const reversedVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });

    visualizer.register(colliders);
    reversedVisualizer.register([...colliders].reverse());

    const idsByName = new Map(
      visualizer.getColliders().map((next) => [next.name, next.id])
    );
    const reversedIdsByName = new Map(
      reversedVisualizer.getColliders().map((next) => [next.name, next.id])
    );

    expect(idsByName).toEqual(reversedIdsByName);
    expect(idsByName.get('prefix-collider-142')).toBe('E8936E');
    expect(idsByName.get('prefix-collider-182')).toBe('E893DC');
  });

  it('keeps exact six-character hash collisions stable within one registration batch', () => {
    const colliders = [
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'collision-5',
        bounds: collider,
      },
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'collision-3441',
        bounds: collider,
      },
    ];
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });
    const reversedVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });

    expect(colliders.map((next) => createColliderDebugId(next))).toEqual([
      '53D147',
      '53D147',
    ]);

    visualizer.register(colliders);
    reversedVisualizer.register([...colliders].reverse());

    const idsByName = new Map(
      visualizer.getColliders().map((next) => [next.name, next.id])
    );
    const reversedIdsByName = new Map(
      reversedVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const ids = [...idsByName.values()];

    expect(idsByName).toEqual(reversedIdsByName);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[0-9A-F]{4,6}$/.test(id))).toBe(true);
    expect(ids.every((id) => !id.includes('-'))).toBe(true);
    expect(ids).not.toContain('53D147');
  });

  it('preserves exposed IDs when later registrations collide', () => {
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });
    const firstCollider = {
      floor: 'ground' as const,
      category: 'walls',
      name: 'collision-5',
      bounds: collider,
    };
    const collidingCollider = {
      floor: 'ground' as const,
      category: 'walls',
      name: 'collision-3441',
      bounds: collider,
    };

    visualizer.register([firstCollider]);
    const exposedId = visualizer.getColliders()[0].id;
    const exposedMeshName = visualizer.group.children.find(
      (child) => child.type === 'Mesh'
    )?.name;
    const exposedLabelName = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    )?.name;

    expect(exposedId).toBe('53D147');
    expect(visualizer.getColliderById(exposedId)?.name).toBe('collision-5');

    visualizer.register([collidingCollider]);

    const collidersByName = new Map(
      visualizer.getColliders().map((next) => [next.name, next])
    );
    const ids = visualizer.getColliders().map((next) => next.id);

    expect(collidersByName.get('collision-5')?.id).toBe(exposedId);
    expect(visualizer.getColliderById(exposedId)?.name).toBe('collision-5');
    expect(collidersByName.get('collision-3441')?.id).not.toBe(exposedId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[0-9A-F]{4,6}$/.test(id))).toBe(true);
    expect(ids.every((id) => !id.includes('-'))).toBe(true);
    expect(
      visualizer.group.children.find((child) => child.type === 'Mesh')?.name
    ).toBe(exposedMeshName);
    expect(
      visualizer.group.children.find((child) => child.type === 'Sprite')?.name
    ).toBe(exposedLabelName);
  });

  it('keeps duplicate registrations unique with short hex IDs', () => {
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });
    visualizer.register([
      {
        floor: 'ground',
        category: 'walls',
        name: 'duplicate-0',
        bounds: collider,
      },
      {
        floor: 'ground',
        category: 'walls',
        name: 'duplicate-0',
        bounds: collider,
      },
    ]);

    const ids = visualizer.getColliders().map((next) => next.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[0-9A-F]{4,6}$/.test(id))).toBe(true);
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
        label.name.match(/^DebugColliderLabel:[0-9A-F]{4,6}$/)
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
