import { describe, expect, it } from 'vitest';

import {
  dampPrReaperArmPose,
  getPrReaperParkedPose,
  solvePrReaperArmPose,
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

describe('PR Reaper two-axis arm kinematics', () => {
  it('solves center and corner targets within mechanical limits', () => {
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
    targets.forEach((target) => {
      const solution = solvePrReaperArmPose(target);
      expect(solution.yaw).toBeGreaterThanOrEqual(PR_REAPER_YAW_LIMITS.min);
      expect(solution.yaw).toBeLessThanOrEqual(PR_REAPER_YAW_LIMITS.max);
      expect(solution.pitch).toBeGreaterThanOrEqual(PR_REAPER_PITCH_LIMITS.min);
      expect(solution.pitch).toBeLessThanOrEqual(PR_REAPER_PITCH_LIMITS.max);
    });
  });

  it('accounts for nonzero root heading and clamps unreachable targets', () => {
    const target = {
      x: 0.2,
      y: PR_REAPER_SCREEN_BOTTOM_Y + 1,
      z: PR_REAPER_STREAM_Z,
    };
    expect(solvePrReaperArmPose(target, Math.PI / 6).yaw).not.toBeCloseTo(
      solvePrReaperArmPose(target, 0).yaw
    );
    const unreachable = solvePrReaperArmPose({
      x: 99,
      y: 99,
      z: PR_REAPER_STREAM_Z,
    });
    expect(unreachable.reachable).toBe(false);
    expect(unreachable.yaw).toBe(PR_REAPER_YAW_LIMITS.max);
  });

  it('damps two animated axes and returns the parked pose', () => {
    expect(getPrReaperParkedPose()).toEqual(PR_REAPER_PARKED_POSE);
    const next = dampPrReaperArmPose(
      { yaw: 0, pitch: 0 },
      { yaw: 1, pitch: -0.2 },
      0.1,
      12
    );
    expect(next.yaw).toBeGreaterThan(0);
    expect(next.yaw).toBeLessThan(1);
    expect(Object.keys(next).sort()).toEqual(['pitch', 'yaw']);
  });
});
