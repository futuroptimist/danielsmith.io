import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  classifyStairTransitionZone,
  createStairNavAreaRect,
  createUpperStairEdgeGuardColliders,
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

const predict = (
  geometry: StairGeometry,
  currentFloor: FloorId,
  x: number,
  z: number
): FloorId => predictStairFloorId(geometry, STAIR_BEHAVIOR, x, z, currentFloor);

describe('stair floor transitions (negative Z ascent)', () => {
  it('transitions from ground to upper near the top of the stairs', () => {
    const nearTopZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.05);
    const result = predict(
      NEGATIVE_Z_STAIRS,
      'ground',
      NEGATIVE_Z_STAIRS.centerX,
      nearTopZ
    );

    expect(result).toBe('upper');
  });

  it('stays on the upper floor while roaming across the landing', () => {
    const landingInteriorZ = NEGATIVE_Z_STAIRS.landingMinZ + toWorldUnits(0.6);
    const result = predict(
      NEGATIVE_Z_STAIRS,
      'upper',
      NEGATIVE_Z_STAIRS.centerX,
      landingInteriorZ
    );

    expect(result).toBe('upper');
  });

  it('keeps nearby upper rooms on the upper floor', () => {
    const upperRoomX = NEGATIVE_Z_STAIRS.centerX - toWorldUnits(4.2);
    const upperRoomZ = NEGATIVE_Z_STAIRS.topZ - toWorldUnits(2.2);
    const result = predict(NEGATIVE_Z_STAIRS, 'upper', upperRoomX, upperRoomZ);

    expect(result).toBe('upper');
  });

  it('does not leave the upper floor when west of the stair base', () => {
    const westLandingX =
      NEGATIVE_Z_STAIRS.centerX -
      NEGATIVE_Z_STAIRS.halfWidth +
      toWorldUnits(0.15);
    const southOfLandingZ = NEGATIVE_Z_STAIRS.bottomZ + toWorldUnits(0.35);
    const result = predict(
      NEGATIVE_Z_STAIRS,
      'upper',
      westLandingX,
      southOfLandingZ
    );

    expect(result).toBe('upper');
  });

  it('keeps the screenshot-like upper landing edge on the upper floor', () => {
    const shoulderX =
      NEGATIVE_Z_STAIRS.centerX +
      NEGATIVE_Z_STAIRS.halfWidth +
      STAIR_BEHAVIOR.transitionMargin * 0.35;
    const landingEdgeZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.35);
    const result = predict(NEGATIVE_Z_STAIRS, 'upper', shoulderX, landingEdgeZ);

    expect(result).toBe('upper');
    expect(
      classifyStairTransitionZone(
        NEGATIVE_Z_STAIRS,
        STAIR_BEHAVIOR,
        shoulderX,
        landingEdgeZ,
        'upper'
      )
    ).toBe('safeUpperFloor');
  });

  it('switches to the ground floor after entering the descent corridor', () => {
    const firstStepZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.3);
    const result = predict(
      NEGATIVE_Z_STAIRS,
      'upper',
      NEGATIVE_Z_STAIRS.centerX,
      firstStepZ
    );

    expect(result).toBe('ground');
    expect(
      classifyStairTransitionZone(
        NEGATIVE_Z_STAIRS,
        STAIR_BEHAVIOR,
        NEGATIVE_Z_STAIRS.centerX,
        firstStepZ,
        'upper'
      )
    ).toBe('explicitDescentCorridor');
  });

  it('remains on the ground after passing the stair base', () => {
    const groundExitZ = NEGATIVE_Z_STAIRS.bottomZ + toWorldUnits(0.1);
    const result = predict(
      NEGATIVE_Z_STAIRS,
      'upper',
      NEGATIVE_Z_STAIRS.centerX,
      groundExitZ
    );

    expect(result).toBe('ground');
  });

  it('does not transition floors for lateral movement outside the stair width', () => {
    const outsideX =
      NEGATIVE_Z_STAIRS.centerX +
      NEGATIVE_Z_STAIRS.halfWidth +
      toWorldUnits(0.1);
    const topEdgeZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.1);

    expect(predict(NEGATIVE_Z_STAIRS, 'upper', outsideX, topEdgeZ)).toBe(
      'upper'
    );
    expect(predict(NEGATIVE_Z_STAIRS, 'ground', outsideX, topEdgeZ)).toBe(
      'ground'
    );
  });

  it('guards upper stair shoulders without blocking the center descent corridor', () => {
    const [westGuard, eastGuard] = createUpperStairEdgeGuardColliders(
      NEGATIVE_Z_STAIRS,
      STAIR_BEHAVIOR
    );
    const firstStepZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.3);

    expect(westGuard.maxX).toBeLessThanOrEqual(
      NEGATIVE_Z_STAIRS.centerX - NEGATIVE_Z_STAIRS.halfWidth
    );
    expect(eastGuard.minX).toBeGreaterThanOrEqual(
      NEGATIVE_Z_STAIRS.centerX + NEGATIVE_Z_STAIRS.halfWidth
    );
    expect(NEGATIVE_Z_STAIRS.centerX).toBeGreaterThan(westGuard.maxX);
    expect(NEGATIVE_Z_STAIRS.centerX).toBeLessThan(eastGuard.minX);
    expect(firstStepZ).toBeGreaterThanOrEqual(westGuard.minZ);
    expect(firstStepZ).toBeLessThanOrEqual(westGuard.maxZ);
  });
});

describe('stair floor transitions (positive Z ascent)', () => {
  const positiveGeometry = createStairGeometry(1);

  it('keeps the player on the upper floor across the landing interior', () => {
    const landingInteriorZ = positiveGeometry.landingMaxZ - toWorldUnits(0.6);
    const result = predict(
      positiveGeometry,
      'upper',
      positiveGeometry.centerX,
      landingInteriorZ
    );

    expect(result).toBe('upper');
  });

  it('switches to the ground floor after stepping off the landing', () => {
    const firstStepZ = positiveGeometry.topZ - toWorldUnits(0.3);
    const result = predict(
      positiveGeometry,
      'upper',
      positiveGeometry.centerX,
      firstStepZ
    );

    expect(result).toBe('ground');
  });

  it('remains on the ground after moving past the stair base', () => {
    const groundExitZ = positiveGeometry.bottomZ - toWorldUnits(0.1);
    const result = predict(
      positiveGeometry,
      'upper',
      positiveGeometry.centerX,
      groundExitZ
    );

    expect(result).toBe('ground');
  });

  it('ignores stair transitions when outside the stair width', () => {
    const farEastX = positiveGeometry.centerX + toWorldUnits(2.5);
    const landingMidpointZ =
      (positiveGeometry.landingMinZ + positiveGeometry.landingMaxZ) / 2;
    const result = predict(
      positiveGeometry,
      'ground',
      farEastX,
      landingMidpointZ
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
