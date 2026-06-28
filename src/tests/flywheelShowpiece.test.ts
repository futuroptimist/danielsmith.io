import { Box3, Mesh, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { SCENE_DETAIL_POLICIES } from '../scene/graphics/sceneDetailPolicy';
import { MINIATURE_POI_PROXY_REGISTRY } from '../scene/miniature/poiProxyRegistry';
import { getPoiPhysicalMetadata } from '../scene/poi/physicalMetadata';
import { createFlywheelShowpiece } from '../scene/structures/flywheel';
import {
  FLYWHEEL_BASE_COLLIDER,
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_BEARING_STAND,
  FLYWHEEL_EMPHASIS_SPEED_BOOST,
  FLYWHEEL_ENERGY_PORT,
  FLYWHEEL_GEAR_RATIO,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_MARKER_MIN_HEIGHT,
  FLYWHEEL_SPIN_RAD_PER_SECOND,
  FLYWHEEL_WHEEL,
} from '../scene/structures/flywheelEnergyContract';

const roomBounds = { minX: -6, maxX: 6, minZ: -6, maxZ: 6 };

const mechanicalAssemblyNames = [
  'FlywheelPlanetaryGearbox',
  'FlywheelRingGear',
  'FlywheelSunGear',
  'FlywheelSunGearGroup',
  'FlywheelPlanetCarrier',
  'FlywheelCrankGroup',
  'FlywheelCrankArm',
  'FlywheelCrankHandle',
  'FlywheelOutputShaft',
  'FlywheelGearboxOutputCoupler',
  'FlywheelFlywheelHubCoupler',
  'FlywheelTorqueShaft',
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

  it('builds the heavy wheel body with the crank and planetary gear assembly', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    for (const name of [
      'FlywheelBase',
      'FlywheelWheelGroup',
      'FlywheelHeavyRim',
      'FlywheelInnerHub',
      'FlywheelSpoke-0',
      'FlywheelCounterweight-0',
      'FlywheelRimMotionTick-0',
      'FlywheelEnergyGlowRing',
      'FlywheelEnergyPort',
    ]) {
      expect(build.group.getObjectByName(name)).toBeInstanceOf(Object3D);
    }
    for (const name of mechanicalAssemblyNames) {
      expect(build.group.getObjectByName(name)).toBeInstanceOf(Object3D);
    }
    build.dispose();
  });

  it('rotates the wheel and moves asymmetric markers with the wheel group', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    const wheel = build.group.getObjectByName('FlywheelWheelGroup') as Object3D;
    const marker = build.group.getObjectByName(
      'FlywheelRimMotionTick-0'
    ) as Object3D;
    const before = new Vector3();
    const after = new Vector3();
    marker.getWorldPosition(before);
    expect(marker.parent).toBe(wheel);
    build.update({
      elapsed: 1,
      delta: 1,
      emphasis: 0,
      runDecorativeEffects: false,
    });
    marker.getWorldPosition(after);
    expect(wheel.rotation.z).toBeCloseTo(build.getDebugState().flywheelAngle);
    expect(build.getDebugState().spinVelocity).toBeCloseTo(
      FLYWHEEL_SPIN_RAD_PER_SECOND
    );
    expect(after.distanceTo(before)).toBeGreaterThan(0.1);
    build.dispose();
  });

  it('keeps the crank, gears, carrier, output shaft, and flywheel synchronized', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    build.update({
      elapsed: 1,
      delta: 1,
      emphasis: 0.75,
      runDecorativeEffects: false,
    });
    const debug = build.getDebugState();
    expect(debug.crankAngle).toBeCloseTo(
      debug.flywheelAngle * FLYWHEEL_GEAR_RATIO.sunToCarrier
    );
    expect(debug.sunGearAngle).toBeCloseTo(debug.crankAngle);
    expect(debug.planetCarrierAngle).toBeCloseTo(debug.flywheelAngle);
    expect(debug.outputShaftAngle).toBeCloseTo(debug.flywheelAngle);
    for (const planetAngle of debug.planetGearAngles) {
      expect(planetAngle).toBeCloseTo(
        -(debug.sunGearAngle - debug.planetCarrierAngle) *
          FLYWHEEL_GEAR_RATIO.planetCounterSpin
      );
    }
    build.dispose();
  });

  it('defensively snapshots planet gear debug angles', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    build.update({
      elapsed: 1,
      delta: 1,
      emphasis: 0.5,
      runDecorativeEffects: false,
    });
    const debug = build.getDebugState();
    const expectedAngle = debug.planetGearAngles[0];
    debug.planetGearAngles[0] = 999;

    expect(build.getDebugState().planetGearAngles[0]).toBeCloseTo(
      expectedAngle
    );
    build.dispose();
  });

  it('keeps glow subordinate to the heavy physical rim', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    const rimBox = new Box3().setFromObject(
      build.group.getObjectByName('FlywheelHeavyRim') as Object3D
    );
    const glowBox = new Box3().setFromObject(
      build.group.getObjectByName('FlywheelEnergyGlowRing') as Object3D
    );
    expect(glowBox.min.x).toBeGreaterThan(rimBox.min.x);
    expect(glowBox.max.x).toBeLessThan(rimBox.max.x);
    expect(glowBox.min.y).toBeGreaterThan(rimBox.min.y);
    expect(glowBox.max.y).toBeLessThan(rimBox.max.y);
    build.dispose();
  });

  it('uses front/back bearing yokes without crossing the flywheel rim', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    for (const name of [
      'FlywheelBearingYokeFront',
      'FlywheelBearingYokeBack',
    ]) {
      const yoke = build.group.getObjectByName(name) as Object3D;
      expect(
        Math.abs(yoke.position.z - FLYWHEEL_WHEEL.centerZ)
      ).toBeGreaterThan(FLYWHEEL_WHEEL.thickness / 2);
      const bridge = yoke.children.find((child) =>
        child.name.endsWith('Bridge')
      ) as Object3D;
      expect(bridge.position.y).toBeCloseTo(
        FLYWHEEL_BASE_DIMENSIONS.height + FLYWHEEL_BEARING_STAND.height - 0.06
      );
    }
    build.dispose();
  });

  it('provides simplified physical colliders and metadata from the contract', () => {
    const build = createFlywheelShowpiece({
      position: { x: 3, z: 4 },
      roomBounds,
    });
    expect(build.colliders).toHaveLength(1);
    expect(build.colliders[0]).toMatchObject({
      minX: 3 - FLYWHEEL_BASE_COLLIDER.width / 2,
      maxX: 3 + FLYWHEEL_BASE_COLLIDER.width / 2,
    });
    const metadata = getPoiPhysicalMetadata('flywheel-studio-flywheel');
    expect(metadata?.intendedSceneBounds).toBe(FLYWHEEL_INSTALLATION_BOUNDS);
    expect(metadata?.clearances?.markerMinHeight).toBe(
      FLYWHEEL_MARKER_MIN_HEIGHT
    );
    build.dispose();
  });

  it('integrates wheel phase continuously when emphasis changes', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    build.update({ elapsed: 600, delta: 1 / 60, emphasis: 0 });
    const beforeBoost = build.getDebugState().flywheelAngle;
    expect(beforeBoost).toBeCloseTo(FLYWHEEL_SPIN_RAD_PER_SECOND / 60);
    build.update({ elapsed: 600 + 1 / 60, delta: 1 / 60, emphasis: 99 });
    const afterBoost = build.getDebugState().flywheelAngle;
    expect(afterBoost - beforeBoost).toBeCloseTo(
      (FLYWHEEL_SPIN_RAD_PER_SECOND * (1 + FLYWHEEL_EMPHASIS_SPEED_BOOST)) / 60
    );
    build.update({ elapsed: 599, delta: -1, emphasis: 0 });
    expect(build.getDebugState().flywheelAngle).toBeCloseTo(afterBoost);
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
    expect(debug.visibleWindowStart).not.toBeNull();
    const packet = build.group.getObjectByName('FlywheelEnergyTransferPacket')!;
    const visibleNodes = packet.children.filter(
      (child) =>
        child.name.startsWith('FlywheelEnergyPacketNode') && child.visible
    );
    expect(visibleNodes.length).toBe(debug.activeNodeCount);
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
      if (previousPulseScale === undefined)
        delete document.documentElement.dataset.accessibilityPulseScale;
      else
        document.documentElement.dataset.accessibilityPulseScale =
          previousPulseScale;
      if (previousFlickerScale === undefined)
        delete document.documentElement.dataset.accessibilityFlickerScale;
      else
        document.documentElement.dataset.accessibilityFlickerScale =
          previousFlickerScale;
      build.dispose();
    }
  });

  it('reuses the pooled energy packet meshes, geometry, and materials across updates', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
      detailPolicy: SCENE_DETAIL_POLICIES.balanced,
    });
    build.setEnergyTargets([
      {
        poiId: 'tokenplace-studio-cluster',
        label: 'TokenPlace',
        floorId: 'ground',
        worldPosition: { x: -2, y: 0, z: 1 },
      },
      {
        poiId: 'jobbot-studio-terminal',
        label: 'Jobbot',
        floorId: 'ground',
        worldPosition: { x: 3, y: 0, z: -1 },
      },
    ]);
    build.update({
      elapsed: 0,
      delta: 0.2,
      emphasis: 0,
      runDecorativeEffects: false,
    });
    const collectPacketState = () => {
      const packet = build.group.children.find(
        (child) => child.name === 'FlywheelEnergyTransferPacket'
      )!;
      const meshes = packet.children.filter(
        (child) => child instanceof Mesh
      ) as Mesh[];
      return meshes.map((item) => [item.uuid, item.geometry.uuid]).join('|');
    };
    const before = collectPacketState();
    for (const [index, delta] of [2.6, 2.8, 2.8, 2.8, 2.8, 0.5].entries()) {
      build.update({
        elapsed: index + 1,
        delta,
        emphasis: 0,
        runDecorativeEffects: false,
      });
    }
    expect(build.getDebugState().energy.direction).toBe('outgoing');
    expect(collectPacketState()).toEqual(before);
    build.dispose();
  });

  it('renders outgoing transfers from the port to the POI with a stronger wider packet', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
      detailPolicy: SCENE_DETAIL_POLICIES.balanced,
    });
    build.setEnergyTargets([
      {
        poiId: 'tokenplace-studio-cluster',
        label: 'TokenPlace',
        floorId: 'ground',
        worldPosition: { x: -2, y: 0, z: 1 },
      },
      {
        poiId: 'jobbot-studio-terminal',
        label: 'Jobbot',
        floorId: 'ground',
        worldPosition: { x: 3, y: 0, z: -1 },
      },
    ]);
    build.update({
      elapsed: 0,
      delta: 0.2,
      emphasis: 0,
      runDecorativeEffects: false,
    });
    const incoming = build.getDebugState().energy;
    for (const [index, delta] of [2.6, 2.8, 2.8, 2.8, 2.8, 0.5].entries()) {
      build.update({
        elapsed: index + 1,
        delta,
        emphasis: 0,
        runDecorativeEffects: false,
      });
    }
    const outgoing = build.getDebugState().energy;
    expect(outgoing.direction).toBe('outgoing');
    expect(outgoing.sourceWorldPosition).toEqual({
      x: FLYWHEEL_ENERGY_PORT.x,
      y: FLYWHEEL_ENERGY_PORT.y,
      z: FLYWHEEL_ENERGY_PORT.z,
    });
    expect(outgoing.activeNodeCount).toBeGreaterThanOrEqual(
      incoming.activeNodeCount
    );
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
      expect(build.getDebugState().triangleCount).toBe(before);
      build.dispose();
      return before;
    });
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[3]);
  });

  it('keeps miniature proxy semantics in sync', () => {
    const proxy = MINIATURE_POI_PROXY_REGISTRY['flywheel-studio-flywheel'];
    const names = proxy.primitives.map((primitive) => primitive.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'flywheel-heavy-wheel',
        'flywheel-spoke',
        'flywheel-motion-tick',
        'flywheel-energy-port',
        'flywheel-incoming-arc-hint',
        'flywheel-outgoing-arc-hint',
      ])
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'flywheel-crank-arm',
        'flywheel-planetary-gear-cluster',
      ])
    );
  });
});
