import { Mesh, Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import {
  getSceneDetailPolicy,
  type SceneDetailLevel,
} from '../scene/graphics/sceneDetailPolicy';
import { countRenderableTriangles } from '../scene/graphics/triangleCount';
import { createSugarkubeDeployment } from '../scene/structures/sugarkubeDeployment';

const levels: SceneDetailLevel[] = ['cinematic', 'balanced', 'performance'];

function getChildrenByPrefix(root: Object3D, prefix: string): Object3D[] {
  const matches: Object3D[] = [];
  root.traverse((object) => {
    if (object.name.startsWith(prefix)) {
      matches.push(object);
    }
  });
  return matches;
}

function expectFiniteObject(root: Object3D) {
  root.traverse((object) => {
    expect(Number.isFinite(object.position.x)).toBe(true);
    expect(Number.isFinite(object.position.y)).toBe(true);
    expect(Number.isFinite(object.position.z)).toBe(true);
    expect(Number.isFinite(object.rotation.x)).toBe(true);
    expect(Number.isFinite(object.rotation.y)).toBe(true);
    expect(Number.isFinite(object.rotation.z)).toBe(true);
    if (object instanceof Mesh) {
      const position = object.geometry.getAttribute('position');
      expect(position).toBeDefined();
      for (let index = 0; index < position.count; index += 1) {
        expect(Number.isFinite(position.getX(index))).toBe(true);
        expect(Number.isFinite(position.getY(index))).toBe(true);
        expect(Number.isFinite(position.getZ(index))).toBe(true);
      }
    }
  });
}

describe('createSugarkubeDeployment', () => {
  it.each(levels)('builds all semantic hardware in %s mode', (level) => {
    const build = createSugarkubeDeployment({
      position: { x: -8.74, y: 0.25, z: -22.92 },
      orientationRadians: Math.PI * 0.55,
      detailPolicy: getSceneDetailPolicy(level),
      wallEndpoint: { x: -8.74, y: 0.25, z: -28, orientationRadians: 0 },
    });

    expect(build.group.name).toBe('SugarkubeDeployment');
    expect(build.group.position.x).toBeCloseTo(-8.74);
    expect(build.group.position.y).toBeCloseTo(0.25);
    expect(build.group.position.z).toBeCloseTo(-22.92);
    expect(build.group.rotation.y).toBeCloseTo(Math.PI * 0.55);
    expect(build.group.userData.sceneDetailLevel).toBe(level);

    expect(
      build.group.getObjectByName('SugarkubeTable')?.position.x
    ).toBeCloseTo(0);
    expect(
      build.group.getObjectByName('SugarkubeTable')?.position.z
    ).toBeCloseTo(0);
    expect(
      build.group.getObjectByName('SugarkubeNetworkSwitch')?.position.x
    ).toBeCloseTo(0);

    expect(
      [0, 1, 2].map((tier) =>
        build.group.getObjectByName(`SugarkubeRackTier-${tier}`)
      )
    ).toSatisfy((tiers: Array<Object3D | undefined>) => tiers.every(Boolean));
    expect(
      getChildrenByPrefix(build.group, 'SugarkubeRackCornerPillar-')
    ).toHaveLength(4);
    expect(
      getChildrenByPrefix(build.group, 'SugarkubePi-').filter(
        (object) => object.type === 'Group'
      )
    ).toHaveLength(9);
    [0, 1, 2].forEach((tier) => {
      expect(
        getChildrenByPrefix(build.group, `SugarkubePi-${tier}-`).filter(
          (object) => object.type === 'Group'
        )
      ).toHaveLength(3);
    });
    expect(
      getChildrenByPrefix(build.group, 'SugarkubeEthernetCable-')
    ).toHaveLength(9);
    expect(build.group.getObjectByName('SugarkubeUplinkCable')).toBeInstanceOf(
      Mesh
    );
    expect(build.group.getObjectByName('SugarkubeWallPlate')).toBeInstanceOf(
      Mesh
    );
    expect(
      build.group.getObjectByName('SugarkubeWallPlateRJ45')
    ).toBeInstanceOf(Mesh);

    expect(build.colliders).toHaveLength(1);
    expect(build.colliders[0].debugName).toBe('SugarkubeDeploymentCollider');
    expect(build.colliders[0].minX).toBeLessThan(build.colliders[0].maxX);
    expect(build.colliders[0].minZ).toBeLessThan(build.colliders[0].maxZ);

    expectFiniteObject(build.group);
  });

  it('uses genuine detail variants with useful triangle ratios', () => {
    const totals = levels.map((level) =>
      countRenderableTriangles(
        createSugarkubeDeployment({
          position: { x: 0, z: 0 },
          orientationRadians: 0,
          detailPolicy: getSceneDetailPolicy(level),
          wallEndpoint: { x: 0, z: -5, orientationRadians: 0 },
        }).group
      )
    );
    const [cinematic, balanced, performance] = totals;
    expect(cinematic).toBeGreaterThan(balanced);
    expect(balanced).toBeGreaterThan(performance);
    expect(balanced / cinematic).toBeGreaterThanOrEqual(0.4);
    expect(balanced / cinematic).toBeLessThanOrEqual(0.6);
    expect(performance / balanced).toBeGreaterThanOrEqual(0.4);
    expect(performance / balanced).toBeLessThanOrEqual(0.6);
  });
});
