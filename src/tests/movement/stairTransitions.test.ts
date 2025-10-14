import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  predictStairFloorId,
  type FloorId,
  type StairBehavior,
  type StairGeometry,
} from '../../systems/movement/stairs';

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

const STAIR_GEOMETRY: StairGeometry = {
  centerX: toWorldUnits(6.2),
  halfWidth: toWorldUnits(3.1) / 2,
  bottomZ: toWorldUnits(-5.3),
  topZ: toWorldUnits(-5.3) - toWorldUnits(0.85) * 9,
  landingMinZ: toWorldUnits(-5.3) - toWorldUnits(0.85) * 9 - toWorldUnits(2.6),
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

  it('stays on the upper floor while roaming across the landing', () => {
    const currentFloor: FloorId = 'upper';
    const landingInteriorZ = STAIR_GEOMETRY.landingMinZ + toWorldUnits(0.6);
    const result = predictStairFloorId(
      STAIR_GEOMETRY,
      STAIR_BEHAVIOR,
      STAIR_GEOMETRY.centerX,
      landingInteriorZ,
      currentFloor
    );

    expect(result).toBe('upper');
  });

  it('does not leave the upper floor when west of the stair base', () => {
    const currentFloor: FloorId = 'upper';
    const westLandingX =
      STAIR_GEOMETRY.centerX - STAIR_GEOMETRY.halfWidth + toWorldUnits(0.15);
    const southOfLandingZ = STAIR_GEOMETRY.bottomZ + toWorldUnits(0.35);
    const result = predictStairFloorId(
      STAIR_GEOMETRY,
      STAIR_BEHAVIOR,
      westLandingX,
      southOfLandingZ,
      currentFloor
    );

    expect(result).toBe('upper');
  });

  it('switches to the ground floor after leaving the landing for the ramp', () => {
    const currentFloor: FloorId = 'upper';
    const firstStepZ = STAIR_GEOMETRY.topZ + toWorldUnits(0.3);
    const result = predictStairFloorId(
      STAIR_GEOMETRY,
      STAIR_BEHAVIOR,
      STAIR_GEOMETRY.centerX,
      firstStepZ,
      currentFloor
    );

    expect(result).toBe('ground');
  });

  it('remains on the ground after passing the stair base', () => {
    const currentFloor: FloorId = 'upper';
    const groundExitZ = STAIR_GEOMETRY.bottomZ + toWorldUnits(0.1);
    const result = predictStairFloorId(
      STAIR_GEOMETRY,
      STAIR_BEHAVIOR,
      STAIR_GEOMETRY.centerX,
      groundExitZ,
      currentFloor
    );

    expect(result).toBe('ground');
  });
});
