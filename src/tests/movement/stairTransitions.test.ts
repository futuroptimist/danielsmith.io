import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../floorPlan';
import {
  predictStairFloorId,
  type FloorId,
  type StairBehavior,
  type StairGeometry,
} from '../../movement/stairs';

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

const STAIR_GEOMETRY: StairGeometry = {
  centerX: toWorldUnits(6.2),
  halfWidth: toWorldUnits(3.1) / 2,
  bottomZ: toWorldUnits(-5.3),
  topZ: toWorldUnits(-5.3) - toWorldUnits(0.85) * 9,
  landingMinZ:
    toWorldUnits(-5.3) - toWorldUnits(0.85) * 9 - toWorldUnits(2.6),
  totalRise: 0.42 * 9,
};

const STAIR_BEHAVIOR: StairBehavior = {
  transitionMargin: toWorldUnits(0.6),
  landingTriggerMargin: toWorldUnits(0.2),
  stepRise: 0.42,
};

describe('stair floor transitions', () => {
  it('keeps the player on the upper floor when walking above the stair void', () => {
    const currentFloor: FloorId = 'upper';
    const walkwayZ = STAIR_GEOMETRY.bottomZ - toWorldUnits(0.2);
    const result = predictStairFloorId(
      STAIR_GEOMETRY,
      STAIR_BEHAVIOR,
      STAIR_GEOMETRY.centerX,
      walkwayZ,
      currentFloor
    );

    expect(result).toBe('upper');
  });

  it('only allows descending when inside the landing zone', () => {
    const currentFloor: FloorId = 'upper';
    const landingZ = STAIR_GEOMETRY.topZ - toWorldUnits(0.1);
    const result = predictStairFloorId(
      STAIR_GEOMETRY,
      STAIR_BEHAVIOR,
      STAIR_GEOMETRY.centerX,
      landingZ,
      currentFloor
    );

    expect(result).toBe('ground');
  });
});
