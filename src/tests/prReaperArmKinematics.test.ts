import { describe, expect, it } from 'vitest';

import {
  dampPrReaperArmPose,
  getPrReaperAngularError,
  getPrReaperParkedPose,
  PR_REAPER_ANIMATED_AXES,
  solvePrReaperArmAngles,
} from '../scene/structures/prReaperArmKinematics';
import {
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_YAW_LIMITS,
} from '../scene/structures/prReaperInstallationContract';

const targets = [
  {
    x: 0,
    y: PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT / 2,
    z: 0.018,
  },
  { x: -PR_REAPER_SCREEN_WIDTH / 2, y: PR_REAPER_SCREEN_BOTTOM_Y, z: 0.018 },
  { x: PR_REAPER_SCREEN_WIDTH / 2, y: PR_REAPER_SCREEN_BOTTOM_Y, z: 0.018 },
  {
    x: -PR_REAPER_SCREEN_WIDTH / 2,
    y: PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT,
    z: 0.018,
  },
  {
    x: PR_REAPER_SCREEN_WIDTH / 2,
    y: PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT,
    z: 0.018,
  },
];

describe('PR Reaper arm kinematics', () => {
  it('solves finite clamped poses for center and corner targets', () => {
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

  it('accounts for nonzero root heading and reports unreachable clamping', () => {
    const target = targets[0];
    expect(solvePrReaperArmAngles(target, 0).yaw).not.toBeCloseTo(
      solvePrReaperArmAngles(target, Math.PI / 6).yaw,
      4
    );
    const unreachable = solvePrReaperArmAngles({ x: 100, y: 100, z: 0 });
    expect(unreachable.reachable).toBe(false);
    expect(unreachable.yawClamped || unreachable.pitchClamped).toBe(true);
  });

  it('damps toward targets, computes error, returns parked pose, and exposes two axes', () => {
    const parked = getPrReaperParkedPose();
    expect(parked).toEqual({ yaw: 0, pitch: 0 });
    expect(PR_REAPER_ANIMATED_AXES).toEqual(['yaw', 'pitch']);
    const next = dampPrReaperArmPose(parked, { yaw: 0.5, pitch: 0.2 }, 0.1, 12);
    expect(next.yaw).toBeGreaterThan(0);
    expect(next.yaw).toBeLessThan(0.5);
    expect(
      getPrReaperAngularError(next, { yaw: 0.5, pitch: 0.2 })
    ).toBeLessThan(getPrReaperAngularError(parked, { yaw: 0.5, pitch: 0.2 }));
  });
});
