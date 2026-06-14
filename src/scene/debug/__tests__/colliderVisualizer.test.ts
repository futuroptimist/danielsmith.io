import type { Mesh, MeshBasicMaterial, Sprite, SpriteMaterial } from 'three';
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

  it('produces stable six-character uppercase hexadecimal IDs from fallback metadata', () => {
    expect(createColliderDebugId(metadata)).toMatch(/^[0-9A-F]{6}$/);
  });

  it('uses declared IDs for generated and named runtime colliders', () => {
    expect(
      createColliderDebugId({
        floor: 'ground',
        category: 'ground',
        name: 'ground-collider-1',
        bounds: collider,
      })
    ).toBe('1001');
    expect(
      createColliderDebugId({
        floor: 'ground',
        category: 'static',
        name: 'static-collider-15',
        bounds: collider,
      })
    ).toBe('200F');
    expect(
      createColliderDebugId({
        floor: 'upper',
        category: 'upper',
        name: 'upper-collider-2',
        bounds: collider,
      })
    ).toBe('3002');
    expect(
      createColliderDebugId({
        floor: 'upper',
        category: 'upper',
        name: 'UpperStairNorthBannisterGuard',
        bounds: collider,
      })
    ).toBe('400A');
    expect(
      createColliderDebugId({
        floor: 'ground',
        category: 'walls',
        name: 'collision-1104',
        bounds: collider,
      })
    ).toBe('C1104');
    expect(
      createColliderDebugId({
        floor: 'ground',
        category: 'walls',
        name: 'collision-2488',
        bounds: collider,
      })
    ).toBe('C2488');
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
      idsEnabled: true,
      visibleLabelCount: 0,
      totalLabelCount: 3,
    });

    visualizer.setEnabled(true);
    expect(visualizer.getState()).toEqual({
      enabled: true,
      visibleColliderCount: 2,
      totalColliderCount: 3,
      idsEnabled: true,
      visibleLabelCount: 2,
      totalLabelCount: 3,
    });

    visualizer.setActiveFloor('upper');
    expect(visualizer.getState().visibleColliderCount).toBe(2);
    expect(visualizer.getState().visibleLabelCount).toBe(2);
  });

  it('can hide collider ID labels while keeping wireframes visible', () => {
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

    visualizer.setIdsEnabled(false);

    const mesh = visualizer.group.children.find(
      (child) => child.type === 'Mesh'
    ) as Mesh;
    const label = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    ) as Sprite;
    expect(mesh.visible).toBe(true);
    expect(label.visible).toBe(false);
    expect(visualizer.getState().visibleColliderCount).toBe(1);
    expect(visualizer.getState().visibleLabelCount).toBe(0);

    visualizer.setEnabled(false);
    expect(mesh.visible).toBe(false);
    expect(label.visible).toBe(false);
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
    const material = mesh.material as MeshBasicMaterial;

    expect(mesh.raycast({} as never, [] as never)).toBeUndefined();
    expect(label.raycast({} as never, [] as never)).toBeUndefined();
    const labelMaterial = label.material as SpriteMaterial;

    expect(material.depthTest).toBe(false);
    expect(label.renderOrder).toBeGreaterThan(mesh.renderOrder);
    expect(label.frustumCulled).toBe(false);
    expect(label.scale.x).toBeCloseTo(1.6);
    expect(label.scale.y).toBeCloseTo(0.8);
    expect(label.position.y).toBeGreaterThan(mesh.position.y);
    expect(material.color.getHex()).toBe(labelMaterial.color.getHex());
    expect(labelMaterial.depthTest).toBe(false);
    expect(labelMaterial.depthWrite).toBe(false);
  });

  it('keeps explicit collider color overrides synced between wireframes and labels', () => {
    const visualizer = createColliderVisualizer({
      activeFloorId: 'ground',
      enabled: true,
    });

    visualizer.register([
      {
        floor: 'ground',
        category: 'static',
        name: 'custom-color',
        bounds: collider,
        color: 'hotpink',
      },
    ]);

    const mesh = visualizer.group.children.find(
      (child) => child.type === 'Mesh'
    ) as Mesh;
    const label = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    ) as Sprite;
    const material = mesh.material as MeshBasicMaterial;
    const labelMaterial = label.material as SpriteMaterial;

    expect(material.color.getStyle()).toBe('rgb(255,105,180)');
    expect(labelMaterial.color.getHex()).toBe(material.color.getHex());
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
    expect(idsByName.get('prefix-collider-142')).toBe(
      createColliderDebugId(colliders[0])
    );
    expect(idsByName.get('prefix-collider-182')).toBe(
      createColliderDebugId(colliders[1])
    );
  });

  it('keeps IDs stable when old raw-hash collision pairs are batched or split', () => {
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
    const batchedVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });
    const splitVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });
    const reversedVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });

    batchedVisualizer.register(colliders);
    splitVisualizer.register([colliders[0]]);
    splitVisualizer.register([colliders[1]]);
    reversedVisualizer.register([...colliders].reverse());

    const idsByName = new Map(
      batchedVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const splitIdsByName = new Map(
      splitVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const reversedIdsByName = new Map(
      reversedVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const ids = [...idsByName.values()];

    expect(idsByName).toEqual(splitIdsByName);
    expect(idsByName).toEqual(reversedIdsByName);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[0-9A-F]{4,6}$/.test(id))).toBe(true);
    expect(ids.every((id) => !id.includes('-'))).toBe(true);
    expect(ids).not.toContain('53D147');
  });

  it('does not remap numeric suffixes that differ by 65536', () => {
    const firstCollider = {
      floor: 'ground' as const,
      category: 'walls',
      name: 'x-1',
      bounds: collider,
    };
    const secondCollider = {
      floor: 'ground' as const,
      category: 'walls',
      name: 'x-65537',
      bounds: collider,
    };
    const forwardVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });
    const splitVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });

    expect(createColliderDebugId(firstCollider)).not.toBe(
      createColliderDebugId(secondCollider)
    );
    expect(createColliderDebugId(firstCollider)).not.toBe('800001');
    expect(createColliderDebugId(secondCollider)).not.toBe('800001');

    forwardVisualizer.register([firstCollider, secondCollider]);
    splitVisualizer.register([secondCollider]);
    splitVisualizer.register([firstCollider]);

    const idsByName = new Map(
      forwardVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const splitIdsByName = new Map(
      splitVisualizer.getColliders().map((next) => [next.name, next.id])
    );

    expect(idsByName).toEqual(splitIdsByName);
    expect(
      [...idsByName.values()].every((id) => /^[0-9A-F]{4,6}$/.test(id))
    ).toBe(true);
  });

  it('keeps IDs stable when salted-primary collision pairs are batched or split', () => {
    const colliders = [
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'collision-703',
        bounds: collider,
      },
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'collision-1045',
        bounds: collider,
      },
    ];
    const batchedVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });
    const splitVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });
    const reversedVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });

    batchedVisualizer.register(colliders);
    splitVisualizer.register([colliders[0]]);
    splitVisualizer.register([colliders[1]]);
    reversedVisualizer.register([...colliders].reverse());

    const idsByName = new Map(
      batchedVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const splitIdsByName = new Map(
      splitVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const reversedIdsByName = new Map(
      reversedVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const ids = [...idsByName.values()];

    expect(idsByName).toEqual(splitIdsByName);
    expect(idsByName).toEqual(reversedIdsByName);
    expect(ids).toEqual(colliders.map((next) => createColliderDebugId(next)));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[0-9A-F]{4,6}$/.test(id))).toBe(true);
    expect(ids.every((id) => !id.includes('-'))).toBe(true);
    expect(ids).not.toContain('BC930D');
  });

  it('keeps Greptile same-primary regression IDs stable across batch and split registration', () => {
    const colliders = [
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'collision-1104',
        bounds: collider,
      },
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'collision-2488',
        bounds: collider,
      },
    ];
    const forwardVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });
    const reversedVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });
    const forwardSplitVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });
    const reverseSplitVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });

    expect(createColliderDebugId(colliders[0])).toBe('C1104');
    expect(createColliderDebugId(colliders[1])).toBe('C2488');

    forwardVisualizer.register(colliders);
    reversedVisualizer.register([...colliders].reverse());
    forwardSplitVisualizer.register([colliders[0]]);
    const forwardExposedCollider = forwardSplitVisualizer.getColliders()[0];
    const forwardExposedId = forwardExposedCollider.id;
    forwardSplitVisualizer.register([colliders[1]]);
    reverseSplitVisualizer.register([colliders[1]]);
    const reverseExposedCollider = reverseSplitVisualizer.getColliders()[0];
    const reverseExposedId = reverseExposedCollider.id;
    const reverseExposedMeshName = reverseSplitVisualizer.group.children.find(
      (child) => child.type === 'Mesh'
    )?.name;
    const reverseExposedLabelName = reverseSplitVisualizer.group.children.find(
      (child) => child.type === 'Sprite'
    )?.name;
    reverseSplitVisualizer.register([colliders[0]]);

    const idsByName = new Map(
      forwardVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const reversedIdsByName = new Map(
      reversedVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const forwardSplitIdsByName = new Map(
      forwardSplitVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const reverseSplitIdsByName = new Map(
      reverseSplitVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const ids = [...idsByName.values()];

    expect(idsByName).toEqual(reversedIdsByName);
    expect(idsByName).toEqual(forwardSplitIdsByName);
    expect(idsByName).toEqual(reverseSplitIdsByName);
    expect(idsByName).toEqual(
      new Map([
        ['collision-1104', 'C1104'],
        ['collision-2488', 'C2488'],
      ])
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[0-9A-F]{4,6}$/.test(id))).toBe(true);
    expect(ids.every((id) => !id.includes('-'))).toBe(true);
    expect(ids).not.toContain('FB7D89');
    expect(forwardSplitVisualizer.getColliderById(forwardExposedId)).toEqual(
      forwardExposedCollider
    );
    expect(reverseSplitVisualizer.getColliderById(reverseExposedId)).toEqual(
      reverseExposedCollider
    );
    expect(
      reverseSplitVisualizer.group.children.find(
        (child) => child.type === 'Mesh'
      )?.name
    ).toBe(reverseExposedMeshName);
    expect(
      reverseSplitVisualizer.group.children.find(
        (child) => child.type === 'Sprite'
      )?.name
    ).toBe(reverseExposedLabelName);
  });

  it('keeps exposed fallback IDs valid when split registration differs from batch', () => {
    const colliders = [
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'fallback-818',
        bounds: collider,
      },
      {
        floor: 'ground' as const,
        category: 'walls',
        name: 'fallback-3001',
        bounds: collider,
      },
    ];
    const batchVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });
    const splitVisualizer = createColliderVisualizer({
      activeFloorId: 'ground',
    });

    expect(createColliderDebugId(colliders[0])).toBe(
      createColliderDebugId(colliders[1])
    );

    batchVisualizer.register(colliders);
    splitVisualizer.register([colliders[0]]);
    const exposedCollider = splitVisualizer.getColliders()[0];
    const exposedMeshName = splitVisualizer.group.children.find(
      (child) => child.type === 'Mesh'
    )?.name;
    const exposedLabelName = splitVisualizer.group.children.find(
      (child) => child.type === 'Sprite'
    )?.name;

    splitVisualizer.register([colliders[1]]);

    const batchIdsByName = new Map(
      batchVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const splitIdsByName = new Map(
      splitVisualizer.getColliders().map((next) => [next.name, next.id])
    );
    const splitIds = [...splitIdsByName.values()];

    expect(batchIdsByName).not.toEqual(splitIdsByName);
    expect(new Set(splitIds).size).toBe(splitIds.length);
    expect(splitIds.every((id) => /^[0-9A-F]{4,6}$/.test(id))).toBe(true);
    expect(splitIds.every((id) => !id.includes('-'))).toBe(true);
    expect(splitVisualizer.getColliderById(exposedCollider.id)).toEqual(
      exposedCollider
    );
    expect(
      splitVisualizer.group.children.find((child) => child.type === 'Mesh')
        ?.name
    ).toBe(exposedMeshName);
    expect(
      splitVisualizer.group.children.find((child) => child.type === 'Sprite')
        ?.name
    ).toBe(exposedLabelName);
  });

  it('keeps duplicate registrations unique with short hex IDs', () => {
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });
    const duplicateCollider = {
      floor: 'ground' as const,
      category: 'walls',
      name: 'duplicate-0',
      bounds: collider,
    };

    visualizer.register([duplicateCollider]);
    const exposedId = visualizer.getColliders()[0].id;
    const exposedMeshName = visualizer.group.children.find(
      (child) => child.type === 'Mesh'
    )?.name;
    const exposedLabelName = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    )?.name;

    visualizer.register([duplicateCollider]);

    const colliders = visualizer.getColliders();
    const ids = colliders.map((next) => next.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[0-9A-F]{4,6}$/.test(id))).toBe(true);
    expect(ids.every((id) => !id.includes('-'))).toBe(true);
    expect(colliders[0].id).toBe(exposedId);
    expect(visualizer.getColliderById(exposedId)).toEqual(colliders[0]);
    expect(
      visualizer.group.children.find((child) => child.type === 'Mesh')?.name
    ).toBe(exposedMeshName);
    expect(
      visualizer.group.children.find((child) => child.type === 'Sprite')?.name
    ).toBe(exposedLabelName);
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
    expect(visualizer.getState()).toMatchObject({
      visibleColliderCount: 1,
      totalColliderCount: 2,
      visibleLabelCount: 1,
      totalLabelCount: 2,
    });

    visualizer.setActiveFloor('upper');
    expect(labels.map((label) => label.visible)).toEqual([false, true]);

    visualizer.setEnabled(false);
    expect(labels.every((label) => label.visible === false)).toBe(true);
  });
});
