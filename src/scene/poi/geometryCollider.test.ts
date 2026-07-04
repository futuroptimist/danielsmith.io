import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';

import { createTightColliderFromObject } from './geometryCollider';

const round = (value: number) => Number(value.toFixed(3));

describe('createTightColliderFromObject', () => {
  it('derives bounds from nested visible mesh geometry in world space', () => {
    const root = new Group();
    root.position.set(2, 0, -3);
    root.rotation.y = Math.PI / 2;

    const mesh = new Mesh(
      new BoxGeometry(2, 1, 0.5),
      new MeshStandardMaterial({ color: 0xffffff })
    );
    mesh.position.set(1, 0, 0);
    root.add(mesh);

    const collider = createTightColliderFromObject(root, { padding: 0 });

    expect({
      minX: round(collider?.minX ?? NaN),
      maxX: round(collider?.maxX ?? NaN),
      minZ: round(collider?.minZ ?? NaN),
      maxZ: round(collider?.maxZ ?? NaN),
    }).toEqual({
      minX: 1.75,
      maxX: 2.25,
      minZ: -5,
      maxZ: -3,
    });
  });

  it('excludes labels, hit areas, transparent helpers, and opt-out meshes', () => {
    const root = new Group();
    const physical = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ color: 0xffffff })
    );
    root.add(physical);

    const label = new Mesh(
      new BoxGeometry(20, 1, 20),
      new MeshBasicMaterial({ color: 0xffffff })
    );
    label.name = 'POI_Label';
    root.add(label);

    const hiddenHitArea = new Mesh(
      new BoxGeometry(30, 1, 30),
      new MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    hiddenHitArea.name = 'POI_HIT:test';
    root.add(hiddenHitArea);

    const helper = new Mesh(
      new BoxGeometry(40, 1, 40),
      new MeshStandardMaterial({ color: 0xffffff })
    );
    helper.userData.physicalCollider = false;
    root.add(helper);

    const collider = createTightColliderFromObject(root, { padding: 0.025 });

    expect(collider).toEqual({
      minX: -0.525,
      maxX: 0.525,
      minZ: -0.525,
      maxZ: 0.525,
    });
  });

  it('adds only the requested small deterministic padding', () => {
    const root = new Group();
    const mesh = new Mesh(
      new BoxGeometry(1, 1, 2),
      new MeshStandardMaterial({ color: 0xffffff })
    );
    mesh.position.set(0.25, 0, -0.5);
    root.add(mesh);

    const collider = createTightColliderFromObject(root, { padding: 0.1 });

    expect({
      minX: round(collider?.minX ?? NaN),
      maxX: round(collider?.maxX ?? NaN),
      minZ: round(collider?.minZ ?? NaN),
      maxZ: round(collider?.maxZ ?? NaN),
    }).toEqual({ minX: -0.35, maxX: 0.85, minZ: -1.6, maxZ: 0.6 });
  });
});
