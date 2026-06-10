import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  classifyStairTransitionZone,
  createStairNavAreaRect,
  createStairNavigationZones,
  predictStairFloorId,
  sampleStairSurfaceHeight,
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
const UPPER_FLOOR_ELEVATION = NEGATIVE_Z_STAIRS.totalRise + 0.38;
const SCREENSHOT_4_SOURCE_POINT = { x: 7.4, z: -25.27 };
const SCREENSHOT_4_LIFT_POINT = { x: 8.14, z: -25.36 };

const STAIR_BEHAVIOR: StairBehavior = {
  transitionMargin: toWorldUnits(0.6),
  landingTriggerMargin: toWorldUnits(0.2),
  stepRise: 0.42,
  descentCorridorInset: 0.75,
};

const predict = (
  geometry: StairGeometry,
  x: number,
  z: number,
  currentFloor: FloorId
): FloorId => predictStairFloorId(geometry, STAIR_BEHAVIOR, x, z, currentFloor);

const classify = (
  geometry: StairGeometry,
  x: number,
  z: number,
  currentFloor: FloorId
) => classifyStairTransitionZone(geometry, STAIR_BEHAVIOR, x, z, currentFloor);

const containsPoint = (
  rect: { minX: number; maxX: number; minZ: number; maxZ: number },
  point: { x: number; z: number }
): boolean =>
  point.x >= rect.minX &&
  point.x <= rect.maxX &&
  point.z >= rect.minZ &&
  point.z <= rect.maxZ;

