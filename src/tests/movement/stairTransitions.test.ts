import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../floorPlan';
import {
  createStairFloorPredictor,
  type StairTransitionMetrics,
} from '../../movement/stairTransition';

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

const STAIR_METRICS: StairTransitionMetrics = {
  stairCenterX: toWorldUnits(6.2),
  stairHalfWidth: toWorldUnits(3.1) / 2,
  stairBottomZ: toWorldUnits(-5.3),
  stairRun: toWorldUnits(0.85),
  stairTopZ: 0,
  stairLandingDepth: toWorldUnits(2.6),
  stairLandingMinZ: 0,
  stairTotalRise: 0.42 * 9,
  stairTransitionMargin: toWorldUnits(0.6),
  stepRise: 0.42,
};

STAIR_METRICS.stairTopZ =
  STAIR_METRICS.stairBottomZ - STAIR_METRICS.stairRun * 9;
STAIR_METRICS.stairLandingMinZ =
  STAIR_METRICS.stairTopZ - STAIR_METRICS.stairLandingDepth;

const predictFloor = createStairFloorPredictor(STAIR_METRICS);

describe('stair floor predictor', () => {
  it('keeps the player on the upper floor when walking above the stairwell', () => {
    const walkwayZ =
      (STAIR_METRICS.stairTopZ + STAIR_METRICS.stairBottomZ) / 2;
    const floor = predictFloor(
      STAIR_METRICS.stairCenterX,
      walkwayZ,
      'upper'
    );
    expect(floor).toBe('upper');
  });

  it('allows descending when standing on the landing plate', () => {
    const landingZ = STAIR_METRICS.stairTopZ - toWorldUnits(0.1);
    const floor = predictFloor(
      STAIR_METRICS.stairCenterX,
      landingZ,
      'upper'
    );
    expect(floor).toBe('ground');
  });

  it('keeps the player on the ground floor when stepping onto the first tread', () => {
    const firstTreadZ =
      STAIR_METRICS.stairTopZ + STAIR_METRICS.stairRun * 0.5;
    const floor = predictFloor(
      STAIR_METRICS.stairCenterX,
      firstTreadZ,
      'ground'
    );
    expect(floor).toBe('ground');
  });
});
