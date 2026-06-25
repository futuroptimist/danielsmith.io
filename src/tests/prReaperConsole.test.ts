import { Box3, Mesh, Object3D, PointLight, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { SCENE_DETAIL_POLICIES } from '../scene/graphics/sceneDetailPolicy';
import { getPoiPhysicalMetadata } from '../scene/poi/physicalMetadata';
import {
  createPrReaperInstallation,
  PR_REAPER_PARKED_POSE,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_TO_EMITTER_STANDOFF,
  PR_REAPER_SCREEN_WIDTH,
} from '../scene/structures/prReaperConsole';
import {
  PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT,
  PR_REAPER_COVE_CLEARANCE,
  PR_REAPER_INTENDED_BOUNDS,
  PR_REAPER_MIN_EMITTER_STANDOFF,
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_SCREEN_TOP_Y,
  PR_REAPER_YAW_LIMITS,
} from '../scene/structures/prReaperInstallationContract';

function countTriangles(root: Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    const position = geometry?.getAttribute('position');
    if (!position) return;
    triangles += geometry.index ? geometry.index.count / 3 : position.count / 3;
  });
  return triangles;
}

describe('createPrReaperInstallation', () => {
  it('builds a bottom-center anchored root with stable hierarchy', () => {
    const position = { x: 6.6, y: 0.25, z: 19.6 };
    const orientation = Math.PI * 0.35;
    const build = createPrReaperInstallation({
      position,
      orientationRadians: orientation,
    });

    expect(build.group.name).toBe('PrReaperInstallation');
    expect(build.group.position.toArray()).toEqual([
      position.x,
      position.y,
      position.z,
    ]);
    expect(build.group.rotation.y).toBe(orientation);
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    expect(build.group.userData.detailLevel).toBe('balanced');
    expect(build.group.userData.anchor).toBe('bottom-center');

    [
      'PrReaperProjectorBase',
      'PrReaperProjectorLens',
      'PrReaperHologramRoot',
      'PrReaperHologramScreen',
      'PrReaperHologramFrame-Top',
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
    ].forEach((name) =>
      expect(build.group.getObjectByName(name), name).toBeDefined()
    );

    expect(
      build.group.getObjectByName('PrReaperConsoleLogPanel')
    ).toBeUndefined();
    expect(
      build.group.getObjectByName('PrReaperConsoleLogTicker')
    ).toBeUndefined();
    expect(
      build.group.getObjectByName('PrReaperConsoleWalkway')
    ).toBeUndefined();
    expect(build.group.getObjectByName('PrReaperConsoleSweep')).toBeUndefined();
    build.dispose();
  });

  it('uses the shared 9:21 near-ceiling hologram and stand-off contract', () => {
    expect(PR_REAPER_SCREEN_WIDTH / PR_REAPER_SCREEN_HEIGHT).toBeCloseTo(
      9 / 21,
      10
    );
    expect(PR_REAPER_SCREEN_HEIGHT).toBeGreaterThanOrEqual(6 * 0.82);
    expect(PR_REAPER_SCREEN_TOP_Y).toBeLessThan(
      PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT
    );
    expect(
      PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT - PR_REAPER_SCREEN_TOP_Y
    ).toBeGreaterThanOrEqual(PR_REAPER_COVE_CLEARANCE);
    expect(PR_REAPER_SCREEN_TO_EMITTER_STANDOFF).toBeGreaterThanOrEqual(
      PR_REAPER_MIN_EMITTER_STANDOFF
    );

    Object.values(PR_REAPER_INTENDED_BOUNDS).forEach((dimension) => {
      expect(Number.isFinite(dimension)).toBe(true);
      expect(dimension).toBeGreaterThan(0);
    });
  });

  it('creates exactly two animated joints in the parked pose with legal limits', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const joints: string[] = [];
    build.group.traverse((object) => {
      if (object.userData.animatedJoint) joints.push(object.name);
    });
    expect(joints.sort()).toEqual(['PrReaperPitchJoint', 'PrReaperYawJoint']);
    expect(build.getDebugState().yaw).toBeCloseTo(PR_REAPER_PARKED_POSE.yaw);
    expect(build.getDebugState().pitch).toBeCloseTo(
      PR_REAPER_PARKED_POSE.pitch
    );
    expect(PR_REAPER_PARKED_POSE.yaw).toBeGreaterThanOrEqual(
      PR_REAPER_YAW_LIMITS.min
    );
    expect(PR_REAPER_PARKED_POSE.yaw).toBeLessThanOrEqual(
      PR_REAPER_YAW_LIMITS.max
    );
    expect(PR_REAPER_PARKED_POSE.pitch).toBeGreaterThanOrEqual(
      PR_REAPER_PITCH_LIMITS.min
    );
    expect(PR_REAPER_PARKED_POSE.pitch).toBeLessThanOrEqual(
      PR_REAPER_PITCH_LIMITS.max
    );
    build.dispose();
  });

  it('uses restrained transparent screen materials and starts future roots inactive', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const screen = build.group.getObjectByName(
      'PrReaperHologramScreen'
    ) as Mesh;
    expect(screen.material).toMatchObject({
      transparent: true,
      depthWrite: false,
    });
    expect(build.group.getObjectByName('PrReaperLaserCore')?.visible).toBe(
      false
    );
    expect(build.group.getObjectByName('PrReaperLaserGlow')?.visible).toBe(
      false
    );
    expect(
      build.group.getObjectByName('PrReaperPrCircleRoot')?.children
    ).toHaveLength(0);
    expect(
      build.group.getObjectByName('PrReaperParticleRoot')?.children
    ).toHaveLength(0);
    const lights: PointLight[] = [];
    build.group.traverse((object) => {
      if (object instanceof PointLight) lights.push(object);
    });
    expect(lights).toHaveLength(0);
    build.dispose();
  });

  it('returns a conservative rotated collider and matching physical metadata', () => {
    const position = { x: 1.5, y: 0, z: 0.525 };
    const orientation = Math.PI * 0.35;
    const build = createPrReaperInstallation({
      position,
      orientationRadians: orientation,
    });
    expect(build.colliders).toHaveLength(1);
    const collider = build.colliders[0];
    expect(collider.maxX - collider.minX).toBeGreaterThan(
      PR_REAPER_INTENDED_BOUNDS.width
    );
    expect(collider.maxZ - collider.minZ).toBeGreaterThan(
      PR_REAPER_INTENDED_BOUNDS.depth / 2
    );

    const metadata = getPoiPhysicalMetadata('pr-reaper-backyard-console');
    expect(metadata?.anchor).toBe('bottom-center');
    expect(metadata?.intendedSceneBounds).toEqual(PR_REAPER_INTENDED_BOUNDS);
    expect(metadata?.clearances?.markerMinHeight).toBeGreaterThan(
      PR_REAPER_SCREEN_TOP_Y
    );
    build.dispose();
  });

  it('builds all detail levels with decreasing public-mode triangle totals', () => {
    const totals = Object.values(SCENE_DETAIL_POLICIES).map((detailPolicy) => {
      const build = createPrReaperInstallation({
        position: { x: 0, z: 0 },
        detailPolicy,
      });
      const total = countTriangles(build.group);
      const box = new Box3().setFromObject(build.group);
      expect(total).toBeGreaterThan(0);
      expect(Number.isFinite(box.getSize(new Vector3()).length())).toBe(true);
      build.dispose();
      return [detailPolicy.level, total] as const;
    });
    const byLevel = Object.fromEntries(totals);
    expect(byLevel.cinematic).toBeGreaterThan(byLevel.balanced);
    expect(byLevel.balanced).toBeGreaterThan(byLevel.performance);
    expect(byLevel.performance).toBeGreaterThan(byLevel.low);
    expect(byLevel.low).toBeGreaterThanOrEqual(byLevel.micro);
  });

  it('disposes owned resources idempotently', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const mesh = build.group.getObjectByName('PrReaperHologramScreen') as Mesh;
    const dispose = vi.spyOn(mesh.geometry, 'dispose');
    build.dispose();
    build.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
