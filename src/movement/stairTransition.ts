import { MathUtils } from 'three';

export type StairFloorId = 'ground' | 'upper';

export interface StairTransitionMetrics {
  stairCenterX: number;
  stairHalfWidth: number;
  stairBottomZ: number;
  stairTopZ: number;
  stairLandingMinZ: number;
  stairLandingDepth: number;
  stairTotalRise: number;
  stairTransitionMargin: number;
  stairRun: number;
  stepRise: number;
}

const createWidthPredicate = (
  stairCenterX: number,
  stairHalfWidth: number
) =>
  (x: number, margin = 0) =>
    Math.abs(x - stairCenterX) <= stairHalfWidth + margin;

const createLandingPredicate = (
  stairCenterX: number,
  stairHalfWidth: number,
  stairLandingMinZ: number,
  stairTopZ: number
) =>
  (x: number, z: number, margin = 0) =>
    Math.abs(x - stairCenterX) <= stairHalfWidth + margin &&
    z >= stairLandingMinZ - margin &&
    z <= stairTopZ + margin;

export function createRampHeightCalculator({
  stairCenterX,
  stairHalfWidth,
  stairBottomZ,
  stairTopZ,
  stairTotalRise,
  stairTransitionMargin,
}: StairTransitionMetrics) {
  const isWithinStairWidth = createWidthPredicate(stairCenterX, stairHalfWidth);

  return (x: number, z: number): number => {
    if (!isWithinStairWidth(x, stairTransitionMargin)) {
      return 0;
    }
    const denominator = stairBottomZ - stairTopZ;
    if (Math.abs(denominator) <= 1e-6) {
      return 0;
    }
    const progress = (stairBottomZ - z) / denominator;
    if (!Number.isFinite(progress)) {
      return 0;
    }
    const clamped = MathUtils.clamp(progress, 0, 1);
    return clamped * stairTotalRise;
  };
}

export function createStairFloorPredictor(
  metrics: StairTransitionMetrics
) {
  const {
    stairCenterX,
    stairHalfWidth,
    stairTopZ,
    stairLandingMinZ,
    stairTotalRise,
    stairTransitionMargin,
    stepRise,
  } = metrics;

  const isWithinStairWidth = createWidthPredicate(stairCenterX, stairHalfWidth);
  const isWithinLanding = createLandingPredicate(
    stairCenterX,
    stairHalfWidth,
    stairLandingMinZ,
    stairTopZ
  );
  const computeRampHeight = createRampHeightCalculator(metrics);

  return (x: number, z: number, current: StairFloorId): StairFloorId => {
    const rampHeight = computeRampHeight(x, z);
    const withinStairs = isWithinStairWidth(x, stairTransitionMargin);
    const onLanding = isWithinLanding(x, z, stairTransitionMargin);

    if (current === 'upper') {
      return onLanding ? 'ground' : 'upper';
    }

    const nearLanding =
      onLanding ||
      (withinStairs &&
        rampHeight >= stairTotalRise - stepRise * 0.25);
    if (nearLanding) {
      return 'upper';
    }

    return 'ground';
  };
}
