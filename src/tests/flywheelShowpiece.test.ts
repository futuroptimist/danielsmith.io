import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import { SCENE_DETAIL_POLICIES } from '../scene/graphics/sceneDetailPolicy';
import { MINIATURE_POI_PROXY_REGISTRY } from '../scene/miniature/poiProxyRegistry';
import { getPoiPhysicalMetadata } from '../scene/poi/physicalMetadata';
import { createFlywheelShowpiece } from '../scene/structures/flywheel';
import {
  FLYWHEEL_BASE_COLLIDER,
  FLYWHEEL_CRANK_RAD_PER_SECOND,
  FLYWHEEL_EMPHASIS_SPEED_BOOST,
  FLYWHEEL_GEARBOX_COLLIDER,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_MARKER_MIN_HEIGHT,
  FLYWHEEL_TORQUE_RATIO,
} from '../scene/structures/flywheelEnergyContract';

const roomBounds = { minX: -6, maxX: 6, minZ: -6, maxZ: 6 };

const coreNames = [
  'FlywheelBase',
  'FlywheelBearingStandLeft',
  'FlywheelBearingStandRight',
  'FlywheelAxle',
  'FlywheelWheelGroup',
  'FlywheelHeavyRim',
  'FlywheelInnerHub',
  'FlywheelEnergyGlowRing',
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
  it('anchors a bottom-centered unit-scale root at the POI position', () => {
    const build = createFlywheelShowpiece({
      position: { x: 10, y: 0.25, z: -2 },
      orientationRadians: Math.PI / 4,
      roomBounds,
    });
    expect(build.group.name).toBe('FlywheelEnergyInstallation');
    expect(build.group.position.toArray()).toEqual([10, 0.25, -2]);
    expect(build.group.rotation.y).toBeCloseTo(Math.PI / 4);
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    build.dispose();
  });

  it('builds the physical semantic hierarchy and removes obsolete abstract pieces', () => {
    const build = createFlywheelShowpiece({
      position: { x: 10, z: -2 },
      roomBounds,
    });
    for (const name of coreNames) {
      expect(build.group.getObjectByName(name)).toBeInstanceOf(Object3D);
    }
    expect(build.group.getObjectByName('FlywheelRotorGroup')).toBeUndefined();
    expect(
      build.group.getObjectByName('FlywheelAutomationPillars')
    ).toBeUndefined();
    expect(build.group.getObjectByName('FlywheelInfoPanel')).toBeUndefined();
    const childXs: number[] = [];
    build.group.traverse((object) => {
      if (object !== build.group) childXs.push(object.position.x);
    });
    expect(childXs).not.toContain(10);
    build.dispose();
  });

  it('synchronizes crank, gears, planets, output shaft, and flywheel', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    build.update({
      elapsed: 5,
      delta: 1 / 60,
      emphasis: 0,
      runDecorativeEffects: false,
    });
    const state = build.getDebugState();
    expect(state.sunAngle).toBeCloseTo(state.crankAngle);
    expect(state.carrierAngle).toBeCloseTo(
      state.sunAngle / FLYWHEEL_TORQUE_RATIO
    );
    expect(state.flywheelAngle).toBeCloseTo(state.carrierAngle);
    expect(state.planetLocalSpin).toBeLessThan(0);
    expect(
      (build.group.getObjectByName('FlywheelWheelGroup') as Object3D).rotation.z
    ).toBeCloseTo(state.carrierAngle);
    build.dispose();
  });

  it('supports all detail levels with decreasing triangle counts and no update rebuilds', () => {
    const counts = Object.values(SCENE_DETAIL_POLICIES).map((detailPolicy) => {
      const build = createFlywheelShowpiece({
        position: { x: 0, z: 0 },
        roomBounds,
        detailPolicy,
      });
      const before = build.getDebugState().triangleCount;
      build.update({ elapsed: 1, delta: 1 / 60, emphasis: 0 });
      build.update({ elapsed: 2, delta: 1 / 60, emphasis: 0 });
      expect(build.getDebugState().triangleCount).toBe(before);
      expect(before).toBeGreaterThan(0);
      build.dispose();
      build.dispose();
      return before;
    });
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[3]);
  });

  it('provides conservative physical colliders and metadata from the contract', () => {
    const build = createFlywheelShowpiece({
      position: { x: 3, z: 4 },
      roomBounds,
    });
    expect(build.colliders[0]).toMatchObject({
      minX: 3 - FLYWHEEL_BASE_COLLIDER.width / 2,
      maxX: 3 + FLYWHEEL_BASE_COLLIDER.width / 2,
    });
    const metadata = getPoiPhysicalMetadata('flywheel-studio-flywheel');
    expect(metadata?.intendedSceneBounds).toBe(FLYWHEEL_INSTALLATION_BOUNDS);
    expect(metadata?.anchor).toBe('bottom-center');
    expect(metadata?.clearances?.markerMinHeight).toBe(
      FLYWHEEL_MARKER_MIN_HEIGHT
    );
    build.dispose();
  });

  it('rotates asymmetric collider offsets with the installation orientation', () => {
    const build = createFlywheelShowpiece({
      position: { x: 3, z: 4 },
      orientationRadians: Math.PI / 2,
      roomBounds,
    });
    const gearbox = build.colliders[1];
    const centerX = (gearbox.minX + gearbox.maxX) / 2;
    const centerZ = (gearbox.minZ + gearbox.maxZ) / 2;
    expect(centerX).toBeCloseTo(3 + FLYWHEEL_GEARBOX_COLLIDER.centerZ);
    expect(centerZ).toBeCloseTo(4 - FLYWHEEL_GEARBOX_COLLIDER.centerX);
    expect(gearbox.maxX - gearbox.minX).toBeCloseTo(
      FLYWHEEL_GEARBOX_COLLIDER.depth
    );
    expect(gearbox.maxZ - gearbox.minZ).toBeCloseTo(
      FLYWHEEL_GEARBOX_COLLIDER.width
    );
    build.dispose();
  });

  it('integrates crank phase continuously when emphasis changes', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    build.update({ elapsed: 600, delta: 1 / 60, emphasis: 0 });
    const beforeBoost = build.getDebugState().crankAngle;
    build.update({ elapsed: 600 + 1 / 60, delta: 1 / 60, emphasis: 1 });
    const afterBoost = build.getDebugState().crankAngle;
    expect(afterBoost - beforeBoost).toBeCloseTo(
      (FLYWHEEL_CRANK_RAD_PER_SECOND * (1 + FLYWHEEL_EMPHASIS_SPEED_BOOST)) / 60
    );
    build.dispose();
  });

  it('keeps miniature proxy semantics in sync', () => {
    const proxy = MINIATURE_POI_PROXY_REGISTRY['flywheel-studio-flywheel'];
    const names = proxy.primitives.map((primitive) => primitive.name);
    expect(proxy.syncRevision).toBeGreaterThanOrEqual(4);
    expect(names).toEqual(
      expect.arrayContaining([
        'flywheel-heavy-wheel',
        'flywheel-crank-arm',
        'flywheel-planetary-gear-cluster',
        'flywheel-energy-port',
      ])
    );
  });
});
