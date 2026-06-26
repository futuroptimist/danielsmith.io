import { Vector3 } from 'three';

import {
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_PITCH_PIVOT,
  PR_REAPER_YAW_LIMITS,
  PR_REAPER_YAW_PIVOT,
} from './prReaperInstallationContract';

export interface PrReaperArmPose {
  yaw: number;
  pitch: number;
}

export interface PrReaperArmSolution extends PrReaperArmPose {
  unclampedYaw: number;
  unclampedPitch: number;
  reachable: boolean;
  yawClamped: boolean;
  pitchClamped: boolean;
  targetInYawSpace: { x: number; y: number; z: number };
}

export function getPrReaperParkedPose(): PrReaperArmPose {
  return { ...PR_REAPER_PARKED_POSE };
}

export function clampPrReaperYaw(yaw: number): number {
  return Math.min(
    PR_REAPER_YAW_LIMITS.max,
    Math.max(PR_REAPER_YAW_LIMITS.min, yaw)
  );
}

export function clampPrReaperPitch(pitch: number): number {
  return Math.min(
    PR_REAPER_PITCH_LIMITS.max,
    Math.max(PR_REAPER_PITCH_LIMITS.min, pitch)
  );
}

export function targetToPrReaperYawSpace(
  target: { x: number; y: number; z: number },
  rootHeading = 0
): Vector3 {
  const local = new Vector3(
    target.x - PR_REAPER_YAW_PIVOT.x,
    target.y - PR_REAPER_YAW_PIVOT.y,
    target.z - PR_REAPER_YAW_PIVOT.z
  );
  if (rootHeading !== 0)
    local.applyAxisAngle(new Vector3(0, 1, 0), -rootHeading);
  return local;
}

export function solvePrReaperYaw(targetInYawSpace: {
  x: number;
  z: number;
}): number {
  return Math.atan2(targetInYawSpace.x, -targetInYawSpace.z);
}

export function solvePrReaperPitch(targetInPitchSpace: {
  y: number;
  z: number;
}): number {
  return Math.atan2(
    targetInPitchSpace.y - PR_REAPER_PITCH_PIVOT.y,
    Math.max(0.001, -targetInPitchSpace.z)
  );
}

export function solvePrReaperArmAngles(
  target: { x: number; y: number; z: number },
  rootHeading = 0
): PrReaperArmSolution {
  const yawSpace = targetToPrReaperYawSpace(target, rootHeading);
  const unclampedYaw = solvePrReaperYaw(yawSpace);
  const yaw = clampPrReaperYaw(unclampedYaw);
  const cos = Math.cos(-yaw);
  const sin = Math.sin(-yaw);
  const pitchSpace = {
    y: yawSpace.y + PR_REAPER_YAW_PIVOT.y,
    z: yawSpace.x * sin + yawSpace.z * cos,
  };
  const unclampedPitch = solvePrReaperPitch(pitchSpace);
  const pitch = clampPrReaperPitch(unclampedPitch);
  const yawClamped = Math.abs(yaw - unclampedYaw) > 1e-9;
  const pitchClamped = Math.abs(pitch - unclampedPitch) > 1e-9;
  return {
    yaw,
    pitch,
    unclampedYaw,
    unclampedPitch,
    reachable: !yawClamped && !pitchClamped,
    yawClamped,
    pitchClamped,
    targetInYawSpace: { x: yawSpace.x, y: yawSpace.y, z: yawSpace.z },
  };
}

export function getPrReaperAngularError(
  current: PrReaperArmPose,
  target: PrReaperArmPose
): number {
  return Math.hypot(current.yaw - target.yaw, current.pitch - target.pitch);
}

export function dampPrReaperArmPose(
  current: PrReaperArmPose,
  target: PrReaperArmPose,
  damping: number,
  delta: number
): PrReaperArmPose {
  const alpha = 1 - Math.exp(-Math.max(0, damping) * Math.max(0, delta));
  return {
    yaw: current.yaw + (target.yaw - current.yaw) * alpha,
    pitch: current.pitch + (target.pitch - current.pitch) * alpha,
  };
}
