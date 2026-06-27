import { Box3, Group, Mesh, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  ORDERED_SCENE_DETAIL_LEVELS,
  getSceneDetailPolicy,
} from '../scene/graphics/sceneDetailPolicy';
import { createFlywheelShowpiece } from '../scene/structures/flywheel';
import {
  FLYWHEEL_ENERGY_DIMENSIONS,
  FLYWHEEL_PLANETARY_RATIO,
} from '../scene/structures/flywheelEnergyContract';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const roomBounds = { minX: -6, maxX: 6, minZ: -6, maxZ: 6 };
const semanticNames = [
  'FlywheelBase',
  'FlywheelBearingStandLeft',
  'FlywheelBearingStandRight',
  'FlywheelAxle',
  'FlywheelWheelGroup',
  'FlywheelHeavyRim',
  'FlywheelInnerHub',
  'FlywheelCrankGroup',
  'FlywheelCrankDisc',
  'FlywheelCrankArm',
  'FlywheelCrankHandle',
  'FlywheelPlanetaryGearbox',
  'FlywheelRingGear',
  'FlywheelSunGear',
  'FlywheelPlanetCarrier',
  'FlywheelPlanetGear-0',
  'FlywheelOutputShaft',
  'FlywheelEnergyPort',
];

describe('createFlywheelShowpiece', () => {
  it('anchors the root at the POI position without scaling or world-coordinate children', () => {
    const build = createFlywheelShowpiece({
      position: { x: 9, y: 0.25, z: 0.75 },
      orientationRadians: 0.4,
      roomBounds,
    });
    expect(build.group.name).toBe('FlywheelEnergyInstallation');
    expect(build.group.position.toArray()).toEqual([9, 0.25, 0.75]);
    expect(build.group.rotation.y).toBe(0.4);
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    build.group.traverse((object: Object3D) => {
      if (object !== build.group) {
        expect(Math.abs(object.position.x)).toBeLessThan(3);
        expect(Math.abs(object.position.z)).toBeLessThan(3);
      }
    });
    build.dispose();
  });

  it('builds the physical semantic hierarchy and removes obsolete abstract kiosk pieces', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    semanticNames.forEach((name) =>
      expect(build.group.getObjectByName(name)).toBeTruthy()
    );
    expect(build.group.getObjectByName('FlywheelInfoPanel')).toBeUndefined();
    expect(
      build.group.getObjectByName('FlywheelAutomationPillars')
    ).toBeUndefined();
    expect(build.group.getObjectByName('FlywheelRotorGroup')).toBeUndefined();
    expect(build.group.getObjectByName('FlywheelSpoke-0')).toBeInstanceOf(Mesh);
    expect(
      build.group.getObjectByName('FlywheelCounterweight-0')
    ).toBeInstanceOf(Mesh);
    build.dispose();
  });

  it('synchronizes crank, sun, planet carrier, planet counter-spin, output, and flywheel angles', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    build.update({
      elapsed: 1,
      delta: 1,
      emphasis: 0,
      runDecorativeEffects: false,
    });
    const state = build.getDebugState();
    expect(state.ratio).toBe(FLYWHEEL_PLANETARY_RATIO);
    expect(state.sunAngle).toBeCloseTo(state.crankAngle);
    expect(state.carrierAngle).toBeCloseTo(
      state.crankAngle / FLYWHEEL_PLANETARY_RATIO
    );
    expect(state.flywheelAngle).toBeCloseTo(state.carrierAngle);
    expect(state.planetAngles[1].orbit).toBeGreaterThan(
      state.planetAngles[0].orbit
    );
    expect(state.planetAngles[0].spin).toBeLessThan(0);
    build.dispose();
  });

  it('builds finite geometry at every detail level with decreasing triangle counts', () => {
    const counts = ORDERED_SCENE_DETAIL_LEVELS.map((level) => {
      const build = createFlywheelShowpiece({
        position: { x: 0, z: 0 },
        roomBounds,
        detailPolicy: getSceneDetailPolicy(level),
      });
      const count = countObjectTriangles(build.group);
      expect(count).toBeGreaterThan(0);
      build.dispose();
      return count;
    });
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[3]);
  });

  it('keeps bounds, colliders, zero-emphasis update, allocation stability, and disposal safe', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    const box = new Box3().setFromObject(build.group);
    const size = new Vector3();
    box.getSize(size);
    expect(size.x).toBeLessThanOrEqual(
      FLYWHEEL_ENERGY_DIMENSIONS.installationBounds.width + 0.05
    );
    expect(size.z).toBeLessThanOrEqual(
      FLYWHEEL_ENERGY_DIMENSIONS.installationBounds.depth + 0.05
    );
    expect(size.y).toBeLessThanOrEqual(
      FLYWHEEL_ENERGY_DIMENSIONS.installationBounds.height + 0.05
    );
    expect(build.colliders.length).toBeGreaterThan(0);
    const meshCount = (() => {
      let count = 0;
      build.group.traverse((object) => {
        if (object instanceof Mesh) count += 1;
      });
      return count;
    })();
    build.update({ elapsed: 0, delta: 0.16, emphasis: 0 });
    build.update({ elapsed: 0.16, delta: 0.16, emphasis: 0 });
    let nextMeshCount = 0;
    build.group.traverse((object) => {
      if (object instanceof Mesh) nextMeshCount += 1;
    });
    expect(nextMeshCount).toBe(meshCount);
    expect(build.group.getObjectByName('FlywheelWheelGroup')).toBeInstanceOf(
      Group
    );
    build.dispose();
    build.dispose();
    expect(build.getDebugState().disposed).toBe(true);
  });
});
