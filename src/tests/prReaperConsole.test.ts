import { Mesh, PointLight } from 'three';
import { describe, expect, it } from 'vitest';

import {
  ORDERED_SCENE_DETAIL_LEVELS,
  getSceneDetailPolicy,
} from '../scene/graphics/sceneDetailPolicy';
import { createPrReaperInstallation } from '../scene/structures/prReaperConsole';
import * as C from '../scene/structures/prReaperInstallationContract';
import { countObjectTriangles } from '../scene/structures/triangleCount';

describe('createPrReaperInstallation', () => {
  it('anchors the static installation at the POI position with unit scale and detail metadata', () => {
    const build = createPrReaperInstallation({
      position: { x: 6.6, y: 0.2, z: 19.6 },
      orientationRadians: Math.PI * 0.35,
      detailPolicy: getSceneDetailPolicy('balanced'),
    });
    expect(build.group.name).toBe('PrReaperInstallation');
    expect(build.group.position.toArray()).toEqual([6.6, 0.2, 19.6]);
    expect(build.group.rotation.y).toBeCloseTo(Math.PI * 0.35);
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    expect(build.group.userData.activeDetailLevel).toBe('balanced');
    build.dispose();
  });

  it('creates the required semantic hierarchy without legacy console geometry', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    [
      'PrReaperProjectorBase',
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
    ].forEach((name) =>
      expect(build.group.getObjectByName(name), name).toBeDefined()
    );
    [
      'PrReaperConsoleScreen',
      'PrReaperConsoleLogPanel',
      'PrReaperConsoleLogTicker',
      'PrReaperConsoleWalkway',
      'PrReaperConsoleHologram',
    ].forEach((name) =>
      expect(build.group.getObjectByName(name), name).toBeUndefined()
    );
    build.dispose();
  });

  it('keeps the hologram at exact 9:21, near ceiling, and below the cove region', () => {
    expect(C.PR_REAPER_SCREEN_WIDTH / C.PR_REAPER_SCREEN_HEIGHT).toBeCloseTo(
      9 / 21,
      8
    );
    expect(C.PR_REAPER_SCREEN_HEIGHT).toBeGreaterThanOrEqual(6 * 0.82);
    expect(
      C.PR_REAPER_SCREEN_BOTTOM_Y + C.PR_REAPER_SCREEN_HEIGHT
    ).toBeLessThanOrEqual(C.PR_REAPER_SCREEN_TOP_MAX);
    expect(C.PR_REAPER_SCREEN_TO_EMITTER_STANDOFF).toBeGreaterThanOrEqual(
      C.PR_REAPER_MIN_EMITTER_STANDOFF
    );
    Object.values(C.PR_REAPER_INTENDED_BOUNDS).forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    });
  });

  it('parks exactly two animated joint groups and starts laser/particle roots inactive', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const joints: string[] = [];
    build.group.traverse((object) => {
      if (object.userData.animatedJointAxis) joints.push(object.name);
      expect(object).not.toBeInstanceOf(PointLight);
    });
    expect(joints.sort()).toEqual(['PrReaperPitchJoint', 'PrReaperYawJoint']);
    expect(
      build.group.getObjectByName('PrReaperYawJoint')!.rotation.y
    ).toBeCloseTo(C.PR_REAPER_PARKED_POSE.yaw);
    expect(
      build.group.getObjectByName('PrReaperPitchJoint')!.rotation.x
    ).toBeCloseTo(C.PR_REAPER_PARKED_POSE.pitch);
    expect(build.group.getObjectByName('PrReaperLaserCore')!.visible).toBe(
      false
    );
    expect(build.group.getObjectByName('PrReaperLaserGlow')!.visible).toBe(
      false
    );
    expect(
      build.group.getObjectByName('PrReaperParticleRoot')!.children
    ).toHaveLength(0);
    build.dispose();
  });

  it('returns conservative rotated floor colliders for only the projector and robot bases', () => {
    const build = createPrReaperInstallation({
      position: { x: 3, z: 4 },
      orientationRadians: Math.PI * 0.35,
    });
    expect(build.colliders).toHaveLength(2);
    build.colliders.forEach((collider) => {
      expect(collider.maxX).toBeGreaterThan(collider.minX);
      expect(collider.maxZ).toBeGreaterThan(collider.minZ);
    });
    build.dispose();
  });

  it('builds all detail levels with decreasing public-mode triangle totals', () => {
    const totals = ORDERED_SCENE_DETAIL_LEVELS.map((level) => {
      const build = createPrReaperInstallation({
        position: { x: 0, z: 0 },
        detailPolicy: getSceneDetailPolicy(level),
      });
      const triangles = countObjectTriangles(build.group);
      expect(triangles).toBeGreaterThan(0);
      build.dispose();
      return triangles;
    });
    expect(totals[0]).toBeGreaterThan(totals[1]);
    expect(totals[1]).toBeGreaterThan(totals[2]);
    for (let index = 1; index < totals.length; index += 1) {
      expect(totals[index]).toBeLessThanOrEqual(totals[index - 1]);
    }
  });

  it('updates emphasis only and disposes idempotently', () => {
    const build = createPrReaperInstallation({ position: { x: 0, z: 0 } });
    const screen = build.group.getObjectByName(
      'PrReaperHologramScreen'
    ) as Mesh;
    build.update({ elapsed: 1, delta: 0.016, emphasis: 1 });
    expect(screen.material).toBeDefined();
    expect(() => build.dispose()).not.toThrow();
    expect(() => build.dispose()).not.toThrow();
  });
});
