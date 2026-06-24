import { Group, InstancedMesh, Mesh, Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import {
  getSceneDetailPolicy,
  type SceneDetailLevel,
} from '../scene/graphics/sceneDetailPolicy';
import { createSugarkubeDeployment } from '../scene/structures/sugarkubeDeployment';

function countTriangles(root: Object3D): number {
  let total = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof InstancedMesh)) return;
    const geometry = object.geometry;
    const triangles = geometry.index
      ? geometry.index.count / 3
      : (geometry.getAttribute('position')?.count ?? 0) / 3;
    total += triangles * (object instanceof InstancedMesh ? object.count : 1);
  });
  return total;
}

function finiteObject(root: Object3D): boolean {
  let finite = true;
  root.traverse((object) => {
    const values = [
      object.position.x,
      object.position.y,
      object.position.z,
      object.rotation.x,
      object.rotation.y,
      object.rotation.z,
      object.scale.x,
      object.scale.y,
      object.scale.z,
    ];
    finite &&= values.every(Number.isFinite);
    if (object instanceof Mesh || object instanceof InstancedMesh) {
      const position = object.geometry.getAttribute('position');
      for (let index = 0; index < position.count; index += 1) {
        finite &&= Number.isFinite(position.getX(index));
        finite &&= Number.isFinite(position.getY(index));
        finite &&= Number.isFinite(position.getZ(index));
      }
    }
  });
  return finite;
}

const levels: SceneDetailLevel[] = ['cinematic', 'balanced', 'performance'];

describe('createSugarkubeDeployment', () => {
  it.each(levels)('builds all semantic hardware in %s mode', (level) => {
    const build = createSugarkubeDeployment({
      position: { x: -8.74, y: 0.2, z: -22.92 },
      orientationRadians: Math.PI * 0.55,
      detailPolicy: getSceneDetailPolicy(level),
      wallEndpoint: { x: -8.5, y: 0.62, z: -27.6, orientationRadians: 0 },
    });

    expect(build.group.name).toBe('SugarkubeDeployment');
    expect(build.group.position.toArray()).toEqual([-8.74, 0.2, -22.92]);
    expect(build.group.rotation.y).toBeCloseTo(Math.PI * 0.55);

    const table = build.group.getObjectByName('SugarkubeTable') as Group;
    const networkSwitch = build.group.getObjectByName(
      'SugarkubeNetworkSwitch'
    ) as Group;
    expect(table).toBeInstanceOf(Group);
    expect(networkSwitch).toBeInstanceOf(Group);
    expect(table.position.x).toBeCloseTo(0);
    expect(table.position.z).toBeCloseTo(0);
    expect(networkSwitch.position.x).toBeCloseTo(0);
    expect(networkSwitch.position.z).toBeCloseTo(0);

    expect(
      build.group.children.filter((child) =>
        child.name.startsWith('SugarkubeRackTier-')
      )
    ).toHaveLength(3);
    expect(
      (build.group.getObjectByName('SugarkubeRackPillars') as Group).children
    ).toHaveLength(4);

    for (let tier = 0; tier < 3; tier += 1) {
      for (let slot = 0; slot < 3; slot += 1) {
        expect(
          build.group.getObjectByName(`SugarkubePi-${tier}-${slot}`)
        ).toBeTruthy();
      }
    }
    expect(
      build.group.children.filter((child) =>
        /^SugarkubeEthernetCable-\d$/.test(child.name)
      )
    ).toHaveLength(9);
    expect(build.group.getObjectByName('SugarkubeUplinkCable')).toBeTruthy();
    expect(build.group.getObjectByName('SugarkubeWallPlate')).toBeTruthy();
    expect(build.group.getObjectByName('SugarkubeWallPlateRJ45')).toBeTruthy();
    expect(build.group.getObjectByName('BackyardGreenhouse')).toBeFalsy();

    expect(build.colliders).toHaveLength(1);
    expect((build.colliders[0] as { debugName?: string }).debugName).toBe(
      'SugarkubeDeploymentCollider'
    );
    expect(finiteObject(build.group)).toBe(true);
  });

  it('uses genuine detail variants with ordered triangle budgets', () => {
    const triangles = Object.fromEntries(
      levels.map((level) => {
        const build = createSugarkubeDeployment({
          position: { x: 0, y: 0, z: 0 },
          orientationRadians: 0,
          detailPolicy: getSceneDetailPolicy(level),
          wallEndpoint: { x: 0, y: 0.4, z: -5, orientationRadians: 0 },
        });
        return [level, countTriangles(build.group)];
      })
    ) as Record<SceneDetailLevel, number>;

    expect(triangles.cinematic).toBeGreaterThan(triangles.balanced);
    expect(triangles.balanced).toBeGreaterThan(triangles.performance);
    expect(triangles.balanced / triangles.cinematic).toBeGreaterThanOrEqual(
      0.4
    );
    expect(triangles.balanced / triangles.cinematic).toBeLessThanOrEqual(0.6);
    expect(triangles.performance / triangles.balanced).toBeGreaterThanOrEqual(
      0.4
    );
    expect(triangles.performance / triangles.balanced).toBeLessThanOrEqual(0.6);
  });
});
