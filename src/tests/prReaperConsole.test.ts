import {
  Box3,
  BufferGeometry,
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
  PR_REAPER_PR_CIRCLE_POOL_CAPACITY,
  PR_REAPER_PR_CIRCLE_Z,
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

function circleRoot(build: ReturnType<typeof createPrReaperInstallation>) {
  return build.group.getObjectByName('PrReaperPrCircleRoot') as Object3D;
}

function circleMeshes(build: ReturnType<typeof createPrReaperInstallation>) {
  return circleRoot(build).children.filter(
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

  it('creates a fixed PR circle mesh pool with stable names and distinct red/green materials', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const circles = circleMeshes(build);

    expect(circles).toHaveLength(PR_REAPER_PR_CIRCLE_POOL_CAPACITY);
    expect(build.getDebugState().poolCapacity).toBe(
      PR_REAPER_PR_CIRCLE_POOL_CAPACITY
    );
    expect(circles.map((circle) => circle.name)).toEqual(
      Array.from(
        { length: PR_REAPER_PR_CIRCLE_POOL_CAPACITY },
        (_value, index) => `PrReaperPrCircle-${index}`
      )
    );
    expect(new Set(circles.map((circle) => circle.geometry)).size).toBe(1);
    expect(
      new Set(circles.map((circle) => circle.material)).size
    ).toBeGreaterThanOrEqual(2);
    expect(circles.every((circle) => !circle.visible)).toBe(true);
  });

  it('updates active pool meshes without allocating new circle meshes', () => {
    const build = createPrReaperInstallation({
      position: { x: 0, z: 0 },
      seed: 'pool-map',
    });
    const before = circleMeshes(build);

    for (let i = 0; i < 120; i += 1) {
      build.update({ elapsed: i / 10, delta: 0.1, emphasis: 0.35 });
    }

    const after = circleMeshes(build);
    expect(after).toEqual(before);
    expect(circleRoot(build).children).toHaveLength(
      PR_REAPER_PR_CIRCLE_POOL_CAPACITY
    );

    const debug = build.getDebugState();
    const activeMeshes = after.filter((circle) => circle.visible);
    expect(activeMeshes).toHaveLength(debug.activeCandidateCount);
    activeMeshes.forEach((circle, index) => {
      const candidate = debug.activeCandidates[index];
      expect(circle.userData.candidateId).toBe(candidate.id);
      expect(circle.userData.candidateType).toBe(candidate.type);
      expect(circle.userData.lifecycle).toBe(candidate.lifecycle);
      expect(circle.position.x).toBeCloseTo(candidate.center.x, 6);
      expect(circle.position.y).toBeCloseTo(candidate.center.y, 6);
      expect(circle.position.z).toBeCloseTo(PR_REAPER_PR_CIRCLE_Z, 6);
    });
    after.slice(activeMeshes.length).forEach((circle) => {
      expect(circle.visible).toBe(false);
    });
  });

  it('exposes three-red/one-green batch behavior through installation debug state', () => {
    const build = createPrReaperInstallation({
      position: { x: 0, z: 0 },
      seed: 'visible-ratio',
    });
    for (let i = 0; i < 50; i += 1) {
      build.update({ elapsed: i, delta: 0.5, emphasis: 0 });
    }
    const firstBatch = build.getDebugState().spawnLog.slice(0, 4);
    expect(firstBatch.filter((spawn) => spawn.type === 'red')).toHaveLength(3);
    expect(firstBatch.filter((spawn) => spawn.type === 'green')).toHaveLength(
      1
    );
  });

  it('preserves identical stream semantics across all detail levels for the same seed', () => {
    const states = Object.values(SCENE_DETAIL_POLICIES).map((detailPolicy) => {
      const build = createPrReaperInstallation({
        position: { x: 0, z: 0 },
        detailPolicy,
        seed: 'detail-independent',
      });
      for (let i = 0; i < 40; i += 1) {
        build.update({ elapsed: i * 0.16, delta: 0.16, emphasis: 0.5 });
      }
      const streamState = build.getDebugState();
      delete (streamState as Partial<typeof streamState>).detailLevel;
      return streamState;
    });

    states.slice(1).forEach((state) => {
      expect(state).toEqual(states[0]);
    });
  });

  it('reduces circle geometry cost for lower detail levels', () => {
    const cinematic = circleMeshes(
      createPrReaperInstallation({
        position: { x: 0, z: 0 },
        detailPolicy: SCENE_DETAIL_POLICIES.cinematic,
      })
    )[0].geometry as BufferGeometry;
    const micro = circleMeshes(
      createPrReaperInstallation({
        position: { x: 0, z: 0 },
        detailPolicy: SCENE_DETAIL_POLICIES.micro,
      })
    )[0].geometry as BufferGeometry;

    expect(cinematic.getAttribute('position').count).toBeGreaterThan(
      micro.getAttribute('position').count
    );
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
    const circleDispose = vi.spyOn(circleMeshes(build)[0].geometry, 'dispose');
    build.dispose();
    build.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(circleDispose).toHaveBeenCalled();
  });
});
