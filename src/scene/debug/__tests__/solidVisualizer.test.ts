import {
  BoxGeometry,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  SpriteMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';

import { createColliderDebugId } from '../colliderVisualizer';
import { createSolidDebugId, createSolidVisualizer } from '../solidVisualizer';

const createScene = () => {
  const scene = new Group();
  scene.name = 'Scene';
  const mesh = new Mesh(
    new BoxGeometry(1, 2, 3),
    new MeshBasicMaterial({ color: 'red' })
  );
  mesh.name = 'Wall';
  mesh.position.set(1, 2, 3);
  scene.add(mesh);
  const debug = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  debug.userData.debugOnly = true;
  scene.add(debug);
  return { scene, mesh };
};

describe('createSolidDebugId', () => {
  const metadata = {
    name: 'Wall',
    path: 'Scene/Wall',
    parentPath: 'Scene',
    meshType: 'Mesh',
    bounds: { min: { x: 0, y: 1, z: 1.5 }, max: { x: 2, y: 3, z: 4.5 } },
    material: 'MeshBasicMaterial:#ff0000',
  };

  it('is deterministic, uppercase hex, and changes with meaningful metadata', () => {
    expect(createSolidDebugId(metadata)).toBe(createSolidDebugId(metadata));
    expect(createSolidDebugId(metadata)).toMatch(/^[0-9A-F]{4,6}$/);
    expect(createSolidDebugId(metadata)).not.toBe(
      createSolidDebugId({
        ...metadata,
        bounds: { ...metadata.bounds, max: { ...metadata.bounds.max, z: 5 } },
      })
    );
  });

  it('avoids collider IDs', () => {
    const colliderId = createColliderDebugId({
      floor: 'ground',
      category: 'static',
      name: 'x',
      bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 },
    });
    expect(createSolidDebugId(metadata, new Set([colliderId]))).not.toBe(
      colliderId
    );
  });
});

describe('createSolidVisualizer', () => {
  it('registers mesh solids, excludes debug-only objects, and exposes metadata copies', () => {
    const { scene } = createScene();
    const visualizer = createSolidVisualizer({
      scene,
      enabled: true,
      reservedIds: new Set(['ABCD']),
    });
    const solids = visualizer.getSolids();

    expect(solids).toHaveLength(1);
    expect(solids[0].name).toBe('Wall');
    expect(visualizer.getSolidById(solids[0].id)).toEqual(solids[0]);
    solids[0].bounds.min.x = 99;
    expect(visualizer.getSolids()[0].bounds.min.x).not.toBe(99);
    expect(visualizer.getState()).toEqual({
      enabled: true,
      visibleSolidCount: 1,
      totalSolidCount: 1,
      visibleLabelCount: 1,
      totalLabelCount: 1,
    });
  });

  it('creates matching-color, non-raycasting debug-only overlays', () => {
    const { scene } = createScene();
    const visualizer = createSolidVisualizer({ scene, enabled: true });
    const wireframe = visualizer.group.children.find(
      (child) => child.type === 'LineSegments'
    );
    const label = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    );

    expect(wireframe?.userData.debugOnly).toBe(true);
    expect(label?.userData.debugOnly).toBe(true);
    expect(wireframe?.raycast({} as never, [] as never)).toBeUndefined();
    expect(label?.raycast({} as never, [] as never)).toBeUndefined();
    expect((wireframe?.material as LineBasicMaterial).color.getHex()).toBe(
      (label?.material as SpriteMaterial).color.getHex()
    );
  });
});
