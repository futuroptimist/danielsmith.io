import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';

import {
  getSceneDetailPolicy,
  ORDERED_SCENE_DETAIL_LEVELS,
} from '../scene/graphics/sceneDetailPolicy';
import { createGreenhouse } from '../scene/structures/greenhouse';
import { countObjectTriangles } from '../scene/structures/triangleCount';

describe('backyard solar growing frame', () => {
  it.each(ORDERED_SCENE_DETAIL_LEVELS)(
    'keeps the recognizable open structure bounded at %s detail',
    (level) => {
      const build = createGreenhouse({
        basePosition: new Vector3(4, 0, 12),
        detailPolicy: getSceneDetailPolicy(level),
      });
      expect(
        build.group.getObjectByName('BackyardSolarFramePost:-1:-1')
      ).toBeInstanceOf(Mesh);
      expect(
        build.group.getObjectByName('BackyardLeaningSolarPanel-2')
      ).toBeInstanceOf(Group);
      expect(build.group.getObjectByName('BackyardGrowBag-4')).toBeInstanceOf(
        Mesh
      );
      expect(
        build.group.getObjectByName('BackyardGalvanizedTub')
      ).toBeInstanceOf(Mesh);
      expect(
        build.group.getObjectByName('BackyardGreenhouseRoofRidge')
      ).toBeUndefined();
      expect(
        build.group.getObjectByName('BackyardGreenhouseGlassFront')
      ).toBeUndefined();
      expect(countObjectTriangles(build.group)).toBeLessThan(1800);
      const bounds = new Box3().setFromObject(build.group);
      expect(bounds.getSize(new Vector3()).x).toBeLessThan(4.76);
      expect(bounds.getSize(new Vector3()).z).toBeLessThan(3.44);
      const [collider] = build.colliders;
      expect(collider.minX).toBeCloseTo(bounds.min.x);
      expect(collider.maxZ).toBeCloseTo(bounds.max.z);
      const before = build.group.toJSON();
      document.documentElement.dataset.accessibilityPulseScale = '0';
      build.update({ elapsed: 10, delta: 1 });
      expect(build.group.toJSON()).toEqual(before);
      delete document.documentElement.dataset.accessibilityPulseScale;
    }
  );

  it('uses the supplied reflection resource and fits rotated collision bounds', () => {
    const texture = new Texture();
    const build = createGreenhouse({
      basePosition: new Vector3(2, 0, 3),
      orientationRadians: Math.PI / 4,
      environmentMap: texture,
    });
    const post = build.group.getObjectByName(
      'BackyardSolarFramePost:-1:-1'
    ) as Mesh;
    expect((post.material as MeshStandardMaterial).envMap).toBe(texture);
    const bounds = new Box3().setFromObject(build.group);
    expect(build.colliders[0].maxX).toBeCloseTo(bounds.max.x);
    expect(build.colliders[0].minZ).toBeCloseTo(bounds.min.z);
  });
});
