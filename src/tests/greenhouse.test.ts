import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { createGreenhouse } from '../structures/greenhouse';

describe('createGreenhouse', () => {
  it('builds greenhouse exhibit with animated solar panels and grow lights', () => {
    const basePosition = new Vector3(4, 0, 12);
    const { group, colliders, update } = createGreenhouse({
      basePosition,
      width: 4.2,
      depth: 3,
    });

    expect(group.name).toBe('BackyardGreenhouse');
    const solarPivot = group.getObjectByName('BackyardGreenhouseSolarPanels');
    expect(solarPivot).toBeInstanceOf(Group);
    const initialRotation = (solarPivot as Group).rotation.x;
    update({ elapsed: 1.2, delta: 0.016 });
    expect((solarPivot as Group).rotation.x).not.toBe(initialRotation);

    const growLight = group.getObjectByName('BackyardGreenhouseGrowLight-0');
    expect(growLight).toBeInstanceOf(Mesh);
    const growLightMaterial = (growLight as Mesh)
      .material as MeshStandardMaterial;
    const baselineIntensity = growLightMaterial.emissiveIntensity;
    update({ elapsed: 2.4, delta: 0.016 });
    expect(growLightMaterial.emissiveIntensity).not.toBe(baselineIntensity);

    expect(colliders).toHaveLength(1);
    const [collider] = colliders;
    expect(collider.minX).toBeLessThan(collider.maxX);
    expect(collider.minZ).toBeLessThan(collider.maxZ);
    expect(basePosition.x).toBeGreaterThanOrEqual(collider.minX);
    expect(basePosition.x).toBeLessThanOrEqual(collider.maxX);
    expect(basePosition.z).toBeGreaterThanOrEqual(collider.minZ);
    expect(basePosition.z).toBeLessThanOrEqual(collider.maxZ);
  });
});
