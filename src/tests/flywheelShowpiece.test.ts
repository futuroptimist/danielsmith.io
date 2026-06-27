import { Mesh, Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import {
  getSceneDetailPolicy,
  ORDERED_SCENE_DETAIL_LEVELS,
} from '../scene/graphics/sceneDetailPolicy';
import { MINIATURE_POI_PROXY_REGISTRY } from '../scene/miniature/poiProxyRegistry';
import { getPoiPhysicalMetadata } from '../scene/poi/physicalMetadata';
import { createFlywheelShowpiece } from '../scene/structures/flywheel';
import {
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_POI_ID,
  FLYWHEEL_TORQUE_RATIO,
} from '../scene/structures/flywheelEnergyContract';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const roomBounds = { minX: -6, maxX: 6, minZ: -6, maxZ: 6 };
const anchor = { x: 10, y: 0.25, z: -2 };

const collectNames = (root: Object3D) => {
  const names = new Set<string>();
  root.traverse((child) => names.add(child.name));
  return names;
};

describe('createFlywheelShowpiece', () => {
  it('uses a bottom-centered unit-scale root at the POI anchor', () => {
    const build = createFlywheelShowpiece({
      position: anchor,
      roomBounds,
      orientationRadians: 0.4,
    });

    expect(build.group.name).toBe('FlywheelEnergyInstallation');
    expect(build.group.position.toArray()).toEqual([
      anchor.x,
      anchor.y,
      anchor.z,
    ]);
    expect(build.group.rotation.y).toBeCloseTo(0.4);
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);

    build.dispose();
  });

  it('authors core geometry in local coordinates rather than world-coordinate child placement', () => {
    const build = createFlywheelShowpiece({ position: anchor, roomBounds });

    build.group.traverse((child) => {
      if (child !== build.group && child instanceof Mesh) {
        expect(Math.abs(child.position.x)).toBeLessThan(
          FLYWHEEL_INSTALLATION_BOUNDS.width
        );
        expect(Math.abs(child.position.z)).toBeLessThan(
          FLYWHEEL_INSTALLATION_BOUNDS.depth
        );
      }
    });

    build.dispose();
  });

  it('builds the physical semantic hierarchy and removes obsolete abstract kiosk names', () => {
    const build = createFlywheelShowpiece({ position: anchor, roomBounds });
    const names = collectNames(build.group);

    for (const name of [
      'FlywheelBase',
      'FlywheelBearingStandLeft',
      'FlywheelBearingStandRight',
      'FlywheelAxle',
      'FlywheelWheelGroup',
      'FlywheelHeavyRim',
      'FlywheelInnerHub',
      'FlywheelSpoke-0',
      'FlywheelCounterweight-0',
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
    ]) {
      expect(names.has(name)).toBe(true);
    }

    expect(names.has('FlywheelRotorGroup')).toBe(false);
    expect(names.has('FlywheelAutomationPillars')).toBe(false);
    expect(names.has('FlywheelInfoPanel')).toBe(false);

    build.dispose();
  });

  it('keeps crank, sun, carrier, planets, output, and flywheel synchronized', () => {
    const build = createFlywheelShowpiece({ position: anchor, roomBounds });

    build.update({ elapsed: 3, delta: 1 / 60, emphasis: 0 });
    const debug = build.getDebugState();

    expect(debug.sunAngle).toBeCloseTo(debug.crankAngle, 6);
    expect(debug.carrierAngle).toBeCloseTo(
      debug.crankAngle / FLYWHEEL_TORQUE_RATIO,
      6
    );
    expect(debug.planetOrbitAngle).toBeCloseTo(debug.carrierAngle, 6);
    expect(debug.outputShaftAngle).toBeCloseTo(debug.carrierAngle, 6);
    expect(debug.flywheelAngle).toBeCloseTo(debug.carrierAngle, 6);
    expect(debug.planetLocalSpin).toBeLessThan(0);

    const carrier = build.group.getObjectByName('FlywheelPlanetCarrier');
    const planet = build.group.getObjectByName('FlywheelPlanetGear-0');
    expect(carrier?.rotation.z).toBeCloseTo(debug.carrierAngle, 6);
    expect(planet?.rotation.z).toBeCloseTo(debug.planetLocalSpin, 6);

    build.dispose();
  });

  it('builds finite decreasing geometry across all detail levels without update allocations', () => {
    const triangleCounts = ORDERED_SCENE_DETAIL_LEVELS.map((level) => {
      const build = createFlywheelShowpiece({
        position: anchor,
        roomBounds,
        detailPolicy: getSceneDetailPolicy(level),
      });
      const beforeChildren = build.group.children.length;
      const beforeTriangles = countObjectTriangles(build.group);
      build.update({ elapsed: 1, delta: 1 / 60, emphasis: 0 });
      build.update({
        elapsed: 2,
        delta: 1 / 60,
        emphasis: 0.8,
        runDecorativeEffects: false,
      });
      expect(build.group.children.length).toBe(beforeChildren);
      expect(countObjectTriangles(build.group)).toBe(beforeTriangles);
      expect(beforeTriangles).toBeGreaterThan(0);
      build.dispose();
      build.dispose();
      return beforeTriangles;
    });

    expect(triangleCounts[0]).toBeGreaterThan(triangleCounts[1]);
    expect(triangleCounts[1]).toBeGreaterThan(triangleCounts[2]);
    expect(triangleCounts[2]).toBeGreaterThan(triangleCounts[3]);
  });

  it('returns conservative physical colliders and matching physical metadata', () => {
    const build = createFlywheelShowpiece({ position: anchor, roomBounds });
    const baseCollider = build.colliders[0];
    const metadata = getPoiPhysicalMetadata(FLYWHEEL_POI_ID);

    expect((baseCollider.minX + baseCollider.maxX) / 2).toBe(anchor.x);
    expect((baseCollider.minZ + baseCollider.maxZ) / 2).toBe(anchor.z);
    expect(baseCollider.maxX - baseCollider.minX).toBeCloseTo(
      FLYWHEEL_BASE_DIMENSIONS.width
    );
    expect(baseCollider.maxZ - baseCollider.minZ).toBeCloseTo(
      FLYWHEEL_BASE_DIMENSIONS.depth
    );
    expect(metadata?.anchor).toBe('bottom-center');
    expect(metadata?.intendedSceneBounds).toEqual(FLYWHEEL_INSTALLATION_BOUNDS);

    build.dispose();
  });

  it('keeps the miniature proxy synchronized with physical wheel/crank/gear semantics', () => {
    const proxy = MINIATURE_POI_PROXY_REGISTRY[FLYWHEEL_POI_ID];
    const names = proxy.primitives.map((primitive) => primitive.name);

    expect(proxy.syncRevision).toBeGreaterThanOrEqual(4);
    expect(proxy.sourceFiles).toContain(
      'src/scene/structures/flywheelEnergyContract.ts'
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'flywheel-heavy-wheel',
        'flywheel-crank-arm',
        'flywheel-gear-cluster',
        'flywheel-energy-port',
      ])
    );
  });
});
