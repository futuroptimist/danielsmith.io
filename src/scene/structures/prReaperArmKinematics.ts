import { Vector3 } from 'three';

import {
  PR_REAPER_EMITTER_OFFSET,
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_PITCH_PIVOT,
  PR_REAPER_TOOL_FLANGE_OFFSET,
  PR_REAPER_YAW_LIMITS,
  PR_REAPER_YAW_PIVOT,
} from './prReaperInstallationContract';

export interface PrReaperArmPose {
  yaw: number;
  pitch: number;
}

export interface PrReaperArmSolution extends PrReaperArmPose {
  targetYaw: number;
  targetPitch: number;
  reachable: boolean;
  yawClamped: boolean;
  pitchClamped: boolean;
  angularError: number;
}

const EPSILON = 0.000001;

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
  targetInstallationLocal: { x: number; y: number; z: number },
  rootHeadingRadians = 0
): Vector3 {
  const cos = Math.cos(-rootHeadingRadians);
  const sin = Math.sin(-rootHeadingRadians);
  const x = targetInstallationLocal.x - PR_REAPER_YAW_PIVOT.x;
  const y = targetInstallationLocal.y - PR_REAPER_YAW_PIVOT.y;
  const z = targetInstallationLocal.z - PR_REAPER_YAW_PIVOT.z;
  return new Vector3(x * cos - z * sin, y, x * sin + z * cos);
}

export function solvePrReaperYaw(yawSpaceTarget: {
  x: number;
  z: number;
}): number {
  return Math.atan2(yawSpaceTarget.x, -yawSpaceTarget.z);
}

export function solvePrReaperPitch(yawSpaceTarget: {
  x: number;
  y: number;
  z: number;
}): number {
  const yaw = solvePrReaperYaw(yawSpaceTarget);
  const cos = Math.cos(-yaw);
  const sin = Math.sin(-yaw);
  const localY =
    yawSpaceTarget.y - (PR_REAPER_PITCH_PIVOT.y - PR_REAPER_YAW_PIVOT.y);
  const localZ = yawSpaceTarget.x * sin + yawSpaceTarget.z * cos;
  const emitterZ = PR_REAPER_TOOL_FLANGE_OFFSET.z + PR_REAPER_EMITTER_OFFSET.z;
  return Math.atan2(localY, -localZ - Math.abs(emitterZ) * 0.02);
}

export function getPrReaperAngularError(
  current: PrReaperArmPose,
  target: PrReaperArmPose
): number {
  return Math.hypot(current.yaw - target.yaw, current.pitch - target.pitch);
}

export function solvePrReaperArmPose(
  targetInstallationLocal: { x: number; y: number; z: number },
  rootHeadingRadians = 0
): PrReaperArmSolution {
  const yawSpace = targetToPrReaperYawSpace(
    targetInstallationLocal,
    rootHeadingRadians
  );
  const targetYaw = solvePrReaperYaw(yawSpace);
  const targetPitch = solvePrReaperPitch(yawSpace);
  const yaw = clampPrReaperYaw(targetYaw);
  const pitch = clampPrReaperPitch(targetPitch);
  const yawClamped = Math.abs(yaw - targetYaw) > EPSILON;
  const pitchClamped = Math.abs(pitch - targetPitch) > EPSILON;
  return {
    yaw,
    pitch,
    targetYaw,
    targetPitch,
    yawClamped,
    pitchClamped,
    reachable: !yawClamped && !pitchClamped,
    angularError: getPrReaperAngularError(
      { yaw, pitch },
      { yaw: targetYaw, pitch: targetPitch }
    ),
  };
}

export function dampPrReaperArmPose(
  current: PrReaperArmPose,
  target: PrReaperArmPose,
  deltaSeconds: number,
  damping: number
): PrReaperArmPose {
  const alpha = 1 - Math.exp(-Math.max(0, deltaSeconds) * Math.max(0, damping));
  return {
    yaw: current.yaw + (target.yaw - current.yaw) * alpha,
    pitch: current.pitch + (target.pitch - current.pitch) * alpha,
  };
}
