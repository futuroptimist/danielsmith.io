import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';

import {
  isDspaceRocketColliderExcluded,
  isDspaceRocketPhysicalColliderMesh,
} from '../scene/structures/modelRocket';
import { createTightPoiCollider } from '../scene/structures/poiColliderBounds';

describe('DSPACE physical collider filtering', () => {
  it('excludes 105E and non-physical adornments from rocket-only bounds', () => {
    expect(isDspaceRocketPhysicalColliderMesh('ModelRocketBody')).toBe(true);
    expect(isDspaceRocketColliderExcluded('105E')).toBe(true);
    expect(isDspaceRocketPhysicalColliderMesh('105E')).toBe(false);
    expect(isDspaceRocketColliderExcluded('ModelRocketCountdownPanel')).toBe(
      true
    );

    const root = new Group();
    const rocketBody = new Mesh(
      new BoxGeometry(1, 3, 1),
      new MeshStandardMaterial()
    );
    rocketBody.name = 'ModelRocketBody';
    root.add(rocketBody);

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
      include: (object) => isDspaceRocketPhysicalColliderMesh(object.name),
      exclude: (object) => isDspaceRocketColliderExcluded(object.name),
      padding: 0,
    });

    expect(collider).not.toBeNull();
    expect(collider?.minX).toBeCloseTo(-0.5);
    expect(collider?.maxX).toBeCloseTo(0.5);
    expect(collider?.minZ).toBeCloseTo(-0.5);
    expect(collider?.maxZ).toBeCloseTo(0.5);
  });
});
