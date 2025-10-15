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

  const guardApproachZ = config.baseZ - directionMultiplier * config.guardMargin;
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

