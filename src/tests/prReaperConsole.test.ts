import { Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createPrReaperConsole } from '../structures/prReaperConsole';

describe('createPrReaperConsole', () => {
  it('builds the console with expected structure and colliders respecting rotation', () => {
    const position = { x: 6.6, z: 19.6 };
    const orientation = Math.PI * 0.35;
    const console = createPrReaperConsole({
      position,
      orientationRadians: orientation,
    });

    expect(console.group.name).toBe('PrReaperConsole');
    expect(
      console.group.getObjectByName('PrReaperConsoleScreen')
    ).toBeInstanceOf(Mesh);
    expect(
      console.group.getObjectByName('PrReaperConsoleHologram')
    ).toBeInstanceOf(Mesh);
    expect(
      console.group.getObjectByName('PrReaperConsoleWalkway')
    ).toBeInstanceOf(Mesh);

    expect(console.colliders).toHaveLength(2);
    const [deckCollider, walkwayCollider] = console.colliders;

    const deckCenterX = (deckCollider.minX + deckCollider.maxX) / 2;
    const deckCenterZ = (deckCollider.minZ + deckCollider.maxZ) / 2;
    expect(deckCenterX).toBeCloseTo(position.x, 6);
    expect(deckCenterZ).toBeCloseTo(position.z, 6);

    const walkwayCenterX = (walkwayCollider.minX + walkwayCollider.maxX) / 2;
    const walkwayCenterZ = (walkwayCollider.minZ + walkwayCollider.maxZ) / 2;
    const walkwayOffset = 1.6 / 2 + 0.7 / 2 - 0.12;
    const expectedWalkwayX = position.x + Math.sin(orientation) * walkwayOffset;
    const expectedWalkwayZ = position.z + Math.cos(orientation) * walkwayOffset;
    expect(walkwayCenterX).toBeCloseTo(expectedWalkwayX, 6);
    expect(walkwayCenterZ).toBeCloseTo(expectedWalkwayZ, 6);
    expect(walkwayCenterX).not.toBeCloseTo(deckCenterX, 6);
    expect(walkwayCenterZ).not.toBeCloseTo(deckCenterZ, 6);
  });

  it('animates hologram elements and emissive surfaces based on emphasis', () => {
    const console = createPrReaperConsole({ position: { x: 0, z: 0 } });
    const screen = console.group.getObjectByName(
      'PrReaperConsoleScreen'
    ) as Mesh;
    const bridge = console.group.getObjectByName(
      'PrReaperConsoleBridge'
    ) as Mesh;
    const hologram = console.group.getObjectByName(
      'PrReaperConsoleHologram'
    ) as Mesh;
    const intake = console.group.getObjectByName(
      'PrReaperConsoleIntake'
    ) as Mesh;
    const sweep = console.group.getObjectByName('PrReaperConsoleSweep') as Mesh;
    const walkway = console.group.getObjectByName(
      'PrReaperConsoleWalkway'
    ) as Mesh;
    const caution = console.group.getObjectByName(
      'PrReaperConsoleCautionStrip'
    ) as Mesh;

    const screenMaterial = screen.material as MeshStandardMaterial;
    const bridgeMaterial = bridge.material as MeshStandardMaterial;
    const hologramMaterial = hologram.material as MeshStandardMaterial;
    const intakeMaterial = intake.material as MeshStandardMaterial;
    const sweepMaterial = sweep.material as MeshBasicMaterial;
    const walkwayMaterial = walkway.material as MeshStandardMaterial;
    const cautionMaterial = caution.material as MeshBasicMaterial;

    console.update({ elapsed: 0.5, delta: 0.016, emphasis: 0 });
    const baselineScreen = screenMaterial.emissiveIntensity;
    const baselineBridge = bridgeMaterial.emissiveIntensity;
    const baselineHologram = hologramMaterial.emissiveIntensity;
    const baselineIntake = intakeMaterial.emissiveIntensity;
    const baselineOpacity = sweepMaterial.opacity;

    const baselineWalkway = walkwayMaterial.emissiveIntensity;
    const baselineCaution = cautionMaterial.opacity;

    document.documentElement.dataset.accessibilityPulseScale = '0';
    console.update({ elapsed: 1.5, delta: 0.016, emphasis: 0 });
    const reducedWalkwayBaseline = walkwayMaterial.emissiveIntensity;
    const reducedCautionBaseline = cautionMaterial.opacity;
    expect(reducedWalkwayBaseline).toBeLessThanOrEqual(baselineWalkway);
    expect(reducedCautionBaseline).toBeLessThanOrEqual(baselineCaution);

    console.update({ elapsed: 2.5, delta: 0.016, emphasis: 0.8 });
    const dampenedWalkway = walkwayMaterial.emissiveIntensity;
    const dampenedCaution = cautionMaterial.opacity;
    expect(dampenedWalkway).toBeGreaterThan(reducedWalkwayBaseline);
    expect(dampenedCaution).toBeGreaterThan(reducedCautionBaseline);

    delete document.documentElement.dataset.accessibilityPulseScale;
    console.update({ elapsed: 3.5, delta: 0.016, emphasis: 0.8 });
    expect(screenMaterial.emissiveIntensity).toBeGreaterThan(baselineScreen);
    expect(bridgeMaterial.emissiveIntensity).toBeGreaterThan(baselineBridge);
    expect(hologramMaterial.emissiveIntensity).toBeGreaterThan(
      baselineHologram
    );
    expect(intakeMaterial.emissiveIntensity).toBeGreaterThan(baselineIntake);
    expect(sweepMaterial.opacity).toBeGreaterThan(baselineOpacity);
    expect(sweep.rotation.z).not.toBe(0);
    expect(walkwayMaterial.emissiveIntensity).toBeGreaterThan(dampenedWalkway);
    expect(cautionMaterial.opacity).toBeGreaterThan(dampenedCaution);
  });
});
