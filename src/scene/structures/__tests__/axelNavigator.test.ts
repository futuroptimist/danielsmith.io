import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createAxelNavigator, QUEST_MOMENTUM_PRESETS } from '../axelNavigator';

describe('createAxelNavigator', () => {
  it('builds the quest navigator showpiece with colliders', () => {
    const build = createAxelNavigator({ position: { x: 2, z: -3 } });

    expect(build.group.name).toBe('AxelQuestNavigator');
    expect(build.group.position.x).toBeCloseTo(2);
    expect(build.group.position.z).toBeCloseTo(-3);
    expect(build.colliders).toHaveLength(2);

    const dais = build.group.getObjectByName('AxelNavigatorDais');
    const slate = build.group.getObjectByName('AxelNavigatorSlate');
    const questCard = build.group.getObjectByName('AxelNavigatorQuestCard');

    expect(dais).toBeInstanceOf(Mesh);
    expect(slate).toBeInstanceOf(Mesh);
    expect(questCard).toBeInstanceOf(Mesh);

    const [mainCollider, consoleCollider] = build.colliders;
    expect(mainCollider.minX).toBeLessThan(mainCollider.maxX);
    expect(mainCollider.minZ).toBeLessThan(mainCollider.maxZ);
    expect(consoleCollider.minX).toBeLessThan(consoleCollider.maxX);
  });

  it('animates hologram layers and beacons based on emphasis', () => {
    const build = createAxelNavigator({ position: { x: 0, z: 0 } });

    const ringWrapper = build.group.getObjectByName(
      'AxelNavigatorRingWrapper-0'
    ) as Group;
    const ring = build.group.getObjectByName('AxelNavigatorRing-0') as Mesh;
    const beacon = build.group.getObjectByName('AxelNavigatorBeacon-0') as Mesh;

    const ringMaterial = ring.material as MeshBasicMaterial;
    const beaconMaterial = beacon.material as MeshStandardMaterial;

    const initialRotation = ringWrapper.rotation.y;
    const initialOpacity = ringMaterial.opacity;
    const initialBeaconIntensity = beaconMaterial.emissiveIntensity;

    build.update({ elapsed: 1.2, delta: 0.25, emphasis: 1 });

    expect(ringWrapper.rotation.y).toBeGreaterThan(initialRotation);
    expect(ringMaterial.opacity).toBeGreaterThan(initialOpacity);
    expect(beaconMaterial.emissiveIntensity).toBeGreaterThan(
      initialBeaconIntensity
    );

    const opacityAfterActivation = ringMaterial.opacity;

    build.update({ elapsed: 2.2, delta: 0.25, emphasis: 0 });

    expect(ringMaterial.opacity).toBeLessThanOrEqual(opacityAfterActivation);
    expect(beaconMaterial.emissiveIntensity).toBeGreaterThan(0);
  });

  it('projects quest backlog indicators with orbiting holographic beacons', () => {
    const build = createAxelNavigator({ position: { x: 0, z: 0 } });

    const momentumGroup = build.group.getObjectByName(
      'AxelNavigatorQuestMomentum'
    ) as Group;
    expect(momentumGroup).toBeInstanceOf(Group);

    const sampleQuest = QUEST_MOMENTUM_PRESETS[0];
    const indicator = momentumGroup.getObjectByName(
      `AxelNavigatorQuestIndicator-${sampleQuest.id}`
    ) as Mesh;
    const halo = momentumGroup.getObjectByName(
      `AxelNavigatorQuestHalo-${sampleQuest.id}`
    ) as Mesh;

    expect(indicator).toBeInstanceOf(Mesh);
    expect(halo).toBeInstanceOf(Mesh);

    const indicators = QUEST_MOMENTUM_PRESETS.map((quest) =>
      momentumGroup.getObjectByName(`AxelNavigatorQuestIndicator-${quest.id}`)
    ).filter(Boolean);

    expect(indicators).toHaveLength(QUEST_MOMENTUM_PRESETS.length);

    const indicatorMaterial = indicator.material as MeshStandardMaterial;
    const haloMaterial = halo.material as MeshBasicMaterial;

    const initialPosition = indicator.position.clone();
    const initialIntensity = indicatorMaterial.emissiveIntensity;
    const initialOpacity = indicatorMaterial.opacity;
    const initialHaloOpacity = haloMaterial.opacity;

    build.update({ elapsed: 0.8, delta: 0.32, emphasis: 0.75 });

    expect(indicator.position.x).not.toBeCloseTo(initialPosition.x);
    expect(indicator.position.z).not.toBeCloseTo(initialPosition.z);
    expect(indicatorMaterial.emissiveIntensity).toBeGreaterThan(
      initialIntensity
    );
    expect(indicatorMaterial.opacity).toBeGreaterThan(initialOpacity);
    expect(haloMaterial.opacity).toBeGreaterThan(initialHaloOpacity);
    expect(halo.position.y).toBeLessThan(indicator.position.y);
  });
});
