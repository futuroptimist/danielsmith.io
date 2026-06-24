import { Box3, Mesh, Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN } from '../assets/floorPlan';
import {
  getSceneDetailPolicy,
  type SceneDetailLevel,
} from '../scene/graphics/sceneDetailPolicy';
import { countObjectTriangles } from '../scene/graphics/triangleCount';
import { createSugarkubeDeployment } from '../scene/structures/sugarkubeDeployment';

const levels: SceneDetailLevel[] = ['cinematic', 'balanced', 'performance'];
const position = { x: -8.74, y: 0.2, z: -22.92 };
const orientationRadians = Math.PI * 0.55;
const livingRoom = FLOOR_PLAN.rooms.find((room) => room.id === 'livingRoom')!;
const wallEndpoint = {
  x: position.x,
  y: position.y,
  z: livingRoom.bounds.minZ + 0.06,
  orientationRadians: 0,
};

function build(level: SceneDetailLevel) {
  return createSugarkubeDeployment({
    position,
    orientationRadians,
    detailPolicy: getSceneDetailPolicy(level),
    wallEndpoint,
  });
}

function find(root: Object3D, name: string): Object3D {
  const object = root.getObjectByName(name);
  expect(object, name).toBeTruthy();
  return object!;
}

function byPrefix(root: Object3D, prefix: string): Object3D[] {
  const matches: Object3D[] = [];
  root.traverse((object) => {
    if (object.name.startsWith(prefix)) matches.push(object);
  });
  return matches;
}

function expectFiniteObject(root: Object3D) {
  root.traverse((object) => {
    for (const value of [
      object.position.x,
      object.position.y,
      object.position.z,
      object.rotation.x,
      object.rotation.y,
      object.rotation.z,
      object.scale.x,
      object.scale.y,
      object.scale.z,
    ]) {
      expect(Number.isFinite(value), object.name).toBe(true);
    }
    if (object instanceof Mesh) {
      const positionAttribute = object.geometry.getAttribute('position');
      expect(positionAttribute?.count ?? 0, object.name).toBeGreaterThan(0);
      const values = positionAttribute.array;
      for (let index = 0; index < values.length; index += 1) {
        expect(Number.isFinite(values[index]), object.name).toBe(true);
      }
    }
  });
}

describe('createSugarkubeDeployment', () => {
  it.each(levels)('builds the full semantic deployment in %s mode', (level) => {
    const deployment = build(level);
    expect(deployment.group.name).toBe('SugarkubeDeployment');
    expect(deployment.group.position.toArray()).toEqual([
      position.x,
      position.y,
      position.z,
    ]);
    expect(deployment.group.rotation.y).toBeCloseTo(orientationRadians);

    expect(find(deployment.group, 'SugarkubeTable').position.x).toBeCloseTo(0);
    expect(
      find(deployment.group, 'SugarkubeNetworkSwitch').position.x
    ).toBeCloseTo(0);
    expect(
      find(deployment.group, 'SugarkubeNetworkSwitch').position.z
    ).toBeCloseTo(0);
    expect(byPrefix(deployment.group, 'SugarkubeRackTier-')).toHaveLength(3);
    expect(
      byPrefix(deployment.group, 'SugarkubeRackCornerPillar-')
    ).toHaveLength(4);

    for (let tier = 0; tier < 3; tier += 1) {
      const tierPis = byPrefix(deployment.group, `SugarkubePi-${tier}-`);
      expect(tierPis).toHaveLength(3);
    }
    expect(byPrefix(deployment.group, 'SugarkubePi-')).toHaveLength(9);
    expect(byPrefix(deployment.group, 'SugarkubeEthernetCable-')).toHaveLength(
      9
    );
    expect(find(deployment.group, 'SugarkubeUplinkCable')).toBeTruthy();
    expect(find(deployment.group, 'SugarkubeWallPlate')).toBeTruthy();
    expect(find(deployment.group, 'SugarkubeWallPlateRJ45')).toBeTruthy();
    expect(byPrefix(deployment.group, 'TokenPlace')).toHaveLength(0);

    expect(deployment.colliders).toHaveLength(1);
    expect(
      deployment.colliders[0]!.maxX - deployment.colliders[0]!.minX
    ).toBeGreaterThan(2);
    expectFiniteObject(deployment.group);
  });

  it('uses real geometry budgets for the active detail level', () => {
    const counts = Object.fromEntries(
      levels.map((level) => [level, countObjectTriangles(build(level).group)])
    ) as Record<SceneDetailLevel, number>;

    expect(counts.cinematic).toBeGreaterThan(counts.balanced);
    expect(counts.balanced).toBeGreaterThan(counts.performance);
    expect(counts.balanced / counts.cinematic).toBeGreaterThanOrEqual(0.4);
    expect(counts.balanced / counts.cinematic).toBeLessThanOrEqual(0.6);
    expect(counts.performance / counts.balanced).toBeGreaterThanOrEqual(0.4);
    expect(counts.performance / counts.balanced).toBeLessThanOrEqual(0.6);
  });

  it('keeps the table bottom-centered on the root anchor', () => {
    const deployment = build('balanced');
    const table = find(deployment.group, 'SugarkubeTable');
    const box = new Box3().setFromObject(table);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(position.x);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(position.z);
    expect(box.min.y).toBeCloseTo(position.y);
  });
});
