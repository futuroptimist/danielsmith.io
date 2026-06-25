import { Box3, Mesh, PointLight, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { SCENE_DETAIL_POLICIES } from '../scene/graphics/sceneDetailPolicy';
import { getPoiPhysicalMetadata } from '../scene/poi/physicalMetadata';
import { createPrReaperInstallation } from '../scene/structures/prReaperConsole';
import {
  PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT,
  PR_REAPER_INTENDED_BOUNDS,
  PR_REAPER_MIN_EMITTER_STANDOFF,
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_TOP_Y,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_YAW_LIMITS,
} from '../scene/structures/prReaperInstallationContract';

const names = (root: {
  traverse(callback: (object: { name: string }) => void): void;
}) => {
  const all: string[] = [];
  root.traverse((object) => all.push(object.name));
  return all;
};

function triangleCount(
  build: ReturnType<typeof createPrReaperInstallation>
): number {
  let total = 0;
  build.group.traverse((object) => {
    if (object instanceof Mesh) {
      const geometry = object.geometry;
      const position = geometry.getAttribute('position');
      total += geometry.index ? geometry.index.count / 3 : position.count / 3;
    }
  });
  return total;
}

describe('createPrReaperInstallation', () => {
  it('builds a bottom-center anchored unit-scale root with static semantic hierarchy', () => {
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

    expect(names(build.group)).toEqual(
      expect.arrayContaining([
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
      ])
    );
    expect(
      names(build.group).some((name) =>
        /Log|Ticker|Severity|Beacon|Walkway|Sweep|Intake/.test(name)
      )
    ).toBe(false);
  });

  it('uses exact 9:21 near-ceiling hologram dimensions with cove clearance', () => {
    expect(PR_REAPER_SCREEN_WIDTH / PR_REAPER_SCREEN_HEIGHT).toBeCloseTo(
      9 / 21,
      12
    );
    expect(PR_REAPER_SCREEN_HEIGHT).toBeGreaterThan(5);
    expect(PR_REAPER_SCREEN_TOP_Y).toBeLessThan(
      PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT
    );
    expect(
      PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT - PR_REAPER_SCREEN_TOP_Y
    ).toBeGreaterThanOrEqual(0.18);
    Object.values(PR_REAPER_INTENDED_BOUNDS).forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    });
  });

  it('parks exactly two animated joints and keeps the emitter half-height away', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const animated = names(build.group).filter((name) => {
      const object = build.group.getObjectByName(name);
      return object?.userData.animatedJoint;
    });
    expect(animated).toEqual(['PrReaperYawJoint', 'PrReaperPitchJoint']);
    expect(build.group.getObjectByName('PrReaperYawJoint')!.rotation.y).toBe(
      PR_REAPER_PARKED_POSE.yaw
    );
    expect(build.group.getObjectByName('PrReaperPitchJoint')!.rotation.x).toBe(
      PR_REAPER_PARKED_POSE.pitch
    );
    expect(PR_REAPER_YAW_LIMITS.min).toBeLessThan(PR_REAPER_YAW_LIMITS.max);
    expect(PR_REAPER_PITCH_LIMITS.min).toBeLessThan(PR_REAPER_PITCH_LIMITS.max);

    build.group.updateWorldMatrix(true, true);
    const emitter = build.group.getObjectByName('PrReaperLaserEmitter')!;
    const local = build.group.worldToLocal(
      emitter.getWorldPosition(new Vector3())
    );
    expect(Math.abs(local.z)).toBeGreaterThanOrEqual(
      PR_REAPER_MIN_EMITTER_STANDOFF
    );
  });

  it('creates conservative rotation-aware physical colliders and matching metadata', () => {
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
    const centerZ = (collider.minZ + collider.maxZ) / 2;
    expect(centerZ).not.toBeCloseTo(position.z, 4);

    const metadata = getPoiPhysicalMetadata('pr-reaper-backyard-console');
    expect(metadata?.intendedSceneBounds).toEqual(PR_REAPER_INTENDED_BOUNDS);
    expect(metadata?.anchor).toBe('bottom-center');
    expect(metadata?.clearances?.markerMinHeight).toBeGreaterThan(
      PR_REAPER_SCREEN_TOP_Y
    );
  });

  it('builds all detail levels with decreasing public-mode triangle totals', () => {
    const counts = Object.values(SCENE_DETAIL_POLICIES).map((detailPolicy) => {
      const build = createPrReaperInstallation({
        position: { x: 0, z: 0 },
        detailPolicy,
      });
      const box = new Box3().setFromObject(build.group);
      expect(Number.isFinite(box.min.x)).toBe(true);
      expect(build.group.userData.detailLevel).toBe(detailPolicy.level);
      return triangleCount(build);
    });
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[3]);
    expect(counts[3]).toBeGreaterThan(counts[4]);
  });

  it('starts with no point lights and hidden empty laser/particle effects', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const pointLights: PointLight[] = [];
    build.group.traverse((object) => {
      if (object instanceof PointLight) pointLights.push(object);
    });
    expect(pointLights).toHaveLength(0);
    expect(build.group.getObjectByName('PrReaperLaserCore')?.visible).toBe(
      false
    );
    expect(build.group.getObjectByName('PrReaperLaserGlow')?.visible).toBe(
      false
    );
    const particleRoot = build.group.getObjectByName('PrReaperParticleRoot');
    expect(particleRoot?.visible).toBe(false);
    expect(particleRoot?.children).toHaveLength(0);
  });

  it('disposes idempotently', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    build.dispose();
    build.dispose();
    expect(build.group.children).toHaveLength(0);
  });
});
