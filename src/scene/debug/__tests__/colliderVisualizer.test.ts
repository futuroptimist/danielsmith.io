import type { Material, Mesh, Sprite } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createColliderDebugId,
  createColliderVisualizer,
  type DebugColliderIdInput,
} from '../colliderVisualizer';

const collider = {
  minX: 1,
  maxX: 3,
  minZ: 2,
  maxZ: 5,
};

const debugColliderInput: DebugColliderIdInput = {
  floor: 'ground',
  category: 'walls',
  name: 'GroundWallNorth',
  bounds: collider,
};

const expectShortUppercaseHexId = (id: string) => {
  expect(id).toMatch(/^[0-9A-F]{4,6}$/);
};

describe('createColliderDebugId', () => {
  it('is deterministic for the same collider metadata', () => {
    expect(createColliderDebugId(debugColliderInput)).toBe(
      createColliderDebugId({ ...debugColliderInput, bounds: { ...collider } })
    );
  });

  it('changes when meaningful collider metadata changes', () => {
    expect(createColliderDebugId(debugColliderInput)).not.toBe(
      createColliderDebugId({
        ...debugColliderInput,
        bounds: { ...collider, maxZ: collider.maxZ + 1 },
      })
    );
  });

  it('produces short uppercase hexadecimal IDs', () => {
    expectShortUppercaseHexId(createColliderDebugId(debugColliderInput));
  });

  it('resolves reserved ID collisions deterministically', () => {
    const firstId = createColliderDebugId(debugColliderInput);
    const reservedIds = new Set([firstId]);
    const secondId = createColliderDebugId(debugColliderInput, reservedIds);

    expectShortUppercaseHexId(secondId);
    expect(secondId).not.toBe(firstId);
    expect(secondId).toBe(
      createColliderDebugId(debugColliderInput, reservedIds)
    );
  });
});

describe('createColliderVisualizer', () => {
  it('tracks total and active-floor visible collider and label counts', () => {
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
      visibleLabelCount: 0,
      totalColliderCount: 3,
    });

    visualizer.setEnabled(true);
    expect(visualizer.getState()).toEqual({
      enabled: true,
      visibleColliderCount: 2,
      visibleLabelCount: 2,
      totalColliderCount: 3,
    });

    visualizer.setActiveFloor('upper');
    expect(visualizer.getState().visibleColliderCount).toBe(2);
    expect(visualizer.getState().visibleLabelCount).toBe(2);
  });

  it('returns redacted metadata copies and non-raycasting debug objects', () => {
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
    metadata[0].bounds.minX = 99;

    expect(visualizer.getColliders()[0]).toEqual({
      id: metadata[0].id,
      floor: 'ground',
      category: 'static',
      name: 'static-0',
      bounds: collider,
    });
    expectShortUppercaseHexId(metadata[0].id);
    expect(visualizer.getColliderById(metadata[0].id)).toEqual(
      visualizer.getColliders()[0]
    );
    expect(visualizer.getColliderById(metadata[0].id.toLowerCase())).toEqual(
      visualizer.getColliders()[0]
    );

    const mesh = visualizer.group.children[0] as Mesh;
    const label = visualizer.group.children[1] as Sprite;
    const material = mesh.material as Material;

    expect(mesh.raycast({} as never, [] as never)).toBeUndefined();
    expect(label.raycast({} as never, [] as never)).toBeUndefined();
    expect(label.name).toBe(`DebugColliderLabel:${metadata[0].id}`);
    expect(material.depthTest).toBe(false);
  });

  it('creates unique IDs for duplicate collider registrations', () => {
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });

    visualizer.register([debugColliderInput, debugColliderInput]);

    const ids = visualizer.getColliders().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toggles collider labels with debug collider visibility', () => {
    const visualizer = createColliderVisualizer({ activeFloorId: 'ground' });
    visualizer.register([debugColliderInput]);

    const mesh = visualizer.group.children[0] as Mesh;
    const label = visualizer.group.children[1] as Sprite;

    expect(mesh.visible).toBe(false);
    expect(label.visible).toBe(false);

    visualizer.setEnabled(true);
    expect(mesh.visible).toBe(true);
    expect(label.visible).toBe(true);

    visualizer.setEnabled(false);
    expect(mesh.visible).toBe(false);
    expect(label.visible).toBe(false);
  });
});
