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

export type StairTransitionZoneId =
  | 'lowerStairEntrance'
  | 'stairRampBody'
  | 'upperLanding'
  | 'safeUpperFloor'
  | 'explicitDescentCorridor';

export interface StairTransitionZones {
  /** Ground-floor approach pad at the foot of the stairs. */
  lowerStairEntrance: RectCollider;
  /** The physical stair run, constrained to the actual stair width. */
  stairRampBody: RectCollider;
  /** The top landing slab where the avatar must remain on the upper floor. */
  upperLanding: RectCollider;
  /** Upper-floor shoulder area near the stair void that must never teleport. */
  safeUpperFloor: RectCollider;
  /** Narrow gate at the top of the stairs that starts an intentional descent. */
  explicitDescentCorridor: RectCollider;
}

export interface StairNavigationZones {
  /** Walkable approach for entering the staircase from the ground floor. */
  lowerStairEntrance: RectCollider;
  /** Walkable ramp body shared with ground-floor stair travel. */
  stairRampBody: RectCollider;
  /** Top landing connector, kept separate from the broad ramp body. */
  upperLanding: RectCollider;
}

const DENOMINATOR_EPSILON = 1e-6;

const createCenteredRect = (
  geometry: StairGeometry,
  halfWidth: number,
  minZ: number,
  maxZ: number
): RectCollider => ({
  minX: geometry.centerX - halfWidth,
  maxX: geometry.centerX + halfWidth,
  minZ: Math.min(minZ, maxZ),
  maxZ: Math.max(minZ, maxZ),
});

const isWithinRect = (rect: RectCollider, x: number, z: number): boolean =>
  x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;

const getLowerSideZ = (geometry: StairGeometry, offset: number): number =>
  geometry.bottomZ - geometry.direction * offset;

const getUpperSideZ = (geometry: StairGeometry, offset: number): number =>
  geometry.topZ + geometry.direction * offset;

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

export const createStairTransitionZones = (
  geometry: StairGeometry,
  behavior: StairBehavior
): StairTransitionZones => {
  const direction = geometry.direction ?? 1;
  const rampHalfWidth = geometry.halfWidth;
  const descentHalfWidth = Math.max(
    geometry.halfWidth - behavior.transitionMargin * 0.35,
    geometry.halfWidth * 0.55
  );
  const safeHalfWidth = geometry.halfWidth + behavior.transitionMargin;

  const lowerStairEntrance = createCenteredRect(
    geometry,
    rampHalfWidth,
    geometry.bottomZ,
    getLowerSideZ(geometry, behavior.transitionMargin)
  );
  const stairRampBody = createCenteredRect(
    geometry,
    rampHalfWidth,
    geometry.topZ,
    geometry.bottomZ
  );
  const upperLanding = createCenteredRect(
    geometry,
    geometry.halfWidth + behavior.landingTriggerMargin,
    geometry.landingMinZ - behavior.landingTriggerMargin,
    geometry.landingMaxZ + behavior.landingTriggerMargin
  );
  const safeUpperFloor = createCenteredRect(
    geometry,
    safeHalfWidth,
    getUpperSideZ(geometry, behavior.landingTriggerMargin),
    getLowerSideZ(geometry, behavior.transitionMargin)
  );
  const explicitDescentCorridor = createCenteredRect(
    geometry,
    descentHalfWidth,
    getUpperSideZ(geometry, behavior.landingTriggerMargin),
    geometry.topZ - direction * behavior.transitionMargin
  );

  return {
    lowerStairEntrance,
    stairRampBody,
    upperLanding,
    safeUpperFloor,
    explicitDescentCorridor,
  };
};

export const classifyStairTransitionZone = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  z: number,
  currentFloor: FloorId
): StairTransitionZoneId => {
  const zones = createStairTransitionZones(geometry, behavior);

  // Order matters: the intentional descent gate overlaps the landing edge.
  // Ground-floor ascents should still resolve that shared edge as upper landing,
  // while upper-floor movement needs the narrow gate to opt into descending.
  if (
    currentFloor === 'upper' &&
    isWithinRect(zones.explicitDescentCorridor, x, z)
  ) {
    return 'explicitDescentCorridor';
  }

  if (isWithinRect(zones.upperLanding, x, z)) {
    return 'upperLanding';
  }

  if (isWithinRect(zones.stairRampBody, x, z)) {
    return 'stairRampBody';
  }

  if (isWithinRect(zones.lowerStairEntrance, x, z)) {
    return 'lowerStairEntrance';
  }

  return 'safeUpperFloor';
};

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
  const zone = classifyStairTransitionZone(geometry, behavior, x, z, current);

  if (current === 'upper') {
    // Teleport goblin guard: upper-floor movement only descends after entering
    // the named descent corridor or the physical ramp body. Broad shoulder and
    // room areas near the upper landing intentionally stay on the upper floor.
    if (zone === 'lowerStairEntrance') {
      const { explicitDescentCorridor } = createStairTransitionZones(
        geometry,
        behavior
      );
      const withinDescentWidth =
        x >= explicitDescentCorridor.minX && x <= explicitDescentCorridor.maxX;
      return withinDescentWidth ? 'ground' : 'upper';
    }

    return zone === 'explicitDescentCorridor' || zone === 'stairRampBody'
      ? 'ground'
      : 'upper';
  }

  const rampHeight = computeRampHeight(geometry, behavior, x, z);
  const nearTop =
    (zone === 'upperLanding' && isWithinStairWidth(geometry, x)) ||
    zone === 'explicitDescentCorridor' ||
    (zone === 'stairRampBody' &&
      rampHeight >= geometry.totalRise - behavior.stepRise * 0.25);

  return nearTop ? 'upper' : 'ground';
};

export const createUpperStairEdgeGuardColliders = (
  geometry: StairGeometry,
  behavior: StairBehavior
): RectCollider[] => {
  const minZ = Math.min(
    getUpperSideZ(geometry, behavior.landingTriggerMargin),
    geometry.bottomZ
  );
  const maxZ = Math.max(
    getUpperSideZ(geometry, behavior.landingTriggerMargin),
    geometry.bottomZ
  );

  // Invisible shoulder guards fence the ambiguous upper-floor ledges beside the
  // stair opening. The center stays open for intentional descent; only the
  // transition-margin shoulders are blocked so normal upstairs movement cannot
  // brush a ramp trigger from the side and drop to the ground floor.
  return [
    {
      minX: geometry.centerX - geometry.halfWidth - behavior.transitionMargin,
      maxX: geometry.centerX - geometry.halfWidth,
      minZ,
      maxZ,
    },
    {
      minX: geometry.centerX + geometry.halfWidth,
      maxX: geometry.centerX + geometry.halfWidth + behavior.transitionMargin,
      minZ,
      maxZ,
    },
  ];
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
    const withinStairWidth = isWithinStairWidth(
      geometry,
      x,
      behavior.transitionMargin
    );
    const onLanding = isWithinLanding(geometry, x, z);
    if (!withinStairWidth || onLanding) {
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
  const zones = createStairTransitionZones(geometry, behavior);
  const expand = (rect: RectCollider): RectCollider => ({
    minX: rect.minX - marginX,
    maxX: rect.maxX + marginX,
    minZ: rect.minZ - marginZ,
    maxZ: rect.maxZ + marginZ,
  });

  return {
    lowerStairEntrance: expand(zones.lowerStairEntrance),
    stairRampBody: expand(zones.stairRampBody),
    upperLanding: expand(zones.upperLanding),
  };
};
