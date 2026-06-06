import { MathUtils } from 'three';

import type { RectCollider } from '../collision';

export type FloorId = 'ground' | 'upper';

export type StairTransitionZone =
  | 'lowerStairEntrance'
  | 'stairRampBody'
  | 'upperLanding'
  | 'safeUpperFloor'
  | 'explicitDescentCorridor'
  | 'outsideStairTransition';

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
  /**
   * Optional inset that narrows the upstairs descent trigger from the full stair
   * width. Keeping this corridor explicit prevents upper-floor landing edge
   * movement from being interpreted as an intent to descend.
   */
  descentCorridorInset?: number;
}

export interface StairNavigationZones {
  lowerStairEntrance: RectCollider;
  stairRampBody: RectCollider;
  upperLanding: RectCollider;
  explicitDescentCorridor: RectCollider;
  unsafeUpperRampEdges: RectCollider[];
}

const DENOMINATOR_EPSILON = 1e-6;

const getDirection = (geometry: StairGeometry): 1 | -1 =>
  geometry.direction ?? (geometry.topZ >= geometry.bottomZ ? 1 : -1);

const getDescentCorridorHalfWidth = (
  geometry: StairGeometry,
  behavior: StairBehavior
): number => {
  const inset =
    behavior.descentCorridorInset ?? behavior.transitionMargin * 0.5;
  return Math.max(geometry.halfWidth - inset, geometry.halfWidth * 0.45);
};

const isWithinHalfWidth = (
  geometry: StairGeometry,
  x: number,
  halfWidth: number,
  margin = 0
): boolean => Math.abs(x - geometry.centerX) <= halfWidth + margin;

const isBetween = (value: number, a: number, b: number, margin = 0): boolean =>
  value >= Math.min(a, b) - margin && value <= Math.max(a, b) + margin;

export const isWithinStairWidth = (
  geometry: StairGeometry,
  x: number,
  margin = 0
): boolean => isWithinHalfWidth(geometry, x, geometry.halfWidth, margin);

export const isWithinDescentCorridor = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  margin = 0
): boolean =>
  isWithinHalfWidth(
    geometry,
    x,
    getDescentCorridorHalfWidth(geometry, behavior),
    margin
  );

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
): StairTransitionZone => {
  const direction = getDirection(geometry);
  const withinStairWidth = isWithinStairWidth(
    geometry,
    x,
    behavior.transitionMargin
  );

  // The landing is always safe upper-floor space. It must be checked before the
  // ramp body because its south/north edge abuts the first descending step.
  if (isWithinLanding(geometry, x, z, behavior.landingTriggerMargin)) {
    return 'upperLanding';
  }

  if (!withinStairWidth) {
    return current === 'upper' ? 'safeUpperFloor' : 'outsideStairTransition';
  }

  const reachedLowerEntrance =
    direction === -1 ? z >= geometry.bottomZ : z <= geometry.bottomZ;
  if (reachedLowerEntrance && isWithinDescentCorridor(geometry, behavior, x)) {
    return 'lowerStairEntrance';
  }

  const withinRamp = isBetween(
    z,
    geometry.bottomZ,
    geometry.topZ,
    behavior.transitionMargin * 0.25
  );
  if (!withinRamp) {
    return current === 'upper' ? 'safeUpperFloor' : 'outsideStairTransition';
  }

  const nearUpperRampMouth =
    direction === -1
      ? z <= geometry.topZ + behavior.transitionMargin
      : z >= geometry.topZ - behavior.transitionMargin;

  // Only this narrowed center strip at the upper ramp mouth is allowed to flip
  // an upstairs avatar onto the stair ramp. Side strips remain upper-floor
  // edge/guard space so slight landing movement cannot revive the teleport goblin.
  if (
    current === 'upper' &&
    nearUpperRampMouth &&
    isWithinDescentCorridor(geometry, behavior, x)
  ) {
    return 'explicitDescentCorridor';
  }

  return 'stairRampBody';
};

