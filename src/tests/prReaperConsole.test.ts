import {
  Box3,
  Mesh,
  MeshBasicMaterial,
  Object3D,
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
  PR_REAPER_PR_CIRCLE_POOL_SIZE,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_TO_EMITTER_STANDOFF,
  PR_REAPER_SCREEN_WIDTH,
} from '../scene/structures/prReaperInstallationContract';

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
    ).toHaveLength(0);
  });

  it('populates a stable pooled stream of exact circle meshes', () => {
    const build = createPrReaperInstallation({
      position: { x: 0, z: 0 },
      seed: 'pool-visible',
    });
    const root = build.group.getObjectByName('PrReaperPrCircleRoot');
    expect(root?.children).toHaveLength(PR_REAPER_PR_CIRCLE_POOL_SIZE);
    expect(build.getDebugState().poolCapacity).toBe(
      PR_REAPER_PR_CIRCLE_POOL_SIZE
    );

    const before = root?.children.slice() ?? [];
    for (let i = 0; i < 260; i += 1) {
      build.update({ elapsed: i / 30, delta: 1 / 30, emphasis: 0.4 });
    }
    expect(root?.children).toEqual(before);

    const debug = build.getDebugState().stream;
    const visible = (root?.children ?? []).filter((child) => child.visible);
    expect(visible).toHaveLength(debug.activeCandidateCount);
    visible.forEach((object, index) => {
      const mesh = object as Mesh;
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
        lifecycle: 'active',
      });
    });
    (root?.children ?? [])
      .slice(visible.length)
      .forEach((object) => expect(object.visible).toBe(false));
  });

  it('uses distinct red/green materials and exposes 3:1 stream batches', () => {
    const build = createPrReaperInstallation({
      position: { x: 0, z: 0 },
      seed: 'mixed-materials',
    });
    for (let i = 0; i < 900; i += 1) {
      build.update({ elapsed: i / 30, delta: 1 / 30, emphasis: 0 });
    }
    const debug = build.getDebugState().stream;
    expect(debug.totalSpawnedRed).toBeGreaterThan(0);
    expect(debug.totalSpawnedGreen).toBeGreaterThan(0);
    const completed = Math.floor(debug.spawnHistory.length / 4) * 4;
    expect(
      debug.spawnHistory.slice(0, completed).filter((t) => t === 'red')
    ).toHaveLength((completed / 4) * 3);

    const root = build.group.getObjectByName('PrReaperPrCircleRoot');
    const materials = new Map<string, unknown>();
    root?.children.forEach((object) => {
      if (object.visible)
        materials.set(String(object.userData.type), (object as Mesh).material);
    });
    expect(materials.get('red')).not.toBe(materials.get('green'));
  });

  it('preserves stream semantics while reducing circle geometry cost by detail level', () => {
    const states = Object.values(SCENE_DETAIL_POLICIES).map((detailPolicy) => {
      const build = createPrReaperInstallation({
        position: { x: 0, z: 0 },
        detailPolicy,
        seed: 'detail-invariant',
      });
      for (let i = 0; i < 360; i += 1) {
        build.update({ elapsed: i / 30, delta: 1 / 30, emphasis: 0.7 });
      }
      const circle = build.group.getObjectByName('PrReaperPrCircle-0') as Mesh;
      return {
        stream: build.getDebugState().stream,
        triangles: circle.geometry.index?.count ?? 0,
      };
    });
    states.forEach((state) => expect(state.stream).toEqual(states[0].stream));
    expect(states[0].triangles).toBeGreaterThan(states[2].triangles);
    expect(states[2].triangles).toBeGreaterThan(states[4].triangles);
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

  it('does not add dynamic point lights', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const lights: PointLight[] = [];
    build.group.traverse((object) => {
      if (object instanceof PointLight) lights.push(object);
    });
    expect(lights).toHaveLength(0);
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
    const circle = build.group.getObjectByName('PrReaperPrCircle-0') as Mesh;
    const circleDispose = vi.spyOn(circle.geometry, 'dispose');
    build.dispose();
    build.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(circleDispose).toHaveBeenCalledTimes(1);
  });
});
