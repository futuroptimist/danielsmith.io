import { describe, expect, it } from 'vitest';

import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import { countRenderableTriangles } from '../scene/graphics/triangleCount';
import { createSugarkubeDeployment } from '../scene/structures/sugarkubeDeployment';

function buildSugarkubeTriangles(
  level: 'cinematic' | 'balanced' | 'performance'
) {
  return countRenderableTriangles(
    createSugarkubeDeployment({
      position: { x: -8.74, z: -22.92 },
      orientationRadians: Math.PI * 0.55,
      detailPolicy: getSceneDetailPolicy(level),
      wallEndpoint: { x: -8.74, z: -28, orientationRadians: 0 },
    }).group
  );
}

describe('POI model triangle diagnostics', () => {
  it('counts the selected Sugarkube deployment variant, not the old greenhouse shell', () => {
    const cinematic = buildSugarkubeTriangles('cinematic');
    const balanced = buildSugarkubeTriangles('balanced');
    const performance = buildSugarkubeTriangles('performance');

    expect(cinematic).toBeGreaterThan(balanced);
    expect(balanced).toBeGreaterThan(performance);
    expect(performance).toBeGreaterThan(0);
  });
});
