import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createTightColliderFromObject } from '../scene/poi/geometryCollider';

const material = new MeshBasicMaterial();

function addBox(
  group: Group,
  name: string,
  size: [number, number, number],
  position: [number, number, number]
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

describe('createTightColliderFromObject', () => {
  it('derives a padded world-space XZ collider from nested visible mesh geometry', () => {
    const root = new Group();
    root.position.set(10, 0, 20);
    root.rotation.y = Math.PI / 2;

    const nested = new Group();
    nested.position.set(1, 0, 0);
    root.add(nested);
    addBox(nested, 'PhysicalCabinet', [2, 1, 4], [0, 0.5, 0]);

    const collider = createTightColliderFromObject(root, { padding: 0 });

    expect(collider).toEqual({ minX: 8, maxX: 12, minZ: 18, maxZ: 20 });
  });

  it('excludes labels, hit areas, cables, helpers, and opt-out meshes', () => {
    const root = new Group();
    addBox(root, 'PhysicalBase', [1, 1, 1], [0, 0.5, 0]);
    addBox(root, 'FloatingLabel', [10, 1, 10], [20, 0.5, 20]);
    addBox(root, 'POI_HIT:demo', [10, 1, 10], [-20, 0.5, -20]);
    addBox(root, 'DecorativeCable', [30, 1, 1], [0, 0.5, 20]);
    addBox(root, 'DebugHelper', [30, 1, 1], [0, 0.5, -20]);
    const optOut = addBox(root, 'VisualOnlyBackdrop', [30, 1, 1], [20, 0.5, 0]);
    optOut.userData.physicalCollider = false;

    const collider = createTightColliderFromObject(root, { padding: 0 });

    expect(collider).toEqual({ minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 });
  });
});
