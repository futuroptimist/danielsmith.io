import { readFileSync } from 'node:fs';

import {
  Box3,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  PointsMaterial,
  PointLight,
  Vector3,
} from 'three';
import { describe, expect, it, vi } from 'vitest';

import { SCENE_DETAIL_POLICIES } from '../scene/graphics/sceneDetailPolicy';
import { getPoiPhysicalMetadata } from '../scene/poi/physicalMetadata';
import { getPoiDefinitions } from '../scene/poi/registry';
import {
  createPrReaperInstallation,
  PR_REAPER_INTENDED_BOUNDS,
} from '../scene/structures/prReaperConsole';
import {
  PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT,
  PR_REAPER_FOOTPRINT_DEPTH,
  PR_REAPER_FOOTPRINT_WIDTH,
  PR_REAPER_MIN_EMITTER_STANDOFF,
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PR_CIRCLE_POOL_CAPACITY,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_TO_EMITTER_STANDOFF,
  PR_REAPER_SCREEN_WIDTH,
} from '../scene/structures/prReaperInstallationContract';
import * as animationPreferences from '../ui/accessibility/animationPreferences';

function names(root: Object3D): string[] {
  const found: string[] = [];
  root.traverse((object) => found.push(object.name));
  return found;
}

function triangleCount(root: Object3D): number {
  let total = 0;
  root.traverse((object) => {
    if (object instanceof Mesh) {
      const geometry = object.geometry;
      const position = geometry.getAttribute('position');
      total += geometry.index
        ? geometry.index.count / 3
        : (position?.count ?? 0) / 3;
    }
  });
  return total;
}

function expectVectorCloseTo(
  actual: { x: number; y: number; z: number },
  expected: { x: number; y: number; z: number },
  precision = 5
): void {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
  expect(actual.z).toBeCloseTo(expected.z, precision);
}

function updateUntilLaserFires(
  build: ReturnType<typeof createPrReaperInstallation>
) {
  let fired = null as ReturnType<typeof build.getDebugState> | null;
  for (let i = 0; i < 240 && !fired?.laserActive; i += 1) {
    build.update({ elapsed: i / 20, delta: 0.05, emphasis: 0 });
    const debug = build.getDebugState();
    if (debug.laserActive) fired = debug;
  }
  expect(fired).not.toBeNull();
  return fired!;
}

function getCirclePool(root: Object3D): Mesh[] {
  const circleRoot = root.getObjectByName('PrReaperPrCircleRoot');
  expect(circleRoot).toBeDefined();
  return circleRoot!.children.filter(
    (child): child is Mesh => child instanceof Mesh
  );
}

