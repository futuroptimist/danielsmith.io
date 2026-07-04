import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createRequiredTightPoiCollider } from './poiColliderBounds';

describe('createRequiredTightPoiCollider', () => {
  it('derives world-space X/Z bounds from nested visible mesh geometry', () => {
    const root = new Group();
    root.position.set(10, 0, 20);
    root.rotation.y = Math.PI / 2;

    const child = new Mesh(
      new BoxGeometry(2, 1, 4),
      new MeshBasicMaterial({ color: 0xffffff })
    );
    child.position.set(1, 0, 0);
    root.add(child);

    const collider = createRequiredTightPoiCollider(root, { padding: 0 });

    expect(collider).toEqual({
      minX: 8,
      maxX: 12,
      minZ: 18,
      maxZ: 20,
    });
  });

  it('excludes non-physical meshes via caller policy', () => {
    const root = new Group();
    const physical = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ color: 0xffffff })
    );
    physical.name = 'PhysicalBox';
    root.add(physical);

    const oversizedFixture = new Mesh(
      new BoxGeometry(10, 1, 10),
      new MeshBasicMaterial({ color: 0xffffff })
    );
    oversizedFixture.name = 'OversizedFixture';
    root.add(oversizedFixture);

    const collider = createRequiredTightPoiCollider(root, {
      padding: 0,
      exclude: (object) => object.name === 'OversizedFixture',
    });

    expect(collider).toEqual({
      minX: -0.5,
      maxX: 0.5,
      minZ: -0.5,
      maxZ: 0.5,
    });
  });
});
