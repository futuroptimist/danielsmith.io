import { Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { createGabrielSentry } from '../scene/structures/gabrielSentry';

describe('createGabrielSentry', () => {
  it('builds a privacy-first local guardian silhouette', () => {
    const build = createGabrielSentry({
      position: { x: 1, z: 2 },
      orientationRadians: Math.PI / 5,
    });

    expect(build.group.name).toBe('GabrielSentry');
    expect(build.colliders).toHaveLength(1);
    expect(build.group.getObjectByName('GabrielSentrySensor')).toBeInstanceOf(
      Mesh
    );
    expect(
      build.group.getObjectByName('GabrielLocalInferenceCore')
    ).toBeInstanceOf(Mesh);
    expect(
      build.group.getObjectByName('GabrielPrivacyBoundaryRing')
    ).toBeInstanceOf(Mesh);
    expect(build.group.getObjectByName('GabrielDamoclesBlade')).toBeInstanceOf(
      Mesh
    );
    expect(build.group.getObjectByName('GabrielDamoclesGuard')).toBeInstanceOf(
      Mesh
    );
  });
});
