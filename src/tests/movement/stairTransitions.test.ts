import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  createStairNavAreaRect,
  predictStairFloorId,
  type FloorId,
  type StairBehavior,
  type StairGeometry,
} from '../../systems/movement/stairs';

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

const createStairGeometry = (direction: 1 | -1): StairGeometry => {
  const centerX = toWorldUnits(6.2);
  const halfWidth = toWorldUnits(3.1) / 2;
  const bottomZ = toWorldUnits(-5.3);
  const stepRun = toWorldUnits(0.85);
  const topZ = bottomZ + direction * stepRun * 9;
  const landingDepth = toWorldUnits(2.6);
  const landingFarZ = topZ + direction * landingDepth;
  return {
    centerX,
    halfWidth,
    bottomZ,
    topZ,
    landingMinZ: Math.min(topZ, landingFarZ),
    landingMaxZ: Math.max(topZ, landingFarZ),
    totalRise: 0.42 * 9,
    direction,
  };
};

const NEGATIVE_Z_STAIRS = createStairGeometry(-1);

const STAIR_BEHAVIOR: StairBehavior = {
  transitionMargin: toWorldUnits(0.6),
  landingTriggerMargin: toWorldUnits(0.2),
  stepRise: 0.42,
};

describe('stair floor transitions (negative Z ascent)', () => {
  it('keeps the player on the upper floor when walking above the stair void', () => {
    const currentFloor: FloorId = 'upper';
    const walkwayZ = NEGATIVE_Z_STAIRS.bottomZ - toWorldUnits(0.2);
    const result = predictStairFloorId(
      NEGATIVE_Z_STAIRS,
      STAIR_BEHAVIOR,
      NEGATIVE_Z_STAIRS.centerX,
      walkwayZ,
      currentFloor
    );

    expect(result).toBe('upper');
  });

  it('stays on the upper floor while roaming across the landing', () => {
    const currentFloor: FloorId = 'upper';
    const landingInteriorZ = NEGATIVE_Z_STAIRS.landingMinZ + toWorldUnits(0.6);
    const result = predictStairFloorId(
      NEGATIVE_Z_STAIRS,
      STAIR_BEHAVIOR,
      NEGATIVE_Z_STAIRS.centerX,
      landingInteriorZ,
      currentFloor
    );

    expect(result).toBe('upper');
  });

  it('does not leave the upper floor when west of the stair base', () => {
    const currentFloor: FloorId = 'upper';
    const westLandingX =
      NEGATIVE_Z_STAIRS.centerX -
      NEGATIVE_Z_STAIRS.halfWidth +
      toWorldUnits(0.15);
    const southOfLandingZ = NEGATIVE_Z_STAIRS.bottomZ + toWorldUnits(0.35);
    const result = predictStairFloorId(
      NEGATIVE_Z_STAIRS,
      STAIR_BEHAVIOR,
      westLandingX,
      southOfLandingZ,
      currentFloor
    );

    expect(result).toBe('upper');
  });

  it('switches to the ground floor after leaving the landing for the ramp', () => {
    const currentFloor: FloorId = 'upper';
    const firstStepZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.3);
    const result = predictStairFloorId(
      NEGATIVE_Z_STAIRS,
      STAIR_BEHAVIOR,
      NEGATIVE_Z_STAIRS.centerX,
      firstStepZ,
      currentFloor
    );

    expect(result).toBe('ground');
  });

  it('remains on the ground after passing the stair base', () => {
    const currentFloor: FloorId = 'upper';
    const groundExitZ = NEGATIVE_Z_STAIRS.bottomZ + toWorldUnits(0.1);
    const result = predictStairFloorId(
      NEGATIVE_Z_STAIRS,
      STAIR_BEHAVIOR,
      NEGATIVE_Z_STAIRS.centerX,
      groundExitZ,
      currentFloor
    );

    expect(result).toBe('ground');
  });
});

describe('stair floor transitions (positive Z ascent)', () => {
  const positiveGeometry = createStairGeometry(1);

  it('keeps the player on the upper floor across the landing interior', () => {
    const currentFloor: FloorId = 'upper';
    const landingInteriorZ = positiveGeometry.landingMaxZ - toWorldUnits(0.6);
    const result = predictStairFloorId(
      positiveGeometry,
      STAIR_BEHAVIOR,
      positiveGeometry.centerX,
      landingInteriorZ,
      currentFloor
    );

    expect(result).toBe('upper');
  });

  it('switches to the ground floor after stepping off the landing', () => {
    const currentFloor: FloorId = 'upper';
    const firstStepZ = positiveGeometry.topZ - toWorldUnits(0.3);
    const result = predictStairFloorId(
      positiveGeometry,
      STAIR_BEHAVIOR,
      positiveGeometry.centerX,
      firstStepZ,
      currentFloor
    );

    expect(result).toBe('ground');
  });

  it('remains on the ground after moving past the stair base', () => {
    const currentFloor: FloorId = 'upper';
    const groundExitZ = positiveGeometry.bottomZ - toWorldUnits(0.1);
    const result = predictStairFloorId(
      positiveGeometry,
      STAIR_BEHAVIOR,
      positiveGeometry.centerX,
      groundExitZ,
      currentFloor
    );

    expect(result).toBe('ground');
  });

  it('ignores stair transitions when outside the stair width', () => {
    const currentFloor: FloorId = 'ground';
    const farEastX = positiveGeometry.centerX + toWorldUnits(2.5);
    const landingMidpointZ =
      (positiveGeometry.landingMinZ + positiveGeometry.landingMaxZ) / 2;
    const result = predictStairFloorId(
      positiveGeometry,
      STAIR_BEHAVIOR,
      farEastX,
      landingMidpointZ,
      currentFloor
    );

    expect(result).toBe('ground');
  });
});

describe('createStairNavAreaRect', () => {
  it('expands the stair footprint with margins', () => {
    const marginX = toWorldUnits(0.25);
    const marginZ = toWorldUnits(0.5);
    const rect = createStairNavAreaRect(NEGATIVE_Z_STAIRS, {
      marginX,
      marginZ,
    });

    const expectedMinZ = Math.min(
      NEGATIVE_Z_STAIRS.bottomZ,
      NEGATIVE_Z_STAIRS.topZ,
      NEGATIVE_Z_STAIRS.landingMinZ,
      NEGATIVE_Z_STAIRS.landingMaxZ
    );
    const expectedMaxZ = Math.max(
      NEGATIVE_Z_STAIRS.bottomZ,
      NEGATIVE_Z_STAIRS.topZ,
      NEGATIVE_Z_STAIRS.landingMinZ,
      NEGATIVE_Z_STAIRS.landingMaxZ
    );

    expect(rect.minX).toBeCloseTo(
      NEGATIVE_Z_STAIRS.centerX - NEGATIVE_Z_STAIRS.halfWidth - marginX,
      6
    );
    expect(rect.maxX).toBeCloseTo(
      NEGATIVE_Z_STAIRS.centerX + NEGATIVE_Z_STAIRS.halfWidth + marginX,
      6
    );
    expect(rect.minZ).toBeCloseTo(expectedMinZ - marginZ, 6);
    expect(rect.maxZ).toBeCloseTo(expectedMaxZ + marginZ, 6);
  });
});
