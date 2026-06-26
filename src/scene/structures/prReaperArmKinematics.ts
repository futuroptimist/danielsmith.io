import { Vector3 } from 'three';

import {
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_PITCH_PIVOT,
  PR_REAPER_SCREEN_PLANE_Z,
  PR_REAPER_TOOL_FLANGE_OFFSET,
  PR_REAPER_EMITTER_OFFSET,
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

export const PR_REAPER_ANIMATED_AXES = ['yaw', 'pitch'] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function getPrReaperParkedPose(): PrReaperArmPose {
  return { ...PR_REAPER_PARKED_POSE };
}

export function toArmBaseSpace(
  targetInstallationLocal: { x: number; y: number; z: number },
  rootHeadingRadians = 0
): { x: number; y: number; z: number } {
  const cos = Math.cos(-rootHeadingRadians);
  const sin = Math.sin(-rootHeadingRadians);
  const x = targetInstallationLocal.x - PR_REAPER_YAW_PIVOT.x;
  const z = targetInstallationLocal.z - PR_REAPER_YAW_PIVOT.z;
  return {
    x: x * cos + z * sin,
    y: targetInstallationLocal.y - PR_REAPER_YAW_PIVOT.y,
    z: -x * sin + z * cos,
  };
}

export function solvePrReaperYaw(targetYawSpace: {
  x: number;
  z: number;
}): number {
  return Math.atan2(targetYawSpace.x, -targetYawSpace.z);
}

export function solvePrReaperPitch(targetYawSpace: {
  y: number;
  z: number;
}): number {
  const pitchPivotY = PR_REAPER_PITCH_PIVOT.y - PR_REAPER_YAW_PIVOT.y;
  const emitterReach = Math.abs(
    PR_REAPER_TOOL_FLANGE_OFFSET.z + PR_REAPER_EMITTER_OFFSET.z
  );
  const dy = targetYawSpace.y - pitchPivotY;
  const dz = targetYawSpace.z - PR_REAPER_SCREEN_PLANE_Z;
  return Math.atan2(dy, Math.max(0.0001, -dz)) - Math.atan2(0, emitterReach);
}

export function solvePrReaperArmAngles(
  targetInstallationLocal: { x: number; y: number; z: number },
  rootHeadingRadians = 0
): PrReaperArmSolution {
  const targetInYawSpace = toArmBaseSpace(
    targetInstallationLocal,
    rootHeadingRadians
  );
  const unclampedYaw = solvePrReaperYaw(targetInYawSpace);
  const yaw = clamp(
    unclampedYaw,
    PR_REAPER_YAW_LIMITS.min,
    PR_REAPER_YAW_LIMITS.max
  );
  const unclampedPitch = solvePrReaperPitch(targetInYawSpace);
  const pitch = clamp(
    unclampedPitch,
    PR_REAPER_PITCH_LIMITS.min,
    PR_REAPER_PITCH_LIMITS.max
  );
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
    targetInYawSpace,
  };
}

export function getPrReaperAngularError(
  current: PrReaperArmPose,
  target: PrReaperArmPose
): number {
  return Math.hypot(
    normalizeAngle(target.yaw - current.yaw),
    normalizeAngle(target.pitch - current.pitch)
  );
}

export function dampPrReaperArmPose(
  current: PrReaperArmPose,
  target: PrReaperArmPose,
  deltaSeconds: number,
  damping: number
): PrReaperArmPose {
  const alpha = 1 - Math.exp(-Math.max(0, deltaSeconds) * Math.max(0, damping));
  return {
    yaw: current.yaw + normalizeAngle(target.yaw - current.yaw) * alpha,
    pitch: current.pitch + normalizeAngle(target.pitch - current.pitch) * alpha,
  };
}

export function vectorToPlain(vector: Vector3): {
  x: number;
  y: number;
  z: number;
} {
  return { x: vector.x, y: vector.y, z: vector.z };
}
