import { Group, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { createGabrielSentry } from '../scene/structures/gabrielSentry';

describe('createGabrielSentry', () => {
  it('builds a privacy coaching guardian with actionable local cards', () => {
    const build = createGabrielSentry({
      position: { x: -2, z: 3 },
      orientationRadians: Math.PI / 5,
    });

    expect(build.group.name).toBe('GabrielSentry');
    expect(build.group.getObjectByName('GabrielSentrySensor')).toBeInstanceOf(
      Mesh
    );
    expect(
      build.group.getObjectByName('GabrielSentryPrivacyCoachingArc')
    ).toBeInstanceOf(Group);
    expect(
      build.group.getObjectByName('GabrielSentryActionCard-0')
    ).toBeInstanceOf(Mesh);
    expect(build.colliders).toHaveLength(1);
    expect(build.colliders[0].minX).toBeLessThan(build.colliders[0].maxX);
  });

  it('animates scanner and beacon intensity with emphasis', () => {
    const build = createGabrielSentry({ position: { x: 0, z: 0 } });
    const scanner = build.group.getObjectByName(
      'GabrielSentryScanner'
    ) as Group;
    const beacon = build.group.getObjectByName('GabrielSentryBeacon') as Mesh;
    const material = beacon.material as { emissiveIntensity: number };

    build.update({ elapsed: 0.1, delta: 0.016, emphasis: 0 });
    const lowRotation = scanner.rotation.y;
    const lowIntensity = material.emissiveIntensity;

    build.update({ elapsed: 1.1, delta: 0.016, emphasis: 1 });

    expect(scanner.rotation.y).not.toBeCloseTo(lowRotation);
    expect(material.emissiveIntensity).toBeGreaterThan(lowIntensity);
  });
});
