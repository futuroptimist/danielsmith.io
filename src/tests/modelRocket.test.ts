import {
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Vector3,
} from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { createModelRocket } from '../scene/structures/modelRocket';

describe('createModelRocket', () => {
  const MIN_DELTA = 0.003;
  afterEach(() => {
    delete document.documentElement.dataset.accessibilityPulseScale;
  });

  it('builds a rocket group with expected child components', () => {
    const basePosition = new Vector3(4.2, 0, -3.1);
    const orientation = Math.PI / 6;

    const { group, collider } = createModelRocket({
      basePosition,
      orientationRadians: orientation,
    });

    expect(group.name).toBe('BackyardModelRocket');
    expect(group.position.x).toBeCloseTo(basePosition.x);
    expect(group.position.y).toBeCloseTo(basePosition.y);
    expect(group.position.z).toBeCloseTo(basePosition.z);
    expect(group.rotation.y).toBeCloseTo(orientation);

    const childNames = group.children.map((child) => child.name);
    expect(childNames).toContain('ModelRocketStand');
    expect(childNames).toContain('ModelRocketBody');
    expect(childNames).toContain('ModelRocketNose');
    expect(childNames).toContain('ModelRocketThruster');
    expect(childNames).toContain('ModelRocketSafetyRing');

    const finNames = childNames.filter((name) =>
      name.startsWith('ModelRocketFin-')
    );
    expect(finNames.length).toBeGreaterThanOrEqual(3);

    expect(childNames).toContain('ModelRocketThrusterFlame');
    expect(childNames).toContain('ModelRocketThrusterLight');
    expect(childNames).toContain('ModelRocketCountdownPanel');

    const footprintHalf = (collider.maxX - collider.minX) / 2;
    expect(footprintHalf).toBeGreaterThan(1);
    expect(collider.minX).toBeCloseTo(basePosition.x - footprintHalf);
    expect(collider.maxX).toBeCloseTo(basePosition.x + footprintHalf);
    expect(collider.minZ).toBeCloseTo(basePosition.z - footprintHalf);
    expect(collider.maxZ).toBeCloseTo(basePosition.z + footprintHalf);
  });

  it('pulses thruster glow, halo, and countdown indicator over time', () => {
    const basePosition = new Vector3(0, 0, 0);
    const build = createModelRocket({ basePosition });

    const thruster = build.group.getObjectByName(
      'ModelRocketThruster'
    ) as Mesh<MeshStandardMaterial>;
    const thrusterMaterial = thruster.material as MeshStandardMaterial;
    const thrusterBaseline = thrusterMaterial.emissiveIntensity;

    const flame = build.group.getObjectByName(
      'ModelRocketThrusterFlame'
    ) as Mesh<MeshBasicMaterial>;
    const flameMaterial = flame.material as MeshBasicMaterial;
    const flameOpacityBaseline = flameMaterial.opacity;

    const thrusterLight = build.group.getObjectByName(
      'ModelRocketThrusterLight'
    ) as PointLight;
    const lightIntensityBaseline = thrusterLight.intensity;

    const safetyRing = build.group.getObjectByName(
      'ModelRocketSafetyRing'
    ) as Mesh<MeshBasicMaterial>;
    const safetyMaterial = safetyRing.material as MeshBasicMaterial;
    const safetyOpacityBaseline = safetyMaterial.opacity;

    const countdownPanel = build.group.getObjectByName(
      'ModelRocketCountdownPanel'
    ) as Mesh<MeshBasicMaterial>;
    const countdownMaterial = countdownPanel.material as MeshBasicMaterial;
    const countdownOpacityBaseline = countdownMaterial.opacity;
    const countdownScaleBaseline = countdownPanel.scale.y;

    build.update({ elapsed: 1.6, delta: 0.016 });

    expect(
      Math.abs(thrusterMaterial.emissiveIntensity - thrusterBaseline)
    ).toBeGreaterThan(MIN_DELTA);
    expect(
      Math.abs(flameMaterial.opacity - flameOpacityBaseline)
    ).toBeGreaterThan(MIN_DELTA);
    expect(
      Math.abs(thrusterLight.intensity - lightIntensityBaseline)
    ).toBeGreaterThan(MIN_DELTA);
    expect(
      Math.abs(safetyMaterial.opacity - safetyOpacityBaseline)
    ).toBeGreaterThan(MIN_DELTA);
    expect(
      Math.abs(countdownMaterial.opacity - countdownOpacityBaseline)
    ).toBeGreaterThan(MIN_DELTA);
    expect(
      Math.abs(countdownPanel.scale.y - countdownScaleBaseline)
    ).toBeGreaterThan(MIN_DELTA);
  });

  it('honors reduced pulse scale accessibility preferences', () => {
    const basePosition = new Vector3(0, 0, 0);

    document.documentElement.dataset.accessibilityPulseScale = '1';
    const fullPulse = createModelRocket({ basePosition });
    fullPulse.update({ elapsed: 2.1, delta: 0.016 });
    const fullLight = fullPulse.group.getObjectByName(
      'ModelRocketThrusterLight'
    ) as PointLight;
    const fullFlame = fullPulse.group.getObjectByName(
      'ModelRocketThrusterFlame'
    ) as Mesh<MeshBasicMaterial>;
    const fullCountdown = fullPulse.group.getObjectByName(
      'ModelRocketCountdownPanel'
    ) as Mesh<MeshBasicMaterial>;

    document.documentElement.dataset.accessibilityPulseScale = '0';
    const reducedPulse = createModelRocket({ basePosition });
    reducedPulse.update({ elapsed: 2.1, delta: 0.016 });
    const reducedLight = reducedPulse.group.getObjectByName(
      'ModelRocketThrusterLight'
    ) as PointLight;
    const reducedFlame = reducedPulse.group.getObjectByName(
      'ModelRocketThrusterFlame'
    ) as Mesh<MeshBasicMaterial>;
    const reducedCountdown = reducedPulse.group.getObjectByName(
      'ModelRocketCountdownPanel'
    ) as Mesh<MeshBasicMaterial>;

    expect(reducedLight.intensity).toBeLessThanOrEqual(fullLight.intensity);
    expect(
      (reducedFlame.material as MeshBasicMaterial).opacity
    ).toBeLessThanOrEqual((fullFlame.material as MeshBasicMaterial).opacity);
    expect(
      (reducedCountdown.material as MeshBasicMaterial).opacity
    ).toBeLessThanOrEqual(
      (fullCountdown.material as MeshBasicMaterial).opacity
    );
    expect(reducedCountdown.scale.y).toBeLessThanOrEqual(fullCountdown.scale.y);
  });
});
