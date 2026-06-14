import {
  BoxGeometry,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';

import { createColliderDebugId } from '../colliderVisualizer';
import { createSolidDebugId, createSolidVisualizer } from '../solidVisualizer';

const createRoot = () => {
  const root = new Group();
  root.name = 'Root';
  const room = new Group();
  room.name = 'Room';
  const mesh = new Mesh(
    new BoxGeometry(2, 1, 3),
    new MeshBasicMaterial({ color: '#336699' })
  );
  mesh.name = 'Sofa';
  mesh.position.set(1, 0.5, 2);
  room.add(mesh);
  root.add(room);
  return { root, mesh };
};

describe('createSolidDebugId', () => {
  const metadata = {
    name: 'Sofa',
    path: 'Root/Room/Sofa',
    parentPath: 'Root/Room',
    meshType: 'Mesh',
    bounds: {
      min: { x: 0, y: 0, z: 0.5 },
      max: { x: 2, y: 1, z: 3.5 },
    },
    materialSummary: 'MeshBasicMaterial:#336699',
  };

  it('is deterministic, uppercase hex, and changes with meaningful metadata', () => {
    expect(createSolidDebugId(metadata)).toBe(createSolidDebugId(metadata));
    expect(createSolidDebugId(metadata)).toMatch(/^[0-9A-F]{6}$/);
    expect(createSolidDebugId(metadata)).not.toBe(
      createSolidDebugId({ ...metadata, path: 'Root/Room/Changed' })
    );
  });

  it('avoids collider IDs supplied by the same debug session', () => {
    const colliderId = createColliderDebugId({
      floor: 'ground',
      category: 'walls',
      name: 'GroundWallWest',
      bounds: { minX: 1, maxX: 3, minZ: 2, maxZ: 5 },
    });

    expect(createSolidDebugId(metadata, new Set([colliderId]))).not.toBe(
      colliderId
    );
  });
});

describe('createSolidVisualizer', () => {
  it('registers visible mesh solids and excludes debug-only meshes', () => {
    const { root } = createRoot();
    const debugOnly = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial()
    );
    debugOnly.name = 'DebugOnly';
    debugOnly.userData.debugOnly = true;
    root.add(debugOnly);
    const debugOnlyGroup = new Group();
    debugOnlyGroup.userData.debugOnly = true;
    debugOnlyGroup.add(
      new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    );
    root.add(debugOnlyGroup);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(root);

    expect(visualizer.getState()).toEqual({
      enabled: true,
      visibleSolidCount: 1,
      totalSolidCount: 1,
      visibleLabelCount: 1,
      totalLabelCount: 1,
    });
    expect(visualizer.getSolids()[0]).toMatchObject({
      name: 'Sofa',
      path: 'Root/Room/Sofa',
      parentPath: 'Root/Room',
      meshType: 'Mesh',
    });
  });

  it('returns metadata copies and finds solids by ID', () => {
    const { root } = createRoot();
    const visualizer = createSolidVisualizer();
    visualizer.register(root);
    const solid = visualizer.getSolids()[0];
    solid.bounds.min.x = 99;

    expect(visualizer.getSolids()[0].bounds.min.x).not.toBe(99);
    expect(visualizer.getSolidById(solid.id)?.id).toBe(solid.id);
    expect(visualizer.getSolidById(solid.id.toLowerCase())?.id).toBe(solid.id);
    expect(visualizer.getSolidById(null)).toBeUndefined();
  });

  it('keeps IDs unique and separate from reserved collider IDs', () => {
    const { root } = createRoot();
    const colliderId = createColliderDebugId({
      floor: 'ground',
      category: 'walls',
      name: 'GroundWallWest',
      bounds: { minX: 1, maxX: 3, minZ: 2, maxZ: 5 },
    });
    const visualizer = createSolidVisualizer({ reservedIds: [colliderId] });
    visualizer.register(root);

    const ids = visualizer.getSolids().map((solid) => solid.id);
    expect(ids).not.toContain(colliderId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('creates non-raycasting debug-only wireframes and matching labels', () => {
    const { root } = createRoot();
    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(root);

    const wireframe = visualizer.group.children.find(
      (child) => child.type === 'LineSegments'
    ) as Mesh;
    const label = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    ) as Sprite;
    const wireframeMaterial = wireframe.material as LineBasicMaterial;
    const labelMaterial = label.material as SpriteMaterial;

    expect(wireframe.userData.debugOnly).toBe(true);
    expect(label.userData.debugOnly).toBe(true);
    expect(wireframe.raycast({} as never, [] as never)).toBeUndefined();
    expect(label.raycast({} as never, [] as never)).toBeUndefined();
    expect(wireframeMaterial.color.getHex()).toBe(labelMaterial.color.getHex());
    expect(wireframeMaterial.depthTest).toBe(false);
    expect(labelMaterial.depthTest).toBe(false);
  });
});
