import { Mesh, MeshStandardMaterial, PointLight, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN } from '../assets/floorPlan';
import { createGraphicsQualityManager } from '../scene/graphics/qualityManager';
import {
  getSceneDetailPolicy,
  ORDERED_SCENE_DETAIL_LEVELS,
} from '../scene/graphics/sceneDetailPolicy';
import {
  createLedAnimator,
  ROOM_LED_PULSE_PROGRAMS,
} from '../scene/lighting/ledPulsePrograms';
import { createRoomLedStrips } from '../scene/lighting/ledStrips';
import { applySeasonalLightingPreset } from '../scene/lighting/seasonalPresets';
import { createGabrielSentry } from '../scene/structures/gabrielSentry';

const options = {
  plan: FLOOR_PLAN,
  getRoomCategory: (id: string) =>
    FLOOR_PLAN.rooms.find((room) => room.id === id)?.category ?? 'interior',
  ledHeight: 4,
  baseColor: 0x101623,
  emissiveIntensity: 3.2,
  fillLightIntensity: 1.4,
  wallThickness: 0.3,
};
const countLights = (root: Object3D) => {
  let count = 0;
  root.traverse((object) => {
    if (object instanceof PointLight) count++;
  });
  return count;
};
const meshState = (root: Object3D) => {
  const result: unknown[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh)
      result.push({
        name: object.name,
        geometry: object.geometry.toJSON(),
        position: object.position.toArray(),
        material: (object.material as MeshStandardMaterial).emissiveIntensity,
      });
  });
  // Geometry UUIDs differ between otherwise identical builds.
  return JSON.stringify(result).replace(/"uuid":"[^"]+",?/g, '');
};

describe('decorative point-light policy', () => {
  it.each(ORDERED_SCENE_DETAIL_LEVELS)(
    'constructs only policy-enabled lights in %s',
    (level) => {
      const detailPolicy = getSceneDetailPolicy(level);
      const leds = createRoomLedStrips({ ...options, detailPolicy });
      const sentry = createGabrielSentry({
        position: { x: 0, z: 0 },
        detailPolicy,
      });
      const rooms = FLOOR_PLAN.rooms.filter(
        (room) => options.getRoomCategory(room.id) !== 'exterior'
      );
      const enabled = detailPolicy.effects.dynamicPointLights;
      expect(countLights(leds.fillLightGroup)).toBe(
        enabled ? rooms.length * 5 : 0
      );
      expect(leds.fillLights).toHaveLength(enabled ? rooms.length * 5 : 0);
      expect(leds.fillLightsByRoom.size).toBe(enabled ? rooms.length : 0);
      expect(countLights(sentry.group)).toBe(enabled ? 1 : 0);
      expect(leds.materials).toHaveLength(rooms.length);
      expect(
        leds.seasonalTargets.every(
          (target) => target.fillLights.length === (enabled ? 5 : 0)
        )
      ).toBe(true);
      expect(
        leds.materials.every((material) => material.emissiveIntensity === 3.2)
      ).toBe(true);
    }
  );

  it('uses the effect flag, preserving geometry and animated emissive glow', () => {
    const quality = getSceneDetailPolicy('balanced');
    const disabled = {
      ...quality,
      effects: { ...quality.effects, dynamicPointLights: false },
    };
    const leds = createRoomLedStrips({ ...options, detailPolicy: disabled });
    const normal = createRoomLedStrips(options);
    expect(countLights(leds.fillLightGroup)).toBe(0);
    expect(meshState(leds.group)).toEqual(meshState(normal.group));
    applySeasonalLightingPreset({
      targets: leds.seasonalTargets,
      preset: null,
    });
    const animator = createLedAnimator({
      programs: ROOM_LED_PULSE_PROGRAMS,
      targets: Array.from(leds.materialsByRoom, ([roomId, material]) => ({
        roomId,
        material,
        fillLight: leds.fillLightsByRoom.get(roomId),
      })),
    });
    animator.update(1.25);
    expect(
      leds.materials.every((material) => material.emissiveIntensity > 0)
    ).toBe(true);
    const sentry = createGabrielSentry({
      position: { x: 0, z: 0 },
      detailPolicy: disabled,
    });
    const normalSentry = createGabrielSentry({ position: { x: 0, z: 0 } });
    for (const elapsed of [0, 0.25, 1.7]) {
      for (const build of [sentry, normalSentry])
        build.update({ elapsed, delta: 0.016, emphasis: 0.7 });
      expect(meshState(sentry.group)).toEqual(meshState(normalSentry.group));
      expect(sentry.colliders).toEqual(normalSentry.colliders);
    }
    expect(countLights(sentry.group)).toBe(0);
  });

  it('keeps existing lights out of rendering through repeated toggles and animation', () => {
    const leds = createRoomLedStrips(options);
    const sentry = createGabrielSentry({ position: { x: 0, z: 0 } });
    const light = sentry.group.getObjectByName(
      'GabrielSentryBeaconLight'
    ) as PointLight;
    const manager = createGraphicsQualityManager({
      renderer: {
        getPixelRatio: () => 1,
        setPixelRatio: () => {},
        toneMappingExposure: 1,
      },
      ledFillLights: leds.fillLights,
      ledStripMaterials: leds.materials,
      basePixelRatio: 1,
      baseBloom: { strength: 0.12, radius: 0.45, threshold: 0.78 },
      baseLed: { emissiveIntensity: 3.2, lightIntensity: 1.4 },
    });
    const initialCount = countLights(leds.fillLightGroup);
    for (const level of [
      'performance',
      'cinematic',
      'performance',
      'balanced',
      'performance',
    ] as const) {
      manager.setLevel(level);
      sentry.setDynamicPointLightsEnabled(
        getSceneDetailPolicy(level).effects.dynamicPointLights
      );
      applySeasonalLightingPreset({
        targets: leds.seasonalTargets,
        preset: null,
      });
      sentry.update({ elapsed: 0.25, delta: 0.016, emphasis: 1 });
      const enabled = level !== 'performance';
      expect(leds.fillLights.every((fill) => fill.visible === enabled)).toBe(
        true
      );
      expect(light.visible).toBe(enabled);
      expect(
        leds.materials.every((material) => material.emissiveIntensity > 0)
      ).toBe(true);
      expect(countLights(leds.fillLightGroup)).toBe(initialCount);
      expect(countLights(sentry.group)).toBe(1);
    }
  });
});
