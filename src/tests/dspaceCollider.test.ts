import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';

import {
  createModelRocket,
  isDspaceRocketPhysicalColliderMesh,
} from '../scene/structures/modelRocket';
import { createTightPoiCollider } from '../scene/structures/poiColliderBounds';

describe('DSPACE physical collider filtering', () => {
  it('creates no 105E physical/debug collider and keeps the rocket blocker', () => {
    expect(isDspaceRocketPhysicalColliderMesh('ModelRocketBody')).toBe(true);
    expect(isDspaceRocketPhysicalColliderMesh('ModelRocketNose')).toBe(true);
    expect(isDspaceRocketPhysicalColliderMesh('ModelRocketThruster')).toBe(
      true
    );
    expect(isDspaceRocketPhysicalColliderMesh('ModelRocketFin-0')).toBe(true);
    expect(isDspaceRocketPhysicalColliderMesh('105E')).toBe(false);

    const { collider } = createModelRocket({
      basePosition: new Vector3(0, 0, 0),
    });

    expect(collider.debugName).toBe('DspaceRocketCollider');
    expect(collider.debugName).not.toContain('105E');
    expect(collider.maxX).toBeGreaterThan(collider.minX);
    expect(collider.maxZ).toBeGreaterThan(collider.minZ);
  });

  it('derives DSPACE physical bounds only from rocket meshes, not 105E metadata', () => {
    const root = new Group();
    const rocketBody = new Mesh(
      new BoxGeometry(1, 3, 1),
      new MeshStandardMaterial()
    );
    rocketBody.name = 'ModelRocketBody';
    root.add(rocketBody);

    const rocketFin = new Mesh(
      new BoxGeometry(1.8, 0.8, 0.2),
      new MeshStandardMaterial()
    );
    rocketFin.name = 'ModelRocketFin-0';
    rocketFin.position.set(0, -1, 0);
    root.add(rocketFin);

    const object105E = new Mesh(
      new BoxGeometry(8, 1, 8),
      new MeshStandardMaterial()
    );
    object105E.name = '105E';
    object105E.position.set(9, 0, 0);
    root.add(object105E);

    const marker = new Mesh(
      new BoxGeometry(6, 1, 6),
      new MeshBasicMaterial({ transparent: true, opacity: 0.2 })
    );
    marker.name = 'DspaceMarkerHalo';
    marker.position.set(-7, 0, 0);
    root.add(marker);

    const debugHelper = new Mesh(
      new BoxGeometry(6, 1, 6),
      new MeshStandardMaterial()
    );
    debugHelper.name = 'DspaceDebugHelper';
    debugHelper.userData.colliderDebug = true;
    debugHelper.position.set(0, 0, 7);
    root.add(debugHelper);

    const collider = createTightPoiCollider(root, {
      debugName: 'DspaceRocketCollider',
      include: (object) => isDspaceRocketPhysicalColliderMesh(object.name),
      includeOnly: true,
      padding: 0,
    });

    expect(collider).not.toBeNull();
    expect(collider?.debugName).toBe('DspaceRocketCollider');
    expect(collider?.debugName).not.toContain('105E');
    expect(collider?.minX).toBeCloseTo(-0.9);
    expect(collider?.maxX).toBeCloseTo(0.9);
    expect(collider?.minZ).toBeCloseTo(-0.5);
    expect(collider?.maxZ).toBeCloseTo(0.5);
  });
});
