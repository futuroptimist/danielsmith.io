import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import { MINIATURE_POI_PROXY_REGISTRY } from '../scene/miniature/poiProxyRegistry';
import { getPoiPhysicalMetadata } from '../scene/poi/physicalMetadata';
import { createFlywheelShowpiece } from '../scene/structures/flywheel';
import {
  FLYWHEEL_ANIMATION,
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_MARKER_MIN_HEIGHT,
  FLYWHEEL_PLANETARY_RATIO,
} from '../scene/structures/flywheelEnergyContract';

const roomBounds = { minX: 0, maxX: 16, minZ: -16, maxZ: 16 };
const anchor = { x: 10, y: 0, z: -2 };

function build(level = 'balanced' as const) {
  return createFlywheelShowpiece({
    position: anchor,
    orientationRadians: Math.PI / 4,
    roomBounds,
    detailPolicy: getSceneDetailPolicy(level),
  });
}

describe('createFlywheelShowpiece physical assembly', () => {
  it('anchors a unit-scale bottom-centered root at the POI position', () => {
    const flywheel = build();
    expect(flywheel.group.name).toBe('FlywheelEnergyInstallation');
    expect(flywheel.group.position.toArray()).toEqual([
      anchor.x,
      anchor.y,
      anchor.z,
    ]);
    expect(flywheel.group.rotation.y).toBeCloseTo(Math.PI / 4);
    expect(flywheel.group.scale.toArray()).toEqual([1, 1, 1]);
    flywheel.dispose();
  });

  it('creates the semantic physical hierarchy and omits obsolete abstract parts', () => {
    const flywheel = build();
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
      expect(flywheel.group.getObjectByName(name), name).toBeTruthy();
    }
    for (const obsolete of [
      'FlywheelRotorGroup',
      'FlywheelInfoPanel',
      'FlywheelAutomationPillars',
    ]) {
      expect(flywheel.group.getObjectByName(obsolete)).toBeUndefined();
    }
    flywheel.dispose();
  });

  it('keeps core geometry local instead of baking world coordinates into children', () => {
    const flywheel = build();
    flywheel.group.traverse((object) => {
      if (object === flywheel.group) return;
      expect(Math.abs(object.position.x)).toBeLessThan(3);
      expect(Math.abs(object.position.z)).toBeLessThan(3);
    });
    flywheel.dispose();
  });

  it('synchronizes crank, sun, carrier, planet gears, and flywheel without allocations', () => {
    const flywheel = build();
    const initialTriangleCount = flywheel.getDebugState().triangleCount;
    flywheel.update({
      elapsed: 1,
      delta: 1,
      emphasis: 0,
      runDecorativeEffects: false,
    });
    const state = flywheel.getDebugState();
    expect(state.crankAngle).toBeCloseTo(
      FLYWHEEL_ANIMATION.crankRadiansPerSecond
    );
    expect(state.sunAngle).toBeCloseTo(state.crankAngle);
    expect(state.carrierAngle).toBeCloseTo(
      state.crankAngle / FLYWHEEL_PLANETARY_RATIO
    );
    expect(state.flywheelAngle).toBeCloseTo(state.carrierAngle);
    expect(state.planetAngles[0].orbitAngle).toBeCloseTo(state.carrierAngle);
    expect(state.planetAngles[0].spinAngle).toBeLessThan(0);
    expect(flywheel.getDebugState().triangleCount).toBe(initialTriangleCount);
    flywheel.update({
      elapsed: 2,
      delta: 0,
      emphasis: 0,
      runDecorativeEffects: false,
    });
    expect(flywheel.getDebugState().crankAngle).toBeCloseTo(state.crankAngle);
    flywheel.dispose();
  });

  it('builds all detail levels with meaningfully decreasing triangle counts', () => {
    const counts = ['cinematic', 'balanced', 'performance', 'low', 'micro'].map(
      (level) => {
        const flywheel = createFlywheelShowpiece({
          position: anchor,
          roomBounds,
          detailPolicy: getSceneDetailPolicy(level as never),
        });
        const count = flywheel.getDebugState().triangleCount;
        flywheel.dispose();
        return count;
      }
    );
    counts.forEach((count) => expect(Number.isFinite(count)).toBe(true));
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[3]);
    expect(counts[3]).toBeGreaterThanOrEqual(counts[4]);
  });

  it('keeps colliders and physical metadata aligned with the visible bounds', () => {
    const flywheel = build();
    expect(flywheel.colliders[0]).toMatchObject({
      minX: anchor.x - FLYWHEEL_BASE_DIMENSIONS.width / 2,
      maxX: anchor.x + FLYWHEEL_BASE_DIMENSIONS.width / 2,
    });
    const bounds = new Box3().setFromObject(flywheel.group);
    const size = bounds.getSize(new Vector3());
    expect(size.x).toBeLessThanOrEqual(
      FLYWHEEL_INSTALLATION_BOUNDS.width + 0.2
    );
    expect(size.y).toBeLessThanOrEqual(
      FLYWHEEL_INSTALLATION_BOUNDS.height + 0.2
    );
    const metadata = getPoiPhysicalMetadata('flywheel-studio-flywheel');
    expect(metadata?.anchor).toBe('bottom-center');
    expect(metadata?.clearances?.markerMinHeight).toBe(
      FLYWHEEL_MARKER_MIN_HEIGHT
    );
    flywheel.dispose();
  });

  it('disposes idempotently', () => {
    const flywheel = build();
    flywheel.dispose();
    flywheel.dispose();
    expect(flywheel.getDebugState().disposed).toBe(true);
  });

  it('keeps the miniature proxy in sync with physical machine semantics', () => {
    const proxy = MINIATURE_POI_PROXY_REGISTRY['flywheel-studio-flywheel'];
    expect(proxy.syncRevision).toBe(5);
    expect(proxy.sourceFiles).toContain(
      'src/scene/structures/flywheelEnergyContract.ts'
    );
    const names = proxy.primitives.map((primitive) => primitive.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'flywheel-base',
        'flywheel-heavy-wheel',
        'flywheel-gear-cluster',
        'flywheel-crank-arm',
        'flywheel-energy-port',
      ])
    );
  });
});
