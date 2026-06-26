import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  computeAngularError,
  dampPrReaperArmPose,
  getPrReaperParkedPose,
  solvePrReaperArm,
  worldToInstallationLocal,
} from '../scene/structures/prReaperArmKinematics';
import {
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_STREAM_Z,
  PR_REAPER_YAW_LIMITS,
} from '../scene/structures/prReaperInstallationContract';

function expectFinitePose(target: Vector3) {
  const solution = solvePrReaperArm(target);
  expect(Number.isFinite(solution.yaw)).toBe(true);
  expect(Number.isFinite(solution.pitch)).toBe(true);
  expect(solution.yaw).toBeGreaterThanOrEqual(PR_REAPER_YAW_LIMITS.min);
  expect(solution.yaw).toBeLessThanOrEqual(PR_REAPER_YAW_LIMITS.max);
  expect(solution.pitch).toBeGreaterThanOrEqual(PR_REAPER_PITCH_LIMITS.min);
  expect(solution.pitch).toBeLessThanOrEqual(PR_REAPER_PITCH_LIMITS.max);
  return solution;
}

describe('PR Reaper arm kinematics', () => {
  it('solves center, corner, near-top, and near-bottom screen targets', () => {
    const yMin = PR_REAPER_SCREEN_BOTTOM_Y + 0.1;
    const yMax = PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT - 0.1;
    [
      new Vector3(0, (yMin + yMax) / 2, PR_REAPER_STREAM_Z),
      new Vector3(-PR_REAPER_SCREEN_WIDTH / 2, yMax, PR_REAPER_STREAM_Z),
      new Vector3(PR_REAPER_SCREEN_WIDTH / 2, yMax, PR_REAPER_STREAM_Z),
      new Vector3(-PR_REAPER_SCREEN_WIDTH / 2, yMin, PR_REAPER_STREAM_Z),
      new Vector3(PR_REAPER_SCREEN_WIDTH / 2, yMin, PR_REAPER_STREAM_Z),
    ].forEach((target) => expectFinitePose(target));
  });

  it('converts world targets for nonzero installation headings', () => {
    const local = new Vector3(0.2, 2, PR_REAPER_STREAM_Z);
    const position = new Vector3(3, 0, -2);
    const heading = Math.PI / 4;
    const world = local
      .clone()
      .applyAxisAngle(new Vector3(0, 1, 0), heading)
      .add(position);
    expect(
      worldToInstallationLocal(world, position, heading).distanceTo(local)
    ).toBeLessThan(1e-9);
  });

  it('reports clamping and unreachable out-of-range targets', () => {
    const solution = solvePrReaperArm(new Vector3(99, 99, PR_REAPER_STREAM_Z));
    expect(solution.reachable).toBe(false);
    expect(solution.error).toBeGreaterThan(0);
  });

  it('damps and exposes the parked two-axis pose', () => {
    expect(getPrReaperParkedPose()).toEqual(PR_REAPER_PARKED_POSE);
    const next = dampPrReaperArmPose(
      PR_REAPER_PARKED_POSE,
      { yaw: 1, pitch: 0.2 },
      0.1,
      12
    );
    expect(next.yaw).toBeGreaterThan(0);
    expect(next.yaw).toBeLessThan(1);
    expect(computeAngularError(next, { yaw: 1, pitch: 0.2 })).toBeLessThan(1);
    expect(Object.keys(next).sort()).toEqual(['pitch', 'yaw']);
  });
});
