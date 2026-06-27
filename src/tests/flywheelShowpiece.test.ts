import { MathUtils, Object3D } from 'three';
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
    expect(state.crankAngle).toBeCloseTo(FLYWHEEL_CRANK_RAD_PER_SECOND / 60);
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

  it('keeps the axle, output shaft, and wheel aligned to the Z spin axis', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    const axle = build.group.getObjectByName('FlywheelAxle') as Object3D;
    const output = build.group.getObjectByName(
      'FlywheelOutputShaft'
    ) as Object3D;
    const wheel = build.group.getObjectByName('FlywheelWheelGroup') as Object3D;

    expect(MathUtils.euclideanModulo(axle.rotation.x, Math.PI * 2)).toBeCloseTo(
      Math.PI / 2
    );
    expect(
      MathUtils.euclideanModulo(output.rotation.x, Math.PI * 2)
    ).toBeCloseTo(Math.PI / 2);

    build.update({ elapsed: 1, delta: 0.25, emphasis: 0 });
    expect(wheel.rotation.z).toBeCloseTo(build.getDebugState().carrierAngle);
    expect(output.rotation.z).toBeCloseTo(build.getDebugState().carrierAngle);
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
    expect(beforeBoost).toBeCloseTo(FLYWHEEL_CRANK_RAD_PER_SECOND / 60);

    build.update({ elapsed: 600 + 1 / 60, delta: 1 / 60, emphasis: 99 });
    const afterBoost = build.getDebugState().crankAngle;
    expect(afterBoost - beforeBoost).toBeCloseTo(
      (FLYWHEEL_CRANK_RAD_PER_SECOND * (1 + FLYWHEEL_EMPHASIS_SPEED_BOOST)) / 60
    );

    build.update({ elapsed: 599, delta: -1, emphasis: 0 });
    expect(build.getDebugState().crankAngle).toBeCloseTo(afterBoost);
    build.dispose();
  });

  it('accepts runtime energy targets and renders one bounded packet subsection', () => {
    const build = createFlywheelShowpiece({
      position: { x: 10, z: -2 },
      orientationRadians: Math.PI / 6,
      roomBounds,
      detailPolicy: SCENE_DETAIL_POLICIES.balanced,
    });
    build.setEnergyTargets(
      [
        {
          poiId: 'tokenplace-studio-cluster',
          label: 'TokenPlace',
          floorId: 'ground',
          worldPosition: { x: 0, y: 0, z: -2 },
        },
        {
          poiId: 'jobbot-studio-terminal',
          label: 'Jobbot',
          floorId: 'ground',
          worldPosition: { x: 14, y: 0, z: 6 },
        },
      ],
      ['missing-visual-anchor:optional']
    );
    build.update({
      elapsed: 1,
      delta: 0.2,
      emphasis: 0,
      runDecorativeEffects: false,
    });
    const debug = build.getDebugState().energy;
    expect(debug.targetCount).toBe(2);
    expect(debug.missingTargetDiagnostics).toEqual([
      'missing-visual-anchor:optional',
    ]);
    expect(debug.direction).toBe('incoming');
    expect(debug.selectedTargetId).toBeTruthy();
    expect(debug.visibleWindowStart).not.toBeNull();
    expect(
      debug.visibleWindowEnd! - debug.visibleWindowStart!
    ).toBeLessThanOrEqual(0.11);
    expect(debug.activeNodeCount).toBeLessThanOrEqual(10);
    expect(debug.sourceWorldPosition?.x).not.toBeCloseTo(
      debug.destinationWorldPosition?.x ?? 0
    );

    const packet = build.group.getObjectByName('FlywheelEnergyTransferPacket')!;
    const visibleNodes = packet.children.filter(
      (child) =>
        child.name.startsWith('FlywheelEnergyPacketNode') && child.visible
    );
    expect(visibleNodes.length).toBe(debug.activeNodeCount);
    expect(
      build.group.children.filter(
        (child) => child.name === 'FlywheelEnergyTransferPacket'
      )
    ).toHaveLength(1);
    build.dispose();
  });

  it('keeps transfer semantics under reduced presentation scales and reaches outgoing direction', () => {
    const previousPulseScale =
      document.documentElement.dataset.accessibilityPulseScale;
    const previousFlickerScale =
      document.documentElement.dataset.accessibilityFlickerScale;
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });

    try {
      document.documentElement.dataset.accessibilityPulseScale = '0';
      document.documentElement.dataset.accessibilityFlickerScale = '0';
      build.setEnergyTargets([
        {
          poiId: 'a',
          label: 'A',
          floorId: 'ground',
          worldPosition: { x: 1, y: 0, z: 0 },
        },
        {
          poiId: 'b',
          label: 'B',
          floorId: 'ground',
          worldPosition: { x: 2, y: 0, z: 0 },
        },
      ]);
      for (let i = 0; i < 5; i += 1) {
        expect(build.getDebugState().energy.direction ?? 'incoming').toBe(
          'incoming'
        );
        build.update({
          elapsed: i,
          delta: 3,
          emphasis: 0,
          runDecorativeEffects: false,
        });
      }
      expect(build.getDebugState().energy.direction).toBe('outgoing');
      expect(build.getDebugState().energy.pulseScale).toBe(0);
      expect(build.getDebugState().energy.flickerScale).toBe(0);
    } finally {
      if (previousPulseScale === undefined) {
        delete document.documentElement.dataset.accessibilityPulseScale;
      } else {
        document.documentElement.dataset.accessibilityPulseScale =
          previousPulseScale;
      }
      if (previousFlickerScale === undefined) {
        delete document.documentElement.dataset.accessibilityFlickerScale;
      } else {
        document.documentElement.dataset.accessibilityFlickerScale =
          previousFlickerScale;
      }
      build.dispose();
    }
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
        'flywheel-incoming-arc-hint',
        'flywheel-outgoing-arc-hint',
      ])
    );
  });
});
