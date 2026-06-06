import { MathUtils } from 'three';

import type { RectCollider } from '../collision';

export type FloorId = 'ground' | 'upper';

export interface StairGeometry {
  centerX: number;
  halfWidth: number;
  bottomZ: number;
  topZ: number;
  landingMinZ: number;
  landingMaxZ: number;
  totalRise: number;
  direction: 1 | -1;
}

export interface StairBehavior {
  transitionMargin: number;
  landingTriggerMargin: number;
  stepRise: number;
}

const DENOMINATOR_EPSILON = 1e-6;

export type StairTransitionZone =
  | 'lowerStairEntrance'
  | 'stairRampBody'
  | 'upperLanding'
  | 'safeUpperFloor'
  | 'explicitDescentCorridor';

export interface StairTransitionZoneSample {
  zone: StairTransitionZone;
  withinStairWidth: boolean;
  withinCoreStairWidth: boolean;
  withinDescentCorridorWidth: boolean;
  withinRampZ: boolean;
  withinLanding: boolean;
}

const isBetween = (value: number, a: number, b: number, margin = 0): boolean =>
  value >= Math.min(a, b) - margin && value <= Math.max(a, b) + margin;

const getDescentCorridorHalfWidth = (
  geometry: StairGeometry,
  behavior: StairBehavior
): number =>
  Math.max(
    geometry.halfWidth - behavior.transitionMargin * 0.35,
    geometry.halfWidth * 0.55
  );

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
  z >= Math.min(geometry.landingMinZ, geometry.landingMaxZ) - margin &&
  z <= Math.max(geometry.landingMinZ, geometry.landingMaxZ) + margin;

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

export const classifyStairTransitionZone = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  z: number,
  current: FloorId
): StairTransitionZoneSample => {
  const direction =
    geometry.direction ?? (geometry.topZ >= geometry.bottomZ ? 1 : -1);
  const withinStairWidth = isWithinStairWidth(
    geometry,
    x,
    behavior.transitionMargin
  );
  const withinCoreStairWidth = isWithinStairWidth(geometry, x);
  const descentCorridorHalfWidth = getDescentCorridorHalfWidth(
    geometry,
    behavior
  );
  const withinDescentCorridorWidth =
    Math.abs(x - geometry.centerX) <= descentCorridorHalfWidth;
  const withinLanding = isWithinLanding(
    geometry,
    x,
    z,
    behavior.landingTriggerMargin
  );
  const withinRampZ = isBetween(
    z,
    geometry.bottomZ,
    geometry.topZ,
    behavior.transitionMargin * 0.5
  );
  const nearBottom =
    direction === -1
      ? z >= geometry.bottomZ - behavior.transitionMargin * 0.5
      : z <= geometry.bottomZ + behavior.transitionMargin * 0.5;

  if (withinLanding) {
    return {
      zone: 'upperLanding',
      withinStairWidth,
      withinCoreStairWidth,
      withinDescentCorridorWidth,
      withinRampZ,
      withinLanding,
    };
  }

  if (current === 'upper' && withinDescentCorridorWidth && withinRampZ) {
    return {
      zone: 'explicitDescentCorridor',
      withinStairWidth,
      withinCoreStairWidth,
      withinDescentCorridorWidth,
      withinRampZ,
      withinLanding,
    };
  }

  if (withinCoreStairWidth && withinRampZ) {
    return {
      zone: 'stairRampBody',
      withinStairWidth,
      withinCoreStairWidth,
      withinDescentCorridorWidth,
      withinRampZ,
      withinLanding,
    };
  }

  if (withinCoreStairWidth && nearBottom) {
    return {
      zone: 'lowerStairEntrance',
      withinStairWidth,
      withinCoreStairWidth,
      withinDescentCorridorWidth,
      withinRampZ,
      withinLanding,
    };
  }

  return {
    zone: 'safeUpperFloor',
    withinStairWidth,
    withinCoreStairWidth,
    withinDescentCorridorWidth,
    withinRampZ,
    withinLanding,
  };
};

export const predictStairFloorId = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  z: number,
  current: FloorId
): FloorId => {
  const rampHeight = computeRampHeight(geometry, behavior, x, z);
  const direction =
    geometry.direction ?? (geometry.topZ >= geometry.bottomZ ? 1 : -1);
  const zoneSample = classifyStairTransitionZone(
    geometry,
    behavior,
    x,
    z,
    current
  );

  if (current === 'upper') {
    // Upper-to-ground transitions are intentionally narrower than the full
    // stair nav footprint. The broad footprint keeps ascent forgiving, while
    // this named descent corridor prevents landing-edge drift from reviving
    // accidental teleport goblins.
    if (zoneSample.zone === 'explicitDescentCorridor') {
      return 'ground';
    }

    return 'upper';
  }

  const nearTop =
    direction === -1
      ? z <= geometry.topZ + behavior.transitionMargin
      : z >= geometry.topZ - behavior.transitionMargin;

  const nearLanding =
    zoneSample.withinStairWidth &&
    (nearTop ||
      rampHeight >= geometry.totalRise - behavior.stepRise * 0.25 ||
      zoneSample.withinLanding);
  if (nearLanding) {
    return 'upper';
  }

  return 'ground';
};

export interface StairSurfaceSampleOptions {
  geometry: StairGeometry;
  behavior: StairBehavior;
  x: number;
  z: number;
  currentFloor: FloorId;
  upperFloorElevation: number;
}

export const sampleStairSurfaceHeight = ({
  geometry,
  behavior,
  x,
  z,
  currentFloor,
  upperFloorElevation,
}: StairSurfaceSampleOptions): number => {
  const rampHeight = computeRampHeight(geometry, behavior, x, z);
  const clampedRamp = MathUtils.clamp(rampHeight, 0, upperFloorElevation);
  const predictedFloor = predictStairFloorId(
    geometry,
    behavior,
    x,
    z,
    currentFloor
  );
  if (predictedFloor === 'upper') {
    const zoneSample = classifyStairTransitionZone(
      geometry,
      behavior,
      x,
      z,
      currentFloor
    );
    const withinStairWidth = isWithinStairWidth(
      geometry,
      x,
      behavior.transitionMargin
    );
    const onLanding = isWithinLanding(geometry, x, z);
    if (
      (currentFloor === 'upper' && zoneSample.zone === 'safeUpperFloor') ||
      !withinStairWidth ||
      onLanding
    ) {
      return upperFloorElevation;
    }
  }

  return clampedRamp;
};

export interface StairNavAreaOptions {
  marginX?: number;
  marginZ?: number;
}

export const createStairNavAreaRect = (
  geometry: StairGeometry,
  { marginX = 0, marginZ = 0 }: StairNavAreaOptions = {}
): RectCollider => {
  const minX = geometry.centerX - geometry.halfWidth - marginX;
  const maxX = geometry.centerX + geometry.halfWidth + marginX;
  const minZ =
    Math.min(
      geometry.bottomZ,
      geometry.topZ,
      geometry.landingMinZ,
      geometry.landingMaxZ
    ) - marginZ;
  const maxZ =
    Math.max(
      geometry.bottomZ,
      geometry.topZ,
      geometry.landingMinZ,
      geometry.landingMaxZ
    ) + marginZ;

  return { minX, maxX, minZ, maxZ };
};