describe('stair floor transitions (negative Z ascent)', () => {
  it('keeps ground ascent on ground until the physical stair top', () => {
    const beforeTopStepZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.15);

    expect(
      predict(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        beforeTopStepZ,
        'ground'
      )
    ).toBe('ground');
  });

  it('transitions from ground to upper at and past the stair top', () => {
    for (const z of [
      NEGATIVE_Z_STAIRS.topZ,
      NEGATIVE_Z_STAIRS.topZ - toWorldUnits(0.05),
      NEGATIVE_Z_STAIRS.topZ - toWorldUnits(0.4),
    ]) {
      expect(
        predict(NEGATIVE_Z_STAIRS, NEGATIVE_Z_STAIRS.centerX, z, 'ground')
      ).toBe('upper');
    }
  });

  it('keeps screenshot-4 off-stair ground points near the top on ground', () => {
    for (const point of [SCREENSHOT_4_SOURCE_POINT, SCREENSHOT_4_LIFT_POINT]) {
      expect(classify(NEGATIVE_Z_STAIRS, point.x, point.z, 'ground')).toBe(
        'outsideStairs'
      );
      expect(predict(NEGATIVE_Z_STAIRS, point.x, point.z, 'ground')).toBe(
        'ground'
      );
    }
  });

  it('does not lift screenshot-4 off-stair points onto the upper surface', () => {
    const height = sampleStairSurfaceHeight({
      geometry: NEGATIVE_Z_STAIRS,
      behavior: STAIR_BEHAVIOR,
      x: SCREENSHOT_4_LIFT_POINT.x,
      z: SCREENSHOT_4_LIFT_POINT.z,
      currentFloor: 'ground',
      upperFloorElevation: UPPER_FLOOR_ELEVATION,
    });

    expect(height).toBe(0);
  });

  it('keeps ground-floor positions past the ramp run on ground', () => {
    const upperDoorwayBridgeZ = NEGATIVE_Z_STAIRS.topZ - toWorldUnits(0.6);

    expect(
      classify(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        upperDoorwayBridgeZ,
        'ground'
      )
    ).toBe('upperLanding');
    expect(
      predict(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        upperDoorwayBridgeZ,
        'ground'
      )
    ).toBe('upper');
  });

  it('keeps the player on the upper floor while roaming across the landing', () => {
    const landingInteriorZ = NEGATIVE_Z_STAIRS.landingMinZ + toWorldUnits(0.6);

    expect(
      classify(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        landingInteriorZ,
        'upper'
      )
    ).toBe('upperLanding');
    expect(
      predict(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        landingInteriorZ,
        'upper'
      )
    ).toBe('upper');
  });

  it('keeps the player on upper in nearby upstairs room/landing-edge space', () => {
    const nearbyRoomX = NEGATIVE_Z_STAIRS.centerX + toWorldUnits(3.0);
    const upperRoomZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(1.1);

    expect(classify(NEGATIVE_Z_STAIRS, nearbyRoomX, upperRoomZ, 'upper')).toBe(
      'safeUpperFloor'
    );
    expect(predict(NEGATIVE_Z_STAIRS, nearbyRoomX, upperRoomZ, 'upper')).toBe(
      'upper'
    );
  });

  it('does not teleport at the screenshot-like upper landing edge', () => {
    const oldSharedNavEdgeX =
      NEGATIVE_Z_STAIRS.centerX +
      NEGATIVE_Z_STAIRS.halfWidth -
      toWorldUnits(0.1);
    const slightlyDownFromLandingZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.7);

    expect(
      classify(
        NEGATIVE_Z_STAIRS,
        oldSharedNavEdgeX,
        slightlyDownFromLandingZ,
        'upper'
      )
    ).toBe('safeUpperFloor');
    expect(
      predict(
        NEGATIVE_Z_STAIRS,
        oldSharedNavEdgeX,
        slightlyDownFromLandingZ,
        'upper'
      )
    ).toBe('upper');
  });

  it('keeps the preserved upper doorway bridge on the upper floor', () => {
    const preservedBridgeZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(2.0);

    expect(
      classify(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        preservedBridgeZ,
        'upper'
      )
    ).toBe('safeUpperFloor');
    expect(
      predict(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        preservedBridgeZ,
        'upper'
      )
    ).toBe('upper');
  });

  it('keeps upper-floor positions outside the explicit descent corridor upstairs', () => {
    const outsideCorridorX =
      NEGATIVE_Z_STAIRS.centerX +
      NEGATIVE_Z_STAIRS.halfWidth -
      toWorldUnits(0.15);
    const descentZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.7);

    expect(
      classify(NEGATIVE_Z_STAIRS, outsideCorridorX, descentZ, 'upper')
    ).toBe('safeUpperFloor');
    expect(
      predict(NEGATIVE_Z_STAIRS, outsideCorridorX, descentZ, 'upper')
    ).toBe('upper');
  });

  it('transitions to ground only inside the explicit descent corridor', () => {
    const descentZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.7);

    expect(
      classify(NEGATIVE_Z_STAIRS, NEGATIVE_Z_STAIRS.centerX, descentZ, 'upper')
    ).toBe('explicitDescentCorridor');
    expect(
      predict(NEGATIVE_Z_STAIRS, NEGATIVE_Z_STAIRS.centerX, descentZ, 'upper')
    ).toBe('ground');
  });

  it('keeps a deliberate descent on ground through the top handoff band', () => {
    const firstDescentStepZ =
      NEGATIVE_Z_STAIRS.topZ + STAIR_BEHAVIOR.landingTriggerMargin + 0.01;

    expect(
      classify(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        firstDescentStepZ,
        'upper'
      )
    ).toBe('explicitDescentCorridor');
    expect(
      predict(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        firstDescentStepZ,
        'upper'
      )
    ).toBe('ground');
    expect(
      predict(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        firstDescentStepZ,
        'ground'
      )
    ).toBe('ground');
  });

  it('does not transition floors for lateral movement outside stair width', () => {
    const farEastX = NEGATIVE_Z_STAIRS.centerX + toWorldUnits(2.5);
    const descentZ = NEGATIVE_Z_STAIRS.topZ + toWorldUnits(0.7);

    expect(predict(NEGATIVE_Z_STAIRS, farEastX, descentZ, 'upper')).toBe(
      'upper'
    );
    expect(predict(NEGATIVE_Z_STAIRS, farEastX, descentZ, 'ground')).toBe(
      'ground'
    );
  });

  it('keeps ground descents on the ground after passing the stair base', () => {
    const groundExitZ = NEGATIVE_Z_STAIRS.bottomZ + toWorldUnits(0.1);

    expect(
      predict(
        NEGATIVE_Z_STAIRS,
        NEGATIVE_Z_STAIRS.centerX,
        groundExitZ,
        'ground'
      )
    ).toBe('ground');
  });

  it('keeps ordinary upper rooms inside the stair-base margin on the upper floor', () => {
    const loftRoomZ = NEGATIVE_Z_STAIRS.bottomZ + toWorldUnits(0.3);

    expect(
      classify(NEGATIVE_Z_STAIRS, NEGATIVE_Z_STAIRS.centerX, loftRoomZ, 'upper')
    ).toBe('safeUpperFloor');
    expect(
      predict(NEGATIVE_Z_STAIRS, NEGATIVE_Z_STAIRS.centerX, loftRoomZ, 'upper')
    ).toBe('upper');
  });

  it('keeps ordinary upper rooms past the stair base on the upper floor', () => {
    const loftRoomZ = NEGATIVE_Z_STAIRS.bottomZ + toWorldUnits(1.3);

    expect(
      classify(NEGATIVE_Z_STAIRS, NEGATIVE_Z_STAIRS.centerX, loftRoomZ, 'upper')
    ).toBe('safeUpperFloor');
    expect(
      predict(NEGATIVE_Z_STAIRS, NEGATIVE_Z_STAIRS.centerX, loftRoomZ, 'upper')
    ).toBe('upper');
  });
});

