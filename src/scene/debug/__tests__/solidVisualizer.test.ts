import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { LineBasicMaterial, SpriteMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createColliderDebugId } from '../colliderVisualizer';
import { createSolidDebugId, createSolidVisualizer } from '../solidVisualizer';

const solidMetadata = {
  name: 'WallPanel',
  path: 'Scene/Room/WallPanel',
  parentPath: 'Scene/Room',
  meshType: 'Mesh',
  bounds: {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 1, y: 2, z: 3 },
  },
  material: 'MeshBasicMaterial #ffffff',
};

const colliderMetadata = {
  floor: 'ground' as const,
  category: 'walls',
  name: 'GroundWallWest',
  bounds: { minX: 1, maxX: 3, minZ: 2, maxZ: 5 },
};

describe('createSolidDebugId', () => {
  it('is deterministic, uppercase hex, and changes with meaningful metadata', () => {
    const id = createSolidDebugId(solidMetadata);

    expect(id).toBe(createSolidDebugId(solidMetadata));
    expect(id).toMatch(/^[0-9A-F]{6}$/);
    expect(id).not.toBe(
      createSolidDebugId({
        ...solidMetadata,
        bounds: { ...solidMetadata.bounds, max: { x: 2, y: 2, z: 3 } },
      })
    );
  });

  it('avoids collider ID collisions deterministically', () => {
    const colliderId = createColliderDebugId(colliderMetadata);
    const solidId = createSolidDebugId(solidMetadata, new Set([colliderId]));

    expect(solidId).not.toBe(colliderId);
    expect(solidId).toMatch(/^[0-9A-F]{4,6}$/);
    expect(createSolidDebugId(solidMetadata, new Set([colliderId]))).toBe(
      solidId
    );
  });
});

describe('createSolidVisualizer', () => {
  it('registers mesh solids, excludes debug-only objects, and returns metadata copies', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const solid = new Mesh(
      new BoxGeometry(1, 2, 3),
      new MeshBasicMaterial({ color: 'white' })
    );
    solid.name = 'SolidWall';
    scene.add(solid);
    const debugOnly = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    debugOnly.userData.debugOnly = true;
    scene.add(debugOnly);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene, new Set(['ABCD']));

    const solids = visualizer.getSolids();
    expect(solids).toHaveLength(1);
    expect(solids[0].name).toBe('SolidWall');
    expect(solids[0].id).toMatch(/^[0-9A-F]{4,6}$/);
    expect(visualizer.getSolidById(solids[0].id)).toEqual(solids[0]);
    expect(visualizer.getSolidById(solids[0].id.toLowerCase())?.id).toBe(
      solids[0].id
    );
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

  it('keeps IDs unique from supplied collider IDs', () => {
    const scene = new Group();
    const first = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    const second = new Mesh(new BoxGeometry(2, 1, 1), new MeshBasicMaterial());
    first.name = 'FirstSolid';
    second.name = 'SecondSolid';
    second.position.x = 3;
    scene.add(first, second);
    const colliderId = createColliderDebugId(colliderMetadata);

    const visualizer = createSolidVisualizer();
    visualizer.register(scene, new Set([colliderId]));
    const ids = visualizer.getSolids().map((solid) => solid.id);

    expect(ids).not.toContain(colliderId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('creates non-raycasting debug-only overlays with matching wireframe and label colors', () => {
    const scene = new Group();
    const solid = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ color: 'red' })
    );
    solid.name = 'DebuggableSolid';
    scene.add(solid);
    const visualizer = createSolidVisualizer({ enabled: true });

    visualizer.register(scene);
    const wireframe = visualizer.group.children.find(
      (child) => child.type === 'LineSegments'
    ) as
      | {
          material: LineBasicMaterial;
          raycast: (raycaster: never, intersects: never) => void;
          userData: Record<string, unknown>;
        }
      | undefined;
    const label = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    ) as
      | {
          material: SpriteMaterial;
          raycast: (raycaster: never, intersects: never) => void;
          userData: Record<string, unknown>;
        }
      | undefined;
    const wireframeMaterial = wireframe?.material as LineBasicMaterial;
    const labelMaterial = label?.material as SpriteMaterial;

    expect(wireframe?.userData.debugOnly).toBe(true);
    expect(label?.userData.debugOnly).toBe(true);
    expect(wireframe?.raycast({} as never, [] as never)).toBeUndefined();
    expect(label?.raycast({} as never, [] as never)).toBeUndefined();
    expect(wireframeMaterial.color.getHex()).toBe(labelMaterial.color.getHex());
    expect(wireframeMaterial.depthTest).toBe(false);
    expect(labelMaterial.depthWrite).toBe(false);
  });
});
