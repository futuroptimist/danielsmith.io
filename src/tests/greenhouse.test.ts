import {
  CanvasTexture,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';

import { createGreenhouse } from '../scene/structures/greenhouse';

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

  it('applies the supplied environment map to reflective greenhouse materials', () => {
    const environmentCanvas = document.createElement('canvas');
    const environmentMap = new CanvasTexture(environmentCanvas);
    environmentMap.colorSpace = SRGBColorSpace;
    environmentMap.needsUpdate = true;

    const { group } = createGreenhouse({
      basePosition: new Vector3(0, 0, 0),
      environmentMap,
      environmentIntensity: 0.9,
    });

    const glass = group.getObjectByName('BackyardGreenhouseGlassFront');
    expect(glass).toBeInstanceOf(Mesh);
    const glassMaterial = (glass as Mesh).material as MeshPhysicalMaterial;
    expect(glassMaterial.envMap).toBe(environmentMap);
    expect(glassMaterial.envMapIntensity).toBeCloseTo(0.9, 5);

    const frame = group.getObjectByName('BackyardGreenhousePost-0');
    expect(frame).toBeInstanceOf(Mesh);
    const frameMaterial = (frame as Mesh).material as MeshStandardMaterial;
    expect(frameMaterial.envMap).toBe(environmentMap);
    expect(frameMaterial.envMapIntensity).toBeCloseTo(0.9, 5);
  });
});
