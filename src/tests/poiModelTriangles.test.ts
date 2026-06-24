import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import {
  clearPoiModelTriangleRegistry,
  getPoiModelTriangleCount,
  registerPoiModelRoot,
} from '../scene/poi/modelTriangleRegistry';
import { createSugarkubeDeployment } from '../scene/structures/sugarkubeDeployment';

describe('POI model triangle registry', () => {
  it('reports the active Sugarkube deployment variant instead of the old greenhouse', () => {
    clearPoiModelTriangleRegistry();
    const oldGreenhouseRoot = new Group();
    oldGreenhouseRoot.name = 'BackyardGreenhouse';
    oldGreenhouseRoot.add(
      new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    );
    const deployment = createSugarkubeDeployment({
      position: { x: -8.74, y: 0, z: -22.92 },
      orientationRadians: Math.PI * 0.55,
      detailPolicy: getSceneDetailPolicy('performance'),
      wallEndpoint: { x: -8.74, y: 0.42, z: -27.6, orientationRadians: 0 },
    });

    registerPoiModelRoot('sugarkube-backyard-greenhouse', oldGreenhouseRoot);
    const oldCount = getPoiModelTriangleCount('sugarkube-backyard-greenhouse');
    registerPoiModelRoot('sugarkube-backyard-greenhouse', deployment.group);
    const activeCount = getPoiModelTriangleCount(
      'sugarkube-backyard-greenhouse'
    );

    expect(activeCount).toBeGreaterThan(0);
    expect(activeCount).not.toBe(oldCount);
    expect(deployment.group.userData.poiModelRootId).toBe(
      'sugarkube-backyard-greenhouse'
    );
  });
});
