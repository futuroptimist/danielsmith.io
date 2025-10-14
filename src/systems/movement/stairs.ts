import { MathUtils } from 'three';

export type FloorId = 'ground' | 'upper';

export interface StairGeometry {
  centerX: number;
  halfWidth: number;
  bottomZ: number;
  topZ: number;
  landingMinZ: number;
  totalRise: number;
}

export interface StairBehavior {
  transitionMargin: number;
  landingTriggerMargin: number;
  stepRise: number;
}

const DENOMINATOR_EPSILON = 1e-6;

export const isWithinStairWidth = (
  geometry: StairGeometry,
  x: number,
  margin = 0
): boolean => Math.abs(x - geometry.centerX) <= geometry.halfWidth + margin;

export const isWithinLanding = (
  geometry: StairGeometry,
  x: number,
  z: number,
  margin = 0
): boolean =>
  Math.abs(x - geometry.centerX) <= geometry.halfWidth + margin &&
  z >= geometry.landingMinZ - margin &&
  z <= geometry.topZ + margin;

export const computeRampHeight = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  z: number
): number => {
  if (!isWithinStairWidth(geometry, x, behavior.transitionMargin)) {
    return 0;
  }
  const denominator = geometry.bottomZ - geometry.topZ;
  if (Math.abs(denominator) <= DENOMINATOR_EPSILON) {
    return 0;
  }
  const progress = (geometry.bottomZ - z) / denominator;
  if (!Number.isFinite(progress)) {
    return 0;
  }
  const clamped = MathUtils.clamp(progress, 0, 1);
  return clamped * geometry.totalRise;
};

export const predictStairFloorId = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  z: number,
  current: FloorId
): FloorId => {
  const rampHeight = computeRampHeight(geometry, behavior, x, z);
  const withinStairs = isWithinStairWidth(
    geometry,
    x,
    behavior.transitionMargin
  );

  if (current === 'upper') {
    if (!withinStairs) {
      return 'upper';
    }

    const baseExitHalfWidth = Math.max(
      geometry.halfWidth - behavior.transitionMargin * 0.5,
      geometry.halfWidth * 0.5
    );

    const withinLanding = isWithinLanding(
      geometry,
      x,
      z,
      behavior.landingTriggerMargin
    );
    if (withinLanding) {
      return 'upper';
    }

    const hasLeftLanding =
      rampHeight < geometry.totalRise - behavior.stepRise * 0.1;
    const nearBottomBuffer = geometry.bottomZ - behavior.transitionMargin * 0.5;

    if (hasLeftLanding && z <= nearBottomBuffer) {
      return 'ground';
    }

    const withinBaseExit = Math.abs(x - geometry.centerX) <= baseExitHalfWidth;
    if (withinBaseExit && z >= geometry.bottomZ) {
      return 'ground';
    }

    return 'upper';
  }

  const nearLanding =
    withinStairs &&
    (z <= geometry.topZ + behavior.transitionMargin ||
      rampHeight >= geometry.totalRise - behavior.stepRise * 0.25 ||
      isWithinLanding(geometry, x, z, behavior.landingTriggerMargin));
  if (nearLanding) {
    return 'upper';
  }

  return 'ground';
};