describe('createPrReaperInstallation', () => {
  it('anchors the installation at the POI bottom center with unit scale and active detail', () => {
    const build = createPrReaperInstallation({
      position: { x: 6.6, y: 0.2, z: 19.6 },
      orientationRadians: Math.PI * 0.35,
      detailPolicy: SCENE_DETAIL_POLICIES.performance,
    });

    expect(build.group.name).toBe('PrReaperInstallation');
    expect(build.group.position.toArray()).toEqual([6.6, 0.2, 19.6]);
    expect(build.group.rotation.y).toBeCloseTo(Math.PI * 0.35, 6);
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    expect(build.group.userData).toMatchObject({
      anchor: 'bottom-center',
      detailLevel: 'performance',
    });
  });

  it('builds the new semantic hierarchy and removes old console/log/ticker elements', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const hierarchy = names(build.group);

    [
      'PrReaperProjectorBase',
      'PrReaperProjectorLens',
      'PrReaperHologramRoot',
      'PrReaperHologramScreen',
      'PrReaperPrCircleRoot',
      'PrReaperRobotBase',
      'PrReaperYawJoint',
      'PrReaperPitchJoint',
      'PrReaperArmLink',
      'PrReaperToolFlange',
      'PrReaperLaserEmitter',
      'PrReaperLaserMuzzleForward',
      'PrReaperLaserCore',
      'PrReaperLaserGlow',
      'PrReaperParticleRoot',
    ].forEach((name) => expect(hierarchy).toContain(name));

    [
      'PrReaperConsoleLogPanel',
      'PrReaperConsoleLogTicker',
      'PrReaperConsoleWalkway',
      'PrReaperConsoleSweep',
      'PrReaperConsoleIntake',
      'PrReaperConsoleHologram',
    ].forEach((name) => expect(hierarchy).not.toContain(name));
  });

  it('uses a near-ceiling translucent 9:21 hologram with safe top clearance', () => {
    const screenTop = PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT;
    expect(PR_REAPER_SCREEN_WIDTH / PR_REAPER_SCREEN_HEIGHT).toBeCloseTo(
      9 / 21,
      12
    );
    expect(PR_REAPER_SCREEN_HEIGHT).toBeGreaterThanOrEqual(6 * 0.82);
    expect(screenTop).toBeLessThan(PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT);
    expect(PR_REAPER_SCREEN_TO_EMITTER_STANDOFF).toBeGreaterThanOrEqual(
      PR_REAPER_MIN_EMITTER_STANDOFF
    );

    const allDimensions = [
      PR_REAPER_SCREEN_WIDTH,
      PR_REAPER_SCREEN_HEIGHT,
      PR_REAPER_FOOTPRINT_WIDTH,
      PR_REAPER_FOOTPRINT_DEPTH,
      PR_REAPER_INTENDED_BOUNDS.height,
    ];
    allDimensions.forEach((dimension) => {
      expect(Number.isFinite(dimension)).toBe(true);
      expect(dimension).toBeGreaterThan(0);
    });

    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const screen = build.group.getObjectByName(
      'PrReaperHologramScreen'
    ) as Mesh;
    const material = screen.material as MeshBasicMaterial;
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(screen.renderOrder).toBeGreaterThan(0);
    expect(material.map).toBeNull();
  });

  it('parks exactly two animated joint groups and leaves laser/particle roots hidden or empty', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const joints: Object3D[] = [];
    build.group.traverse((object) => {
      if (object.userData.animatedJoint) joints.push(object);
    });

    expect(joints.map((joint) => joint.name).sort()).toEqual([
      'PrReaperPitchJoint',
      'PrReaperYawJoint',
    ]);
    expect(build.group.getObjectByName('PrReaperYawJoint')?.rotation.y).toBe(
      PR_REAPER_PARKED_POSE.yaw
    );
    expect(build.group.getObjectByName('PrReaperPitchJoint')?.rotation.x).toBe(
      PR_REAPER_PARKED_POSE.pitch
    );
    expect(build.group.getObjectByName('PrReaperLaserCore')?.visible).toBe(
      false
    );
    expect(build.group.getObjectByName('PrReaperLaserGlow')?.visible).toBe(
      false
    );
    expect(
      build.group.getObjectByName('PrReaperParticleRoot')?.children
    ).toHaveLength(4);
    expect(
      build.group
        .getObjectByName('PrReaperParticleRoot')
        ?.children.every((child) => !child.visible)
    ).toBe(true);

    const gun = build.group.getObjectByName('PrReaperLaserGunHousing') as Mesh;
    const flange = build.group.getObjectByName(
      'PrReaperToolFlangeHousing'
    ) as Mesh;
    const aperture = build.group.getObjectByName(
      'PrReaperLaserAperture'
    ) as Mesh;
    const gunMaterial = gun.material as MeshBasicMaterial;
    const flangeMaterial = flange.material as MeshBasicMaterial;
    const apertureMaterial = aperture.material as MeshBasicMaterial;

    expect(gunMaterial).toBeInstanceOf(MeshBasicMaterial);
    expect(flangeMaterial).toBe(gunMaterial);
    expect(gunMaterial.color.getHex()).toBe(0x5b676d);
    expect(flangeMaterial.color.getHex()).toBe(0x5b676d);
    expect(apertureMaterial.color.getHex()).toBe(0x4dff8f);
  });

  it('creates a fixed PR circle mesh pool and keeps it stable during updates', () => {
    const build = createPrReaperInstallation({
      position: { x: 0, z: 0 },
      seed: 'pool-seed',
    });
    const pool = getCirclePool(build.group);
    expect(pool).toHaveLength(PR_REAPER_PR_CIRCLE_POOL_CAPACITY);
    expect(build.getDebugState().poolCapacity).toBe(
      PR_REAPER_PR_CIRCLE_POOL_CAPACITY
    );
    expect(pool.every((mesh) => mesh.visible === false)).toBe(true);

    for (let i = 0; i < 120; i += 1) {
      build.update({ elapsed: i / 10, delta: 0.1, emphasis: 0 });
    }

    const afterPool = getCirclePool(build.group);
    expect(afterPool).toHaveLength(PR_REAPER_PR_CIRCLE_POOL_CAPACITY);
    expect(afterPool).toEqual(pool);

    const debug = build.getDebugState();
    const activeMeshes = pool.filter((mesh) => mesh.visible);
    expect(activeMeshes).toHaveLength(debug.activeCandidateCount);
    activeMeshes.forEach((mesh, index) => {
      const candidate = debug.activeCandidates[index];
      expect(mesh.name).toBe(`PrReaperPrCircle-${index}`);
      expect(mesh.position.toArray()).toEqual([
        candidate.center.x,
        candidate.center.y,
        candidate.center.z,
      ]);
      expect(mesh.userData).toMatchObject({
        candidateId: candidate.id,
        type: candidate.type,
        lifecycle: candidate.lifecycle,
      });
    });
    pool
      .filter((mesh) => !mesh.visible)
      .forEach((mesh) => {
        expect(mesh.userData.lifecycle).toBe('inactive');
      });
  });

  it('uses distinct red and green circle materials and exposes batch behavior', () => {
    const build = createPrReaperInstallation({
      position: { x: 0, z: 0 },
      seed: 'batch-seed',
    });
    for (let i = 0; i < 80; i += 1) {
      build.update({ elapsed: i / 10, delta: 0.1, emphasis: 0 });
    }
    const debug = build.getDebugState();
    const firstBatch = debug.spawnHistory.slice(0, 4);
    expect(firstBatch.filter((entry) => entry.type === 'red')).toHaveLength(3);
    expect(firstBatch.filter((entry) => entry.type === 'green')).toHaveLength(
      1
    );
    const visible = getCirclePool(build.group).filter((mesh) => mesh.visible);
    const red = visible.find((mesh) => mesh.userData.type === 'red');
    const greenCircle = visible.find((mesh) => mesh.userData.type === 'green');
    expect(red?.material).toBeDefined();
    expect(greenCircle?.material).toBeDefined();
    expect(red?.material).not.toBe(greenCircle?.material);
  });

  it('preserves stream semantics while reducing circle geometry across detail levels', () => {
    const debugStates = SCENE_DETAIL_POLICIES
      ? Object.values(SCENE_DETAIL_POLICIES).map((detailPolicy) => {
          const build = createPrReaperInstallation({
            position: { x: 0, z: 0 },
            detailPolicy,
            seed: 'detail-seed',
          });
          for (let i = 0; i < 100; i += 1) {
            build.update({ elapsed: i / 10, delta: 0.1, emphasis: 0.5 });
          }
          const firstCircle = getCirclePool(build.group)[0];
          return {
            debug: build.getDebugState().stream,
            vertices: firstCircle.geometry.getAttribute('position').count,
          };
        })
      : [];

    const baseline = debugStates[0].debug;
    debugStates.forEach(({ debug }) => expect(debug).toEqual(baseline));
    for (let i = 1; i < debugStates.length; i += 1) {
      expect(debugStates[i].vertices).toBeLessThanOrEqual(
        debugStates[i - 1].vertices
      );
    }
  });

  it('returns rotation-aware conservative colliders that match physical metadata bounds', () => {
    const position = { x: 1.5, y: 0, z: 0.525 };
    const orientation = Math.PI * 0.35;
    const build = createPrReaperInstallation({
      position,
      orientationRadians: orientation,
    });
    expect(build.colliders).toHaveLength(1);
    const collider = build.colliders[0];
    expect(collider.maxX - collider.minX).toBeGreaterThan(
      PR_REAPER_FOOTPRINT_WIDTH
    );
    expect(collider.maxZ - collider.minZ).toBeGreaterThan(
      PR_REAPER_FOOTPRINT_DEPTH
    );

    const metadata = getPoiPhysicalMetadata('pr-reaper-backyard-console');
    expect(metadata?.intendedSceneBounds).toEqual(PR_REAPER_INTENDED_BOUNDS);
    expect(metadata?.anchor).toBe('bottom-center');
    expect(metadata?.clearances?.markerMinHeight).toBeGreaterThan(
      PR_REAPER_INTENDED_BOUNDS.height
    );
    const placedFootprint = getPoiDefinitions().find(
      (poi) => poi.id === 'pr-reaper-backyard-console'
    )?.footprint;
    expect(placedFootprint?.width).toBeCloseTo(PR_REAPER_FOOTPRINT_WIDTH, 6);
    expect(placedFootprint?.depth).toBeCloseTo(PR_REAPER_FOOTPRINT_DEPTH, 6);
  });

  it('constructs all five detail levels with finite descending public-mode triangle counts', () => {
    const counts = Object.values(SCENE_DETAIL_POLICIES).map((detailPolicy) => {
      const build = createPrReaperInstallation({
        position: { x: 0, z: 0 },
        detailPolicy,
      });
      const box = new Box3().setFromObject(build.group);
      expect(box.isEmpty()).toBe(false);
      expect(Number.isFinite(box.getSize(new Vector3()).length())).toBe(true);
      return triangleCount(build.group);
    });

    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[3]);
    expect(counts[3]).toBeGreaterThan(counts[4]);
  });

  it('targets red circles from the aperture with aligned beam and local burst origins', () => {
    const build = createPrReaperInstallation({
      position: { x: 1.25, y: 0.1, z: -0.75 },
      orientationRadians: Math.PI * 0.18,
      seed: 'fire-seed',
    });
    const yaw = build.group.getObjectByName('PrReaperYawJoint')!;
    const pitch = build.group.getObjectByName('PrReaperPitchJoint')!;
    const core = build.group.getObjectByName('PrReaperLaserCore')!;
    const aperture = build.group.getObjectByName('PrReaperLaserAperture')!;
    expect(core.visible).toBe(false);

    const fired = updateUntilLaserFires(build);

    expect(
      Math.abs(yaw.rotation.y) + Math.abs(pitch.rotation.x)
    ).toBeGreaterThan(0);
    expect(fired.lastLaserWorldStart).not.toBeNull();
    expect(fired.lastLaserWorldEnd).not.toBeNull();
    build.group.updateWorldMatrix(true, true);
    const apertureWorld = new Vector3();
    aperture.getWorldPosition(apertureWorld);
    expectVectorCloseTo(fired.lastLaserWorldStart!, apertureWorld, 5);

    const beamStart = core.localToWorld(new Vector3(0, -0.5, 0));
    const beamEnd = core.localToWorld(new Vector3(0, 0.5, 0));
    expectVectorCloseTo(beamStart, fired.lastLaserWorldStart!, 5);
    expectVectorCloseTo(beamEnd, fired.lastLaserWorldEnd!, 5);

    const toTarget = new Vector3(
      fired.lastLaserWorldEnd!.x - fired.lastLaserWorldStart!.x,
      fired.lastLaserWorldEnd!.y - fired.lastLaserWorldStart!.y,
      fired.lastLaserWorldEnd!.z - fired.lastLaserWorldStart!.z
    ).normalize();
    const muzzleForward = build.group.getObjectByName(
      'PrReaperLaserMuzzleForward'
    )!;
    const muzzleWorld = new Vector3();
    muzzleForward.getWorldPosition(muzzleWorld);
    const barrelForward = muzzleWorld.sub(apertureWorld).normalize();
    expect(barrelForward.angleTo(toTarget)).toBeLessThan(0.015);

    expect(fired.totalReapedRed).toBeGreaterThan(0);
    expect(fired.activeBurstCount).toBeGreaterThan(0);
    expect(fired.burstPoolCapacity).toBe(4);
    expectVectorCloseTo(
      fired.activeBurstWorldOrigins[0],
      fired.lastLaserWorldEnd!,
      5
    );
    expect(fired.activeBurstLocalOrigins[0].x).not.toBeCloseTo(
      fired.lastLaserWorldEnd!.x,
      5
    );
    fired.activeBurstDurations.forEach((duration) => {
      expect(duration).toBeGreaterThanOrEqual(0.25);
      expect(duration).toBeLessThanOrEqual(0.5);
    });
  });

  it('keeps the arm as a pure two-axis hierarchy without hidden lookAt helpers', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const animatedJoints: string[] = [];
    build.group.traverse((object) => {
      if (object.userData.animatedJoint) animatedJoints.push(object.name);
      expect(object.name.toLowerCase()).not.toContain('correction');
      expect(object.name.toLowerCase()).not.toContain('target');
      expect(object.name.toLowerCase()).not.toContain('elbow');
      expect(object.name.toLowerCase()).not.toContain('wrist');
    });
    expect(animatedJoints.sort()).toEqual([
      'PrReaperPitchJoint',
      'PrReaperYawJoint',
    ]);

    const source = readFileSync(
      'src/scene/structures/prReaperConsole.ts',
      'utf8'
    );
    expect(source).not.toContain('.lookAt(');
  });

  it('does not add dynamic point lights', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const lights: PointLight[] = [];
    build.group.traverse((object) => {
      if (object instanceof PointLight) lights.push(object);
    });
    expect(lights).toHaveLength(0);
  });

  it('keeps reduced pulse and flicker accessible without changing stream semantics', () => {
    const pulse = vi.spyOn(animationPreferences, 'getPulseScale');
    const flicker = vi.spyOn(animationPreferences, 'getFlickerScale');
    const scenarios = [
      { pulse: 1, flicker: 1 },
      { pulse: 0, flicker: 1 },
      { pulse: 1, flicker: 0 },
      { pulse: 0, flicker: 0 },
    ];
    const states = scenarios.map((scenario) => {
      pulse.mockReturnValue(scenario.pulse);
      flicker.mockReturnValue(scenario.flicker);
      const build = createPrReaperInstallation({
        position: { x: 0, z: 0 },
        seed: 'accessibility-semantic-seed',
      });
      const fired = updateUntilLaserFires(build);
      expect(fired.totalReapedRed).toBeGreaterThan(0);
      expect(fired.attemptedGreenReapCount).toBe(0);
      expect(fired.laserActive).toBe(true);
      expect(fired.activeBurstCount).toBeGreaterThan(0);
      const glow = build.group.getObjectByName('PrReaperLaserGlow') as Mesh;
      const glowOpacity = (glow.material as MeshBasicMaterial).opacity;
      const burstRoot = build.group.getObjectByName('PrReaperParticleRoot')!;
      const activeBurst = burstRoot.children.find((child) => child.visible) as
        | Points<BufferGeometry, PointsMaterial>
        | undefined;
      expect(activeBurst).toBeDefined();
      const particleOpacity = activeBurst!.material.opacity;
      build.dispose();
      return { stream: fired.stream, glowOpacity, particleOpacity };
    });

    const baseline = states[0].stream;
    states.forEach(({ stream }) => expect(stream).toEqual(baseline));
    expect(states[2].glowOpacity).toBe(0);
    expect(states[3].glowOpacity).toBe(0);
    expect(states[2].particleOpacity).toBeLessThan(states[0].particleOpacity);
    expect(states[3].particleOpacity).toBeLessThan(states[0].particleOpacity);
    pulse.mockRestore();
    flicker.mockRestore();
  });

  it('provides restrained update behavior and idempotent disposal', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const screen = build.group.getObjectByName(
      'PrReaperHologramScreen'
    ) as Mesh;
    const material = screen.material as MeshBasicMaterial;
    const before = material.opacity;
    build.update({ elapsed: 1, delta: 0.016, emphasis: 0.8 });
    expect(material.opacity).toBeGreaterThan(before);

    const dispose = vi.spyOn(screen.geometry, 'dispose');
    const circle = getCirclePool(build.group)[0];
    const circleDispose = vi.spyOn(circle.geometry, 'dispose');
    const particleRoot = build.group.getObjectByName('PrReaperParticleRoot')!;
    const particleDisposals = particleRoot.children.map((child) => {
      expect(child).toBeInstanceOf(Points);
      const points = child as Points<BufferGeometry, PointsMaterial>;
      return {
        geometry: vi.spyOn(points.geometry, 'dispose'),
        material: vi.spyOn(points.material, 'dispose'),
      };
    });

    build.dispose();
    build.dispose();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(circleDispose).toHaveBeenCalledTimes(1);
    particleDisposals.forEach(({ geometry, material }) => {
      expect(geometry).toHaveBeenCalledTimes(1);
      expect(material).toHaveBeenCalledTimes(1);
    });
  });

  it('disposes both shared PR circle materials before any stream update', () => {
    const materialDispose = vi.spyOn(MeshBasicMaterial.prototype, 'dispose');
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });

    build.dispose();

    expect(materialDispose).toHaveBeenCalledTimes(8);
    materialDispose.mockRestore();
  });
});