export const predictStairFloorId = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  z: number,
  current: FloorId
): FloorId => {
  const zone = classifyStairTransitionZone(geometry, behavior, x, z, current);

  if (current === 'upper') {
    return zone === 'explicitDescentCorridor' || zone === 'lowerStairEntrance'
      ? 'ground'
      : 'upper';
  }

  const rampHeight = computeRampHeight(geometry, behavior, x, z);
  const nearTop =
    getDirection(geometry) === -1
      ? z <= geometry.topZ + behavior.transitionMargin
      : z >= geometry.topZ - behavior.transitionMargin;

  const nearLanding =
    isWithinStairWidth(geometry, x, behavior.transitionMargin) &&
    (nearTop ||
      rampHeight >= geometry.totalRise - behavior.stepRise * 0.25 ||
      zone === 'upperLanding');
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
    if (
      currentFloor === 'upper' ||
      isWithinLanding(geometry, x, z) ||
      !isWithinStairWidth(geometry, x, behavior.transitionMargin)
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

export const createStairNavigationZones = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  { marginX = 0, marginZ = 0 }: StairNavAreaOptions = {}
): StairNavigationZones => {
  const corridorHalfWidth = getDescentCorridorHalfWidth(geometry, behavior);
  const rampMinZ = Math.min(geometry.bottomZ, geometry.topZ) - marginZ;
  const rampMaxZ = Math.max(geometry.bottomZ, geometry.topZ) + marginZ;
  const landingMinZ =
    Math.min(geometry.landingMinZ, geometry.landingMaxZ) - marginZ;
  const landingMaxZ =
    Math.max(geometry.landingMinZ, geometry.landingMaxZ) + marginZ;
  const lowerEntranceDepth = behavior.transitionMargin + marginZ;
  const lowerStairEntrance =
    getDirection(geometry) === -1
      ? {
          minX: geometry.centerX - corridorHalfWidth - marginX,
          maxX: geometry.centerX + corridorHalfWidth + marginX,
          minZ: geometry.bottomZ - marginZ,
          maxZ: geometry.bottomZ + lowerEntranceDepth,
        }
      : {
          minX: geometry.centerX - corridorHalfWidth - marginX,
          maxX: geometry.centerX + corridorHalfWidth + marginX,
          minZ: geometry.bottomZ - lowerEntranceDepth,
          maxZ: geometry.bottomZ + marginZ,
        };

  const explicitDescentCorridor = {
    minX: geometry.centerX - corridorHalfWidth - marginX,
    maxX: geometry.centerX + corridorHalfWidth + marginX,
    minZ: rampMinZ,
    maxZ: rampMaxZ,
  };
  const stairRampBody = {
    minX: geometry.centerX - geometry.halfWidth - marginX,
    maxX: geometry.centerX + geometry.halfWidth + marginX,
    minZ: rampMinZ,
    maxZ: rampMaxZ,
  };
  const upperLanding = {
    minX: geometry.centerX - geometry.halfWidth - marginX,
    maxX: geometry.centerX + geometry.halfWidth + marginX,
    minZ: landingMinZ,
    maxZ: landingMaxZ,
  };

  const unsafeUpperRampEdges = [
    {
      minX: stairRampBody.minX,
      maxX: explicitDescentCorridor.minX,
      minZ: rampMinZ,
      maxZ: rampMaxZ,
    },
    {
      minX: explicitDescentCorridor.maxX,
      maxX: stairRampBody.maxX,
      minZ: rampMinZ,
      maxZ: rampMaxZ,
    },
  ].filter((rect) => rect.maxX > rect.minX && rect.maxZ > rect.minZ);

  return {
    lowerStairEntrance,
    stairRampBody,
    upperLanding,
    explicitDescentCorridor,
    unsafeUpperRampEdges,
  };
};
