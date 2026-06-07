export type StairDirection = 'positiveZ' | 'negativeZ';

export interface StairLayoutConfig {
  baseZ: number;
  stepRun: number;
  stepCount: number;
  landingDepth: number;
  direction?: StairDirection;
  guardMargin: number;
  stairwellMargin: number;
}

export interface StairwellBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface StairwellOpeningConfig {
  centerX: number;
  halfWidth: number;
  marginX: number;
  roomBounds: StairwellBounds;
  layout: Pick<
    StairLayoutResult,
    'directionMultiplier' | 'landingMinZ' | 'landingMaxZ' | 'stairHoleRange'
  >;
}

export interface StairLayoutResult {
  topZ: number;
  landingMinZ: number;
  landingMaxZ: number;
  directionMultiplier: 1 | -1;
  guardRange: { minZ: number; maxZ: number };
  stairHoleRange: { minZ: number; maxZ: number };
}

const resolveDirectionMultiplier = (
  direction: StairLayoutConfig['direction']
): 1 | -1 => (direction === 'negativeZ' ? -1 : 1);

export const computeStairLayout = (
  config: StairLayoutConfig
): StairLayoutResult => {
  const directionMultiplier = resolveDirectionMultiplier(config.direction);
  const totalRun = config.stepRun * config.stepCount;
  const topZ = config.baseZ + directionMultiplier * totalRun;
  const landingFarZ = topZ + directionMultiplier * config.landingDepth;
  const landingMinZ = Math.min(topZ, landingFarZ);
  const landingMaxZ = Math.max(topZ, landingFarZ);

  const guardApproachZ =
    config.baseZ - directionMultiplier * config.guardMargin;
  const guardRangeMin = Math.min(
    landingMinZ,
    landingMaxZ,
    config.baseZ,
    guardApproachZ
  );
  const guardRangeMax = Math.max(
    landingMinZ,
    landingMaxZ,
    config.baseZ,
    guardApproachZ
  );

  const landingHoleEdge =
    directionMultiplier === -1
      ? landingMinZ - config.stairwellMargin
      : landingMaxZ + config.stairwellMargin;
  const bottomHoleEdge =
    directionMultiplier === -1
      ? config.baseZ + config.stairwellMargin
      : config.baseZ - config.stairwellMargin;
  const stairHoleMinZ = Math.min(landingHoleEdge, bottomHoleEdge);
  const stairHoleMaxZ = Math.max(landingHoleEdge, bottomHoleEdge);

  return {
    topZ,
    landingMinZ,
    landingMaxZ,
    directionMultiplier,
    guardRange: { minZ: guardRangeMin, maxZ: guardRangeMax },
    stairHoleRange: { minZ: stairHoleMinZ, maxZ: stairHoleMaxZ },
  };
};

/**
 * Clips the visible upstairs stairwell hole to the landing room while deriving
 * the stair landing void from `computeStairLayout`. Movement and visuals
 * therefore use the same threshold metrics without cutting away the normal
 * upper-floor doorway bridge beyond the stair top.
 */
export const computeStairwellOpeningBounds = (
  config: StairwellOpeningConfig
): StairwellBounds => {
  const openingMinZ =
    config.layout.directionMultiplier === -1
      ? config.layout.stairHoleRange.minZ
      : config.layout.landingMinZ;
  const openingMaxZ =
    config.layout.directionMultiplier === -1
      ? config.layout.landingMaxZ
      : config.layout.stairHoleRange.maxZ;

  return {
    minX: Math.max(
      config.roomBounds.minX,
      config.centerX - config.halfWidth - config.marginX
    ),
    maxX: Math.min(
      config.roomBounds.maxX,
      config.centerX + config.halfWidth + config.marginX
    ),
    minZ: Math.max(config.roomBounds.minZ, openingMinZ),
    maxZ: Math.min(config.roomBounds.maxZ, openingMaxZ),
  };
};
