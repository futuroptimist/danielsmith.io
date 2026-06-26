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
  error: number;
}

export function getPrReaperParkedPose(): PrReaperArmPose {
  return { ...PR_REAPER_PARKED_POSE };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function installationLocalToYawSpace(target: Vector3): Vector3 {
  return new Vector3(
    target.x - PR_REAPER_YAW_PIVOT.x,
    target.y - PR_REAPER_YAW_PIVOT.y,
    target.z - PR_REAPER_YAW_PIVOT.z
  );
}

export function worldToInstallationLocal(
  target: Vector3,
  installationPosition: Vector3,
  installationHeadingRadians: number
): Vector3 {
  const local = target.clone().sub(installationPosition);
  local.applyAxisAngle(new Vector3(0, 1, 0), -installationHeadingRadians);
  return local;
}

export function solvePrReaperYaw(yawSpaceTarget: Vector3): number {
  return Math.atan2(yawSpaceTarget.x, -yawSpaceTarget.z);
}

export function solvePrReaperPitch(
  yawSpaceTarget: Vector3,
  yaw: number
): number {
  const cos = Math.cos(-yaw);
  const sin = Math.sin(-yaw);
  const y =
    yawSpaceTarget.y - (PR_REAPER_PITCH_PIVOT.y - PR_REAPER_YAW_PIVOT.y);
  const z = yawSpaceTarget.x * -sin + yawSpaceTarget.z * cos;
  return Math.atan2(y, z) - Math.PI;
}

export function solvePrReaperArm(
  targetInstallationLocal: Vector3
): PrReaperArmSolution {
  const yawSpaceTarget = installationLocalToYawSpace(targetInstallationLocal);
  const unclampedYaw = solvePrReaperYaw(yawSpaceTarget);
  const yaw = clamp(
    unclampedYaw,
    PR_REAPER_YAW_LIMITS.min,
    PR_REAPER_YAW_LIMITS.max
  );
  const unclampedPitch = solvePrReaperPitch(yawSpaceTarget, yaw);
  const pitch = clamp(
    unclampedPitch,
    PR_REAPER_PITCH_LIMITS.min,
    PR_REAPER_PITCH_LIMITS.max
  );
  const error = computeAngularError(
    { yaw, pitch },
    { yaw: unclampedYaw, pitch: unclampedPitch }
  );
  return {
    yaw,
    pitch,
    unclampedYaw,
    unclampedPitch,
    reachable: error < 1e-6,
    error,
  };
}

export function computeAngularError(
  current: PrReaperArmPose,
  target: PrReaperArmPose
): number {
  return Math.hypot(current.yaw - target.yaw, current.pitch - target.pitch);
}

export function dampPrReaperArmPose(
  current: PrReaperArmPose,
  target: PrReaperArmPose,
  delta: number,
  damping: number
): PrReaperArmPose {
  const alpha = 1 - Math.exp(-Math.max(0, delta) * damping);
  return {
    yaw: current.yaw + (target.yaw - current.yaw) * alpha,
    pitch: current.pitch + (target.pitch - current.pitch) * alpha,
  };
}
