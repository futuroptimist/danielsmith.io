import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  dampPrReaperArmPose,
  getPrReaperAngularError,
  getPrReaperParkedPose,
  solvePrReaperArmAngles,
} from '../scene/structures/prReaperArmKinematics';
import { createPrReaperInstallation } from '../scene/structures/prReaperConsole';
import {
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_STREAM_Z,
  PR_REAPER_YAW_LIMITS,
} from '../scene/structures/prReaperInstallationContract';

const WORLD_Y_AXIS = new Vector3(0, 1, 0);

const targets = [
  {
    x: 0,
    y: PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT / 2,
    z: PR_REAPER_STREAM_Z,
  },
  {
    x: -PR_REAPER_SCREEN_WIDTH / 2,
    y: PR_REAPER_SCREEN_BOTTOM_Y,
    z: PR_REAPER_STREAM_Z,
  },
  {
    x: PR_REAPER_SCREEN_WIDTH / 2,
    y: PR_REAPER_SCREEN_BOTTOM_Y,
    z: PR_REAPER_STREAM_Z,
  },
  {
    x: -PR_REAPER_SCREEN_WIDTH / 2,
    y: PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT,
    z: PR_REAPER_STREAM_Z,
  },
  {
    x: PR_REAPER_SCREEN_WIDTH / 2,
    y: PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT,
    z: PR_REAPER_STREAM_Z,
  },
];

function expectSolvedBarrelPointsAtTarget(
  target: { x: number; y: number; z: number },
  rootHeading = 0
): void {
  const build = createPrReaperInstallation({
    position: { x: 0, z: 0 },
    orientationRadians: rootHeading,
    seed: 'kinematics-contract',
  });
  const solution = solvePrReaperArmAngles(target);
  const yaw = build.group.getObjectByName('PrReaperYawJoint')!;
  const pitch = build.group.getObjectByName('PrReaperPitchJoint')!;
  const aperture = build.group.getObjectByName('PrReaperLaserAperture')!;
  const muzzleForward = build.group.getObjectByName(
    'PrReaperLaserMuzzleForward'
  )!;
  yaw.rotation.y = solution.yaw;
  pitch.rotation.x = solution.pitch;
  build.group.updateWorldMatrix(true, true);

  const targetWorld = new Vector3(target.x, target.y, target.z).applyAxisAngle(
    WORLD_Y_AXIS,
    rootHeading
  );
  const apertureWorld = new Vector3();
  const muzzleWorld = new Vector3();
  aperture.getWorldPosition(apertureWorld);
  muzzleForward.getWorldPosition(muzzleWorld);
  const toTarget = targetWorld.sub(apertureWorld).normalize();
  const barrelForward = muzzleWorld.sub(apertureWorld).normalize();
  expect(barrelForward.angleTo(toTarget)).toBeLessThan(0.015);
  build.dispose();
}

describe('PR Reaper arm kinematics', () => {
  it('solves finite clamped poses for center and corners', () => {
    targets.forEach((target) => {
      const solution = solvePrReaperArmAngles(target);
      expect(Number.isFinite(solution.yaw)).toBe(true);
      expect(Number.isFinite(solution.pitch)).toBe(true);
      expect(solution.yaw).toBeGreaterThanOrEqual(PR_REAPER_YAW_LIMITS.min);
      expect(solution.yaw).toBeLessThanOrEqual(PR_REAPER_YAW_LIMITS.max);
      expect(solution.pitch).toBeGreaterThanOrEqual(PR_REAPER_PITCH_LIMITS.min);
      expect(solution.pitch).toBeLessThanOrEqual(PR_REAPER_PITCH_LIMITS.max);
    });
  });

  it('uses Three.js yaw sign conventions for positive and negative local X targets', () => {
    const y = PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT / 2;
    expect(
      solvePrReaperArmAngles({ x: 0.4, y, z: PR_REAPER_STREAM_Z }).yaw
    ).toBeLessThan(0);
    expect(
      solvePrReaperArmAngles({ x: -0.4, y, z: PR_REAPER_STREAM_Z }).yaw
    ).toBeGreaterThan(0);
  });

  it('points the actual aperture forward anchor at screen targets', () => {
    targets.forEach((target) => expectSolvedBarrelPointsAtTarget(target));
  });

  it('accounts for the pitch-joint local offset before solving pitch', () => {
    const target = {
      x: 0,
      y: PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT,
      z: PR_REAPER_STREAM_Z,
    };
    const solution = solvePrReaperArmAngles(target);
    expect(solution.pitch).toBeGreaterThan(0);
    expectSolvedBarrelPointsAtTarget(target);
  });

  it('accounts for nonzero root headings', () => {
    const target = targets[0];
    expect(solvePrReaperArmAngles(target, Math.PI * 0.25).yaw).not.toBeCloseTo(
      solvePrReaperArmAngles(target, 0).yaw,
      3
    );
    expectSolvedBarrelPointsAtTarget(target, Math.PI * 0.25);
  });

  it('reports clamped unreachable targets', () => {
    const solution = solvePrReaperArmAngles({ x: 99, y: 99, z: 99 });
    expect(solution.reachable).toBe(false);
    expect(solution.yawClamped || solution.pitchClamped).toBe(true);
  });

  it('damps toward target and exposes angular error', () => {
    const next = dampPrReaperArmPose(
      { yaw: 0, pitch: 0 },
      { yaw: 1, pitch: 0.5 },
      12,
      0.1
    );
    expect(next.yaw).toBeGreaterThan(0);
    expect(next.yaw).toBeLessThan(1);
    expect(getPrReaperAngularError(next, { yaw: 1, pitch: 0.5 })).toBeLessThan(
      getPrReaperAngularError({ yaw: 0, pitch: 0 }, { yaw: 1, pitch: 0.5 })
    );
  });

  it('returns the parked two-axis pose', () => {
    expect(getPrReaperParkedPose()).toEqual(PR_REAPER_PARKED_POSE);
  });
});
