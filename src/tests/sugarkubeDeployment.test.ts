import { Box3, Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import {
  getSceneDetailPolicy,
  type SceneDetailLevel,
} from '../scene/graphics/sceneDetailPolicy';
import { createSugarkubeDeployment } from '../scene/structures/sugarkubeDeployment';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const levels: SceneDetailLevel[] = ['cinematic', 'balanced', 'performance'];

const build = (level: SceneDetailLevel) =>
  createSugarkubeDeployment({
    position: { x: -8.74, y: 0.2, z: -22.92 },
    orientationRadians: Math.PI * 0.55,
    detailPolicy: getSceneDetailPolicy(level),
    wallNetworkEndpoint: { x: -8.4, y: 0.48, z: -31.1, orientationRadians: 0 },
  });

const byName = (root: Object3D, name: string) => root.getObjectByName(name);

const finiteObject = (object: Object3D) => {
  expect(Number.isFinite(object.position.x)).toBe(true);
  expect(Number.isFinite(object.position.y)).toBe(true);
  expect(Number.isFinite(object.position.z)).toBe(true);
  expect(Number.isFinite(object.rotation.x)).toBe(true);
  expect(Number.isFinite(object.rotation.y)).toBe(true);
  expect(Number.isFinite(object.rotation.z)).toBe(true);
};

describe('createSugarkubeDeployment', () => {
  it.each(levels)(
    'builds the complete semantic model in %s detail',
    (level) => {
      const deployment = build(level);
      const { group } = deployment;

      expect(group.name).toBe('SugarkubeDeployment');
      expect(group.position.toArray()).toEqual([-8.74, 0.2, -22.92]);
      expect(group.rotation.y).toBeCloseTo(Math.PI * 0.55);
      expect(group.userData.detailLevel).toBe(level);

      const table = byName(group, 'SugarkubeTable');
      const networkSwitch = byName(group, 'SugarkubeNetworkSwitch');
      expect(table?.position.x).toBeCloseTo(0);
      expect(table?.position.z).toBeCloseTo(0);
      expect(networkSwitch?.position.x).toBeCloseTo(0);
      expect(networkSwitch?.position.z).toBeCloseTo(0);

      expect(
        [0, 1, 2].map((tier) => byName(group, `SugarkubeRackTier-${tier}`))
      ).toHaveLength(3);
      expect(
        group.children.filter((child) =>
          child.name.startsWith('SugarkubeRackPillar-')
        )
      ).toHaveLength(4);

      for (let tier = 0; tier < 3; tier += 1) {
        const tierGroup = byName(group, `SugarkubeRackTier-${tier}`);
        expect(tierGroup).toBeDefined();
        expect(
          tierGroup?.children.filter((child) =>
            child.name.startsWith(`SugarkubePi-${tier}-`)
          )
        ).toHaveLength(3);
        for (let slot = 0; slot < 3; slot += 1) {
          expect(byName(group, `SugarkubePi-${tier}-${slot}`)).toBeDefined();
        }
      }

      for (let index = 0; index < 9; index += 1) {
        expect(byName(group, `SugarkubeEthernetCable-${index}`)).toBeDefined();
      }
      expect(byName(group, 'SugarkubeUplinkCable')).toBeDefined();
      expect(byName(group, 'SugarkubeWallPlate')).toBeDefined();
      expect(byName(group, 'SugarkubeWallPlateRJ45Port')).toBeDefined();

      expect(deployment.colliders).toHaveLength(1);
      expect(deployment.colliders[0]).toMatchObject({
        debugName: 'SugarkubeDeploymentCollider',
      });

      group.traverse((object) => {
        finiteObject(object);
        const box = new Box3().setFromObject(object);
        if (!box.isEmpty()) {
          expect(Number.isFinite(box.min.x)).toBe(true);
          expect(Number.isFinite(box.max.z)).toBe(true);
        }
      });
    }
  );

  it('uses genuine detail-specific triangle budgets without inactive LODs', () => {
    const totals = Object.fromEntries(
      levels.map((level) => [level, countObjectTriangles(build(level).group)])
    ) as Record<SceneDetailLevel, number>;

    expect(totals.cinematic).toBeGreaterThan(totals.balanced);
    expect(totals.balanced).toBeGreaterThan(totals.performance);
    expect(totals.balanced / totals.cinematic).toBeGreaterThanOrEqual(0.4);
    expect(totals.balanced / totals.cinematic).toBeLessThanOrEqual(0.6);
    expect(totals.performance / totals.balanced).toBeGreaterThanOrEqual(0.4);
    expect(totals.performance / totals.balanced).toBeLessThanOrEqual(0.6);

    for (const level of levels) {
      const root = build(level).group;
      const detailLevels = new Set<string>();
      root.traverse((object) => {
        if (typeof object.userData.detailLevel === 'string')
          detailLevels.add(object.userData.detailLevel);
      });
      expect(detailLevels).toEqual(new Set([level]));
    }
  });
});