describe('stair floor transitions (positive Z ascent)', () => {
  const positiveGeometry = createStairGeometry(1);

  it('keeps positive-Z ground ascent on ground until the physical stair top', () => {
    const beforeTopStepZ = positiveGeometry.topZ - toWorldUnits(0.15);

    expect(
      predict(
        positiveGeometry,
        positiveGeometry.centerX,
        beforeTopStepZ,
        'ground'
      )
    ).toBe('ground');
  });

  it('transitions positive-Z ground ascent at and past the stair top', () => {
    for (const z of [
      positiveGeometry.topZ,
      positiveGeometry.topZ + toWorldUnits(0.05),
      positiveGeometry.topZ + toWorldUnits(0.4),
    ]) {
      expect(
        predict(positiveGeometry, positiveGeometry.centerX, z, 'ground')
      ).toBe('upper');
    }
  });

  it('keeps the player on the upper floor across the landing interior', () => {
    const landingInteriorZ = positiveGeometry.landingMaxZ - toWorldUnits(0.6);

    expect(
      predict(
        positiveGeometry,
        positiveGeometry.centerX,
        landingInteriorZ,
        'upper'
      )
    ).toBe('upper');
  });

  it('switches to the ground floor after deliberately entering descent', () => {
    const firstStepZ = positiveGeometry.topZ - toWorldUnits(0.7);

    expect(
      classify(positiveGeometry, positiveGeometry.centerX, firstStepZ, 'upper')
    ).toBe('explicitDescentCorridor');
    expect(
      predict(positiveGeometry, positiveGeometry.centerX, firstStepZ, 'upper')
    ).toBe('ground');
  });

  it('keeps positive-Z descents on ground through the top handoff band', () => {
    const firstDescentStepZ =
      positiveGeometry.topZ - STAIR_BEHAVIOR.landingTriggerMargin - 0.01;

    expect(
      predict(
        positiveGeometry,
        positiveGeometry.centerX,
        firstDescentStepZ,
        'upper'
      )
    ).toBe('ground');
    expect(
      predict(
        positiveGeometry,
        positiveGeometry.centerX,
        firstDescentStepZ,
        'ground'
      )
    ).toBe('ground');
  });

  it('keeps positive-Z ground descents on ground past the stair base', () => {
    const groundExitZ = positiveGeometry.bottomZ - toWorldUnits(0.1);

    expect(
      predict(positiveGeometry, positiveGeometry.centerX, groundExitZ, 'ground')
    ).toBe('ground');
  });

  it('keeps positive-Z upper rooms inside the stair-base margin on upper', () => {
    const upperRoomZ = positiveGeometry.bottomZ - toWorldUnits(0.3);

    expect(
      classify(positiveGeometry, positiveGeometry.centerX, upperRoomZ, 'upper')
    ).toBe('safeUpperFloor');
    expect(
      predict(positiveGeometry, positiveGeometry.centerX, upperRoomZ, 'upper')
    ).toBe('upper');
  });

  it('keeps positive-Z upper rooms past the stair base on the upper floor', () => {
    const upperRoomZ = positiveGeometry.bottomZ - toWorldUnits(1.3);

    expect(
      predict(positiveGeometry, positiveGeometry.centerX, upperRoomZ, 'upper')
    ).toBe('upper');
  });

  it('ignores stair transitions when outside the stair width', () => {
    const farEastX = positiveGeometry.centerX + toWorldUnits(2.5);
    const landingMidpointZ =
      (positiveGeometry.landingMinZ + positiveGeometry.landingMaxZ) / 2;

    expect(
      predict(positiveGeometry, farEastX, landingMidpointZ, 'ground')
    ).toBe('ground');
  });
});

