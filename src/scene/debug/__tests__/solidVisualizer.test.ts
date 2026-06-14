import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createColliderDebugId } from '../colliderVisualizer';
import { createSolidDebugId, createSolidVisualizer } from '../solidVisualizer';

const createSolid = (name = 'solid') => {
  const mesh = new Mesh(
    new BoxGeometry(1, 2, 3),
    new MeshBasicMaterial({ color: 'red' })
  );
  mesh.name = name;
  return mesh;
};

describe('createSolidDebugId', () => {
  const metadata = {
    name: 'Wall',
    path: 'Scene/Wall',
    parentPath: 'Scene',
    meshType: 'Mesh',
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 2, z: 3 } },
    material: 'MeshBasicMaterial:#ff0000',
  };

  it('is deterministic, uppercase hex, and changes for meaningful metadata', () => {
    expect(createSolidDebugId(metadata)).toBe(createSolidDebugId(metadata));
    expect(createSolidDebugId(metadata)).toMatch(/^[0-9A-F]{6}$/);
    expect(createSolidDebugId(metadata)).not.toBe(
      createSolidDebugId({ ...metadata, path: 'Scene/WallMoved' })
    );
  });

  it('avoids reserved collider IDs', () => {
    const colliderId = createColliderDebugId({
      floor: 'ground',
      category: 'walls',
      name: 'reserved',
      bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 },
    });
    expect(createSolidDebugId(metadata, new Set([colliderId]))).not.toBe(
      colliderId
    );
  });
});

describe('createSolidVisualizer', () => {
  it('registers mesh solids, excludes debug-only meshes, and returns metadata copies', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const solid = createSolid('VisibleWall');
    const debugOnly = createSolid('DebugColliderMesh');
    debugOnly.userData.debugOnly = true;
    scene.add(solid, debugOnly);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    const solids = visualizer.getSolids();
    expect(solids).toHaveLength(1);
    expect(solids[0]).toMatchObject({ name: 'VisibleWall', meshType: 'Mesh' });
    expect(visualizer.getSolidById(solids[0].id)).toEqual(solids[0]);
    solids[0].bounds.min.x = 99;
    expect(visualizer.getSolids()[0].bounds.min.x).not.toBe(99);
  });

  it('creates matching non-raycasting debug wireframes and labels without ID collisions', () => {
    const scene = new Group();
    scene.name = 'Scene';
    scene.add(createSolid('WallA'), createSolid('WallB'));
    const reservedId = 'ABCD';

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene, new Set([reservedId]));

    const solids = visualizer.getSolids();
    expect(new Set(solids.map((solid) => solid.id)).size).toBe(solids.length);
    expect(solids.some((solid) => solid.id === reservedId)).toBe(false);

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
    expect(
      (
        wireframe as { material: { color: { getHex(): number } } }
      ).material.color.getHex()
    ).toBe(
      (
        label as { material: { color: { getHex(): number } } }
      ).material.color.getHex()
    );
  });
});
