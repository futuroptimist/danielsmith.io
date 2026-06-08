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
  /**
   * Amount removed from each stair side when deciding that an upper-floor
   * player deliberately entered the descent corridor. Keeping this stricter
   * than ascent width prevents landing-edge drift from becoming a floor hop.
   */
  descentCorridorInset?: number;
}

export type StairTransitionZone =
  | 'lowerStairEntrance'
  | 'stairRampBody'
  | 'upperLanding'
  | 'safeUpperFloor'
  | 'explicitDescentCorridor'
  | 'outsideStairs';

export interface StairNavigationZones {
  lowerStairEntrance: RectCollider;
  stairRampBody: RectCollider;
  upperLanding: RectCollider;
  explicitDescentCorridor: RectCollider;
}

export interface NamedStairBoundaryCollider {
  name: string;
  bounds: RectCollider;
}

export interface GroundStairBoundaryColliderOptions {
  playerRadius: number;
  guardThickness: number;
  /**
   * East-most X coordinate for the containing room edge that closes the
   * stair-run no-go band. This should be the local room boundary, not a global
   * floor edge, unless those are the same physical edge.
   */
  containingRoomMaxX: number;
  /** Optional east-most X coordinate for the local stair-side blocker. */
  eastBoundaryMaxX?: number;
}

const DENOMINATOR_EPSILON = 1e-6;

const getMinZ = (...values: number[]): number => Math.min(...values);

const getMaxZ = (...values: number[]): number => Math.max(...values);

const isWithinZRange = (
  z: number,
  minZ: number,
  maxZ: number,
  margin = 0
): boolean => z >= minZ - margin && z <= maxZ + margin;

const getDescentDistanceFromLanding = (
  geometry: StairGeometry,
  z: number
): number =>
  geometry.direction === -1 ? z - geometry.topZ : geometry.topZ - z;

const getSmoothstep = (value: number): number =>
  value * value * (3 - 2 * value);

const getDescentCorridorHalfWidth = (
  geometry: StairGeometry,
  behavior: StairBehavior
): number => {
  const inset =
    behavior.descentCorridorInset ?? behavior.transitionMargin * 0.25;
  return Math.max(geometry.halfWidth - inset, geometry.halfWidth * 0.55);
};

const isWithinDescentCorridorWidth = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number
): boolean =>
  Math.abs(x - geometry.centerX) <=
  getDescentCorridorHalfWidth(geometry, behavior);

const createCenteredRect = (
  geometry: StairGeometry,
  halfWidth: number,
  minZ: number,
  maxZ: number
): RectCollider => ({
  minX: geometry.centerX - halfWidth,
  maxX: geometry.centerX + halfWidth,
  minZ,
  maxZ,
});

const isWithinPhysicalStairWidth = (
  geometry: StairGeometry,
  x: number
): boolean => Math.abs(x - geometry.centerX) <= geometry.halfWidth;

export const isWithinStairWidth = (
  geometry: StairGeometry,
  x: number,
  margin = 0
): boolean =>
  margin === 0
    ? isWithinPhysicalStairWidth(geometry, x)
    : Math.abs(x - geometry.centerX) <= geometry.halfWidth + margin;

const isWithinRampRun = (
  geometry: StairGeometry,
  z: number,
  margin = 0
): boolean =>
  isWithinZRange(
    z,
    getMinZ(geometry.bottomZ, geometry.topZ),
    getMaxZ(geometry.bottomZ, geometry.topZ),
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
  _behavior: StairBehavior,
  x: number,
  z: number
): number => {
  if (
    !isWithinPhysicalStairWidth(geometry, x) ||
    !isWithinRampRun(geometry, z)
  ) {
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

export const createStairNavigationZones = (
  geometry: StairGeometry,
  behavior: StairBehavior
): StairNavigationZones => {
  const rampMinZ = getMinZ(geometry.bottomZ, geometry.topZ);
  const rampMaxZ = getMaxZ(geometry.bottomZ, geometry.topZ);
  const entranceMinZ =
    geometry.direction === -1
      ? geometry.bottomZ - behavior.transitionMargin
      : geometry.bottomZ;
  const entranceMaxZ =
    geometry.direction === -1
      ? geometry.bottomZ
      : geometry.bottomZ + behavior.transitionMargin;

  return {
    lowerStairEntrance: createCenteredRect(
      geometry,
      geometry.halfWidth + behavior.transitionMargin,
      getMinZ(entranceMinZ, entranceMaxZ),
      getMaxZ(entranceMinZ, entranceMaxZ)
    ),
    stairRampBody: createCenteredRect(
      geometry,
      geometry.halfWidth,
      rampMinZ,
      rampMaxZ
    ),
    upperLanding: createCenteredRect(
      geometry,
      geometry.halfWidth,
      geometry.landingMinZ,
      geometry.landingMaxZ
    ),
    explicitDescentCorridor: createCenteredRect(
      geometry,
      getDescentCorridorHalfWidth(geometry, behavior),
      rampMinZ,
      rampMaxZ
    ),
  };
};

export const createGroundStairBoundaryColliders = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  options: GroundStairBoundaryColliderOptions
): NamedStairBoundaryCollider[] => {
  const rampMinZ = getMinZ(geometry.bottomZ, geometry.topZ);
  const rampMaxZ = getMaxZ(geometry.bottomZ, geometry.topZ);
  const stairEastX = geometry.centerX + geometry.halfWidth;
  const eastBoundaryMinX = stairEastX + options.guardThickness;
  const fallbackEastBoundaryMaxX =
    stairEastX +
    geometry.halfWidth +
    behavior.transitionMargin +
    options.playerRadius * 2 +
    options.guardThickness * 2;
  const eastBoundaryMaxX = Math.max(
    fallbackEastBoundaryMaxX,
    options.eastBoundaryMaxX ?? fallbackEastBoundaryMaxX
  );
  const eastRunSealMaxX = Math.max(
    eastBoundaryMaxX,
    options.containingRoomMaxX
  );
  const lowerApproachZ =
    geometry.bottomZ - geometry.direction * behavior.transitionMargin;
  const colliders: NamedStairBoundaryCollider[] = [
    {
      name: 'GroundStairEastBoundary',
      bounds: {
        minX: eastBoundaryMinX,
        maxX: eastBoundaryMaxX,
        minZ: rampMinZ,
        maxZ: rampMaxZ,
      },
    },
    {
      name: 'GroundStairLowerCornerGuard',
      bounds: {
        minX: stairEastX,
        maxX: eastBoundaryMaxX,
        minZ: getMinZ(geometry.bottomZ, lowerApproachZ),
        maxZ: getMaxZ(geometry.bottomZ, lowerApproachZ),
      },
    },
  ];

  if (eastRunSealMaxX > eastBoundaryMaxX) {
    colliders.push({
      name: 'GroundStairEastRunSeal',
      bounds: {
        minX: eastBoundaryMaxX,
        maxX: eastRunSealMaxX,
        minZ: rampMinZ,
        maxZ: rampMaxZ,
      },
    });
  }

  return colliders;
};

const isInExplicitDescentCorridor = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  z: number
): boolean => {
  const rampMinZ = getMinZ(geometry.bottomZ, geometry.topZ);
  const rampMaxZ = getMaxZ(geometry.bottomZ, geometry.topZ);
  const descentDistance = getDescentDistanceFromLanding(geometry, z);
  const insideRampZ = isWithinZRange(
    z,
    rampMinZ,
    rampMaxZ,
    behavior.transitionMargin * 0.5
  );

  // Keep the upper doorway bridge beyond the stair-top handoff from
  // masquerading as an intentional stair descent.
  const explicitDescentMaxDistance =
    behavior.transitionMargin + behavior.landingTriggerMargin;

  return (
    descentDistance > behavior.landingTriggerMargin &&
    descentDistance <= explicitDescentMaxDistance &&
    insideRampZ &&
    isWithinDescentCorridorWidth(geometry, behavior, x)
  );
};