describe('stair navigation zones', () => {
  it('keeps the upper landing out of ground stair navigation zones', () => {
    const zones = createStairNavigationZones(NEGATIVE_Z_STAIRS, STAIR_BEHAVIOR);
    const landingBridgePoint = {
      x: NEGATIVE_Z_STAIRS.centerX,
      z: NEGATIVE_Z_STAIRS.topZ - toWorldUnits(0.6),
    };

    expect(containsPoint(zones.upperLanding, landingBridgePoint)).toBe(true);
    expect(containsPoint(zones.lowerStairEntrance, landingBridgePoint)).toBe(
      false
    );
    expect(containsPoint(zones.stairRampBody, landingBridgePoint)).toBe(false);
  });

  it('exposes narrower upper descent nav than the legacy shared stair footprint', () => {
    const zones = createStairNavigationZones(NEGATIVE_Z_STAIRS, STAIR_BEHAVIOR);
    const legacyRect = createStairNavAreaRect(NEGATIVE_Z_STAIRS, {
      marginX: STAIR_BEHAVIOR.transitionMargin,
      marginZ: STAIR_BEHAVIOR.transitionMargin,
    });

    expect(zones.explicitDescentCorridor.minX).toBeGreaterThan(legacyRect.minX);
    expect(zones.explicitDescentCorridor.maxX).toBeLessThan(legacyRect.maxX);
    expect(zones.stairRampBody.minX).toBeCloseTo(
      NEGATIVE_Z_STAIRS.centerX - NEGATIVE_Z_STAIRS.halfWidth,
      6
    );
    expect(zones.stairRampBody.maxX).toBeCloseTo(
      NEGATIVE_Z_STAIRS.centerX + NEGATIVE_Z_STAIRS.halfWidth,
      6
    );
    expect(zones.upperLanding.minX).toBeCloseTo(
      NEGATIVE_Z_STAIRS.centerX - NEGATIVE_Z_STAIRS.halfWidth,
      6
    );
    expect(zones.upperLanding.maxX).toBeCloseTo(
      NEGATIVE_Z_STAIRS.centerX + NEGATIVE_Z_STAIRS.halfWidth,
      6
    );
    expect(zones.upperLanding.minZ).toBeCloseTo(
      NEGATIVE_Z_STAIRS.landingMinZ,
      6
    );
    expect(zones.upperLanding.maxZ).toBeCloseTo(
      NEGATIVE_Z_STAIRS.landingMaxZ,
      6
    );
  });

  it('expands the legacy stair footprint with margins for compatibility', () => {
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
