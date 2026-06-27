import { Box3, MathUtils, Mesh, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { SCENE_DETAIL_POLICIES } from '../scene/graphics/sceneDetailPolicy';
import { MINIATURE_POI_PROXY_REGISTRY } from '../scene/miniature/poiProxyRegistry';
import { getPoiPhysicalMetadata } from '../scene/poi/physicalMetadata';
import { createFlywheelShowpiece } from '../scene/structures/flywheel';
import {
  FLYWHEEL_BASE_COLLIDER,
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_BEARING_STAND,
  FLYWHEEL_CRANK_RAD_PER_SECOND,
  FLYWHEEL_EMPHASIS_SPEED_BOOST,
  FLYWHEEL_ENERGY_PORT,
  FLYWHEEL_GEARBOX,
  FLYWHEEL_GEARBOX_COLLIDER,
  FLYWHEEL_GEARBOX_LEFT_EDGE,
  FLYWHEEL_GEARBOX_OUTER_RADIUS,
  FLYWHEEL_MIN_WHEEL_GEAR_CLEARANCE,
  FLYWHEEL_OUTPUT_SHAFT,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_MARKER_MIN_HEIGHT,
  FLYWHEEL_TORQUE_RATIO,
  FLYWHEEL_WHEEL,
  FLYWHEEL_WHEEL_RIGHT_EDGE,
} from '../scene/structures/flywheelEnergyContract';

const roomBounds = { minX: -6, maxX: 6, minZ: -6, maxZ: 6 };

const coreNames = [
  'FlywheelBase',
  'FlywheelBearingYokeFront',
  'FlywheelBearingYokeBack',
  'FlywheelAxleCapFront',
  'FlywheelAxleCapBack',
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
  'FlywheelTorqueShaft',
  'FlywheelGearboxPedestal',
  'FlywheelRimMotionTick-0',
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
    const torqueShaft = build.group.getObjectByName(
      'FlywheelTorqueShaft'
    ) as Object3D;
    const wheel = build.group.getObjectByName('FlywheelWheelGroup') as Object3D;

    expect(MathUtils.euclideanModulo(axle.rotation.x, Math.PI * 2)).toBeCloseTo(
      Math.PI / 2
    );
    expect(output.position.z).toBeLessThan(0);
    expect(torqueShaft.position.x).toBeCloseTo(
      (FLYWHEEL_OUTPUT_SHAFT.startX + FLYWHEEL_OUTPUT_SHAFT.endX) / 2
    );
    expect(torqueShaft.position.z).toBeCloseTo(FLYWHEEL_OUTPUT_SHAFT.z);
    expect(
      Math.abs(torqueShaft.position.z - FLYWHEEL_WHEEL.centerZ)
    ).toBeGreaterThan(FLYWHEEL_WHEEL.thickness / 2);

    build.update({ elapsed: 1, delta: 0.25, emphasis: 0 });
    expect(wheel.rotation.z).toBeCloseTo(build.getDebugState().carrierAngle);
    expect(output.rotation.z).toBeCloseTo(build.getDebugState().carrierAngle);
    expect(torqueShaft.rotation.x).toBeCloseTo(
      build.getDebugState().carrierAngle
    );
    build.dispose();
  });

  it('separates the visible gearbox, crank, and wheel envelopes', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    const wheel = build.group.getObjectByName('FlywheelWheelGroup') as Object3D;
    const gearbox = build.group.getObjectByName(
      'FlywheelPlanetaryGearbox'
    ) as Object3D;
    const crank = build.group.getObjectByName('FlywheelCrankGroup') as Object3D;
    const wheelBox = new Box3().setFromObject(wheel);
    const gearboxBox = new Box3().setFromObject(gearbox);
    const crankBox = new Box3().setFromObject(crank);

    expect(gearboxBox.min.x - wheelBox.max.x).toBeGreaterThanOrEqual(
      FLYWHEEL_MIN_WHEEL_GEAR_CLEARANCE
    );
    expect(crankBox.min.x - wheelBox.max.x).toBeGreaterThanOrEqual(
      FLYWHEEL_MIN_WHEEL_GEAR_CLEARANCE
    );
    expect(gearbox.position.x).toBeGreaterThan(FLYWHEEL_WHEEL_RIGHT_EDGE);
    expect(gearbox.position.z - FLYWHEEL_WHEEL.centerZ).toBeGreaterThan(0.8);
    expect(gearboxBox.intersectsBox(wheelBox)).toBe(false);
    expect(crankBox.intersectsBox(wheelBox)).toBe(false);
    expect(gearboxBox.min.x).toBeGreaterThan(FLYWHEEL_GEARBOX_LEFT_EDGE);
    expect(FLYWHEEL_GEARBOX.centerZ).toBeGreaterThan(0);
    build.dispose();
  });

  it('keeps accent glow subordinate to the heavy physical rim', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    const wheel = build.group.getObjectByName('FlywheelWheelGroup') as Object3D;
    const rim = build.group.getObjectByName('FlywheelHeavyRim') as Object3D;
    const glow = build.group.getObjectByName(
      'FlywheelEnergyGlowRing'
    ) as Object3D;
    const wheelBox = new Box3().setFromObject(wheel);
    const rimBox = new Box3().setFromObject(rim);
    const glowBox = new Box3().setFromObject(glow);

    expect(glowBox.min.x).toBeGreaterThan(rimBox.min.x);
    expect(glowBox.max.x).toBeLessThan(rimBox.max.x);
    expect(glowBox.min.y).toBeGreaterThan(rimBox.min.y);
    expect(glowBox.max.y).toBeLessThan(rimBox.max.y);
    expect(glowBox.getSize(new Vector3()).length()).toBeLessThan(
      wheelBox.getSize(new Vector3()).length() * 0.82
    );
    build.dispose();
  });

  it('uses the rendered torque shaft to bridge the gearbox output and flywheel hub gap', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    const torqueShaft = build.group.getObjectByName(
      'FlywheelTorqueShaft'
    ) as Object3D;
    const shaftBox = new Box3().setFromObject(torqueShaft);

    expect(shaftBox.min.x).toBeLessThan(FLYWHEEL_WHEEL.centerX + 0.28);
    expect(shaftBox.max.x).toBeGreaterThan(
      FLYWHEEL_GEARBOX.centerX - FLYWHEEL_GEARBOX_OUTER_RADIUS
    );
    expect(shaftBox.min.z).toBeGreaterThan(
      FLYWHEEL_WHEEL.centerZ + FLYWHEEL_WHEEL.thickness / 2
    );
    expect(shaftBox.max.z).toBeLessThan(FLYWHEEL_GEARBOX.centerZ);
    build.dispose();
  });

  it('uses front/back bearing yokes without crossing the flywheel rim', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    const front = build.group.getObjectByName(
      'FlywheelBearingYokeFront'
    ) as Object3D;
    const back = build.group.getObjectByName(
      'FlywheelBearingYokeBack'
    ) as Object3D;
    expect(front.position.z).toBeGreaterThan(FLYWHEEL_WHEEL.centerZ);
    expect(back.position.z).toBeLessThan(FLYWHEEL_WHEEL.centerZ);
    for (const yoke of [front, back]) {
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

  it('keeps asymmetric wheel markers attached to visibly rotating wheel geometry', () => {
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
    expect(wheel.rotation.z).toBeGreaterThan(0.25);
    expect(after.distanceTo(before)).toBeGreaterThan(0.1);
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
      const packets = build.group.children.filter(
        (child) => child.name === 'FlywheelEnergyTransferPacket'
      );
      const packet = packets[0]!;
      const nodes = packet.children.filter((child) =>
        child.name.startsWith('FlywheelEnergyPacketNode')
      ) as Mesh[];
      const connectors = packet.children.filter((child) =>
        child.name.startsWith('FlywheelEnergyPacketConnector')
      ) as Mesh[];
      return {
        packetCount: packets.length,
        nodeUuids: nodes.map((node) => node.uuid),
        connectorUuids: connectors.map((connector) => connector.uuid),
        geometryUuids: [...nodes, ...connectors].map(
          (item) => item.geometry.uuid
        ),
        materialUuids: [...nodes, ...connectors].map((item) => {
          const material = item.material;
          return Array.isArray(material)
            ? material.map((entry) => entry.uuid).join('|')
            : material.uuid;
        }),
      };
    };

    const before = collectPacketState();
    expect(before.packetCount).toBe(1);
    expect(before.nodeUuids.length).toBeGreaterThanOrEqual(2);
    expect(before.connectorUuids.length).toBeGreaterThanOrEqual(1);

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
    const packet = build.group.getObjectByName('FlywheelEnergyTransferPacket')!;
    const maxVisibleNodeScale = () =>
      Math.max(
        ...packet.children
          .filter(
            (child) =>
              child.name.startsWith('FlywheelEnergyPacketNode') && child.visible
          )
          .map((child) => child.scale.x)
      );
    const incomingScale = maxVisibleNodeScale();

    for (const [index, delta] of [2.6, 2.8, 2.8, 2.8, 2.8].entries()) {
      build.update({
        elapsed: index + 1,
        delta,
        emphasis: 0,
        runDecorativeEffects: false,
      });
    }
    build.update({
      elapsed: 6,
      delta: 0.5,
      emphasis: 0,
      runDecorativeEffects: false,
    });

    const outgoing = build.getDebugState().energy;
    const outgoingTarget =
      outgoing.selectedTargetId === 'tokenplace-studio-cluster'
        ? { x: -2, y: 0.95, z: 1 }
        : { x: 3, y: 0.95, z: -1 };
    expect(outgoing.direction).toBe('outgoing');
    expect(outgoing.sourceWorldPosition).toEqual({
      x: FLYWHEEL_ENERGY_PORT.x,
      y: FLYWHEEL_ENERGY_PORT.y,
      z: FLYWHEEL_ENERGY_PORT.z,
    });
    expect(outgoing.destinationWorldPosition).toEqual(outgoingTarget);
    expect(
      outgoing.visibleWindowEnd! - outgoing.visibleWindowStart!
    ).toBeGreaterThan(
      incoming.visibleWindowEnd! - incoming.visibleWindowStart!
    );
    expect(outgoing.activeNodeCount).toBeGreaterThanOrEqual(
      incoming.activeNodeCount
    );
    expect(maxVisibleNodeScale()).toBeGreaterThan(incomingScale);
    build.dispose();
  });

  it('returns defensive copies for energy debug state', () => {
    const build = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds,
    });
    build.setEnergyTargets(
      [
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
      ],
      ['missing-visual-anchor:optional']
    );
    build.update({
      elapsed: 0,
      delta: 0.2,
      emphasis: 0,
      runDecorativeEffects: false,
    });

    const first = build.getDebugState().energy;
    first.missingTargetDiagnostics.push('mutated');
    first.sourceWorldPosition!.x = 999;
    first.destinationWorldPosition!.z = 999;
    first.sourceLocalPosition!.y = 999;
    first.destinationLocalPosition!.y = 999;

    const second = build.getDebugState().energy;
    expect(second.missingTargetDiagnostics).toEqual([
      'missing-visual-anchor:optional',
    ]);
    expect(second.sourceWorldPosition?.x).not.toBe(999);
    expect(second.destinationWorldPosition?.z).not.toBe(999);
    expect(second.sourceLocalPosition?.y).not.toBe(999);
    expect(second.destinationLocalPosition?.y).not.toBe(999);
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
        'flywheel-incoming-arc-hint',
        'flywheel-outgoing-arc-hint',
      ])
    );
  });
});