export const classifyStairTransitionZone = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  z: number,
  current: FloorId
): StairTransitionZone => {
  const inActualStairWidth = isWithinStairWidth(geometry, x);
  const inTransitionWidth = isWithinStairWidth(
    geometry,
    x,
    behavior.transitionMargin
  );

  // Named zones intentionally separate upper-floor intent from ground-floor
  // ascent. The safe upper floor includes rooms and landing-edge positions near
  // the stair void; only the stricter explicit descent corridor may hand the
  // player from upper to ground. This avoids teleport goblins when layouts move.
  if (isWithinLanding(geometry, x, z, behavior.landingTriggerMargin)) {
    return 'upperLanding';
  }

  if (
    current === 'upper' &&
    isInExplicitDescentCorridor(geometry, behavior, x, z)
  ) {
    return 'explicitDescentCorridor';
  }

  if (current === 'upper') {
    return 'safeUpperFloor';
  }

  const direction = geometry.direction;

  if (inActualStairWidth && isWithinRampRun(geometry, z)) {
    return 'stairRampBody';
  }

  const nearLowerEntrance =
    direction === -1
      ? z >= geometry.bottomZ - behavior.transitionMargin &&
        z <= geometry.bottomZ
      : z <= geometry.bottomZ + behavior.transitionMargin &&
        z >= geometry.bottomZ;
  if (inTransitionWidth && nearLowerEntrance) {
    return 'lowerStairEntrance';
  }

  return 'outsideStairs';
};

export const predictStairFloorId = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  x: number,
  z: number,
  current: FloorId
): FloorId => {
  const zone = classifyStairTransitionZone(geometry, behavior, x, z, current);
  const rampHeight = computeRampHeight(geometry, behavior, x, z);
  const withinPhysicalStairs = isWithinPhysicalStairWidth(geometry, x);
  const withinRampRun = isWithinRampRun(geometry, z);
  const direction = geometry.direction;

  if (current === 'upper') {
    return zone === 'explicitDescentCorridor' ? 'ground' : 'upper';
  }

  if (isInExplicitDescentCorridor(geometry, behavior, x, z)) {
    return 'ground';
  }

  const nearTop =
    direction === -1
      ? z <= geometry.topZ + behavior.transitionMargin
      : z >= geometry.topZ - behavior.transitionMargin;

  const nearLanding =
    withinPhysicalStairs &&
    withinRampRun &&
    (nearTop || rampHeight >= geometry.totalRise - behavior.stepRise * 0.25);
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
  const zone = classifyStairTransitionZone(
    geometry,
    behavior,
    x,
    z,
    currentFloor
  );
  if (
    predictedFloor === 'upper' &&
    zone !== 'explicitDescentCorridor' &&
    currentFloor === 'upper'
  ) {
    return upperFloorElevation;
  }

  if (isInExplicitDescentCorridor(geometry, behavior, x, z)) {
    const blendRange = Math.max(
      behavior.transitionMargin - behavior.landingTriggerMargin,
      DENOMINATOR_EPSILON
    );
    const descentDistance = getDescentDistanceFromLanding(geometry, z);
    const descentProgress = MathUtils.clamp(
      (descentDistance - behavior.landingTriggerMargin) / blendRange,
      0,
      1
    );
    const lipBlend = getSmoothstep(descentProgress);

    return MathUtils.lerp(upperFloorElevation, clampedRamp, lipBlend);
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
