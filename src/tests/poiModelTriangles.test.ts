import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import {
  clearPoiModelRoots,
  getPoiModelRoot,
  getPoiModelTriangleCount,
  registerPoiModelRoot,
} from '../scene/poi/modelTriangles';
import { createSugarkubeDeployment } from '../scene/structures/sugarkubeDeployment';
import { countObjectTriangles } from '../scene/structures/triangleCount';

describe('POI model triangle registry', () => {
  it('reports the registered Sugarkube deployment variant triangle count', () => {
    clearPoiModelRoots();
    const deployment = createSugarkubeDeployment({
      position: { x: -8.74, y: 0, z: -22.92 },
      orientationRadians: Math.PI * 0.55,
      detailPolicy: getSceneDetailPolicy('performance'),
      wallNetworkEndpoint: {
        x: -8.74,
        y: 0.48,
        z: -31.1,
        orientationRadians: 0,
      },
    });

    registerPoiModelRoot('sugarkube-backyard-greenhouse', deployment.group);

    expect(getPoiModelRoot('sugarkube-backyard-greenhouse')?.name).toBe(
      'SugarkubeDeployment'
    );
    expect(getPoiModelTriangleCount('sugarkube-backyard-greenhouse')).toBe(
      countObjectTriangles(deployment.group)
    );
  });

  it('clears the registered Sugarkube deployment root and triangle count', () => {
    clearPoiModelRoots();
    const deployment = createSugarkubeDeployment({
      position: { x: -8.74, y: 0, z: -22.92 },
      orientationRadians: Math.PI * 0.55,
      detailPolicy: getSceneDetailPolicy('performance'),
      wallNetworkEndpoint: {
        x: -8.74,
        y: 0.48,
        z: -31.1,
        orientationRadians: 0,
      },
    });

    registerPoiModelRoot('sugarkube-backyard-greenhouse', deployment.group);
    expect(getPoiModelRoot('sugarkube-backyard-greenhouse')).toBe(
      deployment.group
    );

    clearPoiModelRoots();

    expect(getPoiModelRoot('sugarkube-backyard-greenhouse')).toBeUndefined();
    expect(
      getPoiModelTriangleCount('sugarkube-backyard-greenhouse')
    ).toBeNull();
  });

  it('reports the active Sugarkube deployment instead of stale greenhouse geometry', () => {
    clearPoiModelRoots();
    const staleGreenhouseRoot = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial()
    );
    staleGreenhouseRoot.name = 'BackyardGreenhouse';
    registerPoiModelRoot('sugarkube-backyard-greenhouse', staleGreenhouseRoot);
    const staleTriangleCount = countObjectTriangles(staleGreenhouseRoot);

    const deployment = createSugarkubeDeployment({
      position: { x: -8.74, y: 0, z: -22.92 },
      orientationRadians: Math.PI * 0.55,
      detailPolicy: getSceneDetailPolicy('performance'),
      wallNetworkEndpoint: {
        x: -8.74,
        y: 0.48,
        z: -31.1,
        orientationRadians: 0,
      },
    });

    registerPoiModelRoot('sugarkube-backyard-greenhouse', deployment.group);

    expect(getPoiModelRoot('sugarkube-backyard-greenhouse')).toBe(
      deployment.group
    );
    expect(getPoiModelRoot('sugarkube-backyard-greenhouse')?.name).toBe(
      'SugarkubeDeployment'
    );
    expect(getPoiModelTriangleCount('sugarkube-backyard-greenhouse')).toBe(
      countObjectTriangles(deployment.group)
    );
    expect(getPoiModelTriangleCount('sugarkube-backyard-greenhouse')).not.toBe(
      staleTriangleCount
    );
  });

  it('keeps main debug triangle reporting on the registry path', () => {
    const mainSource = readFileSync(join(process.cwd(), 'src/main.ts'), 'utf8');

    const staleCounterName = ['countPoiModel', 'Triangles'].join('');

    expect(mainSource).not.toContain(staleCounterName);
    expect(mainSource).toContain(
      'modelTriangles: getPoiModelTriangleCount(definition.id) ?? 0'
    );
    expect(mainSource).toContain(
      'registerPoiModelRoot(\n      futuroptimistPoi.definition.id'
    );
  });
});
