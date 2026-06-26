import { describe, expect, it } from 'vitest';

import {
  dampPrReaperArmPose,
  getPrReaperAngularError,
  getPrReaperParkedPose,
  solvePrReaperArmAngles,
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

  it('accounts for nonzero root headings', () => {
    const target = targets[0];
    expect(solvePrReaperArmAngles(target, Math.PI * 0.25).yaw).not.toBeCloseTo(
      solvePrReaperArmAngles(target, 0).yaw,
      3
    );
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
