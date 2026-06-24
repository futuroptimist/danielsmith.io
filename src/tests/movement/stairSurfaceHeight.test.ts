import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../../scene/level/floorElevations';
import {
  computeRampHeight,
  sampleStairSurfaceHeight,
  type FloorId,
  type StairBehavior,
  type StairGeometry,
} from '../../systems/movement/stairs';

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

const geometry: StairGeometry = {
  centerX: 0,
  halfWidth: toWorldUnits(3.1) / 2,
  bottomZ: 0,
  topZ: toWorldUnits(0.85) * 9,
  landingMinZ: toWorldUnits(0.85) * 9,
  landingMaxZ: toWorldUnits(0.85) * 9 + toWorldUnits(2.6),
  totalRise: UPPER_FLOOR_TOP_ELEVATION - GROUND_FLOOR_TOP_ELEVATION - 0.38,
  direction: 1,
};

const behavior: StairBehavior = {
  transitionMargin: toWorldUnits(0.6),
  landingTriggerMargin: toWorldUnits(0.2),
  stepRise: (UPPER_FLOOR_TOP_ELEVATION - GROUND_FLOOR_TOP_ELEVATION - 0.38) / 9,
};

const upperFloorElevation = UPPER_FLOOR_TOP_ELEVATION;

const sample = (params: { x: number; z: number; currentFloor: FloorId }) =>
  sampleStairSurfaceHeight({
    geometry,
    behavior,
    upperFloorElevation,
    ...params,
  });

describe('sampleStairSurfaceHeight', () => {
  it('returns the interpolated ramp height along the stair run', () => {
    const midRampZ = geometry.topZ / 2;
    const height = sample({ x: 0, z: midRampZ, currentFloor: 'ground' });
    expect(height).toBeCloseTo(geometry.totalRise / 2, 5);
  });

  it('keeps ground ascent on the ramp until the physical stair top', () => {
    const nearTopStepZ = geometry.topZ - toWorldUnits(0.2);
    const height = sample({ x: 0, z: nearTopStepZ, currentFloor: 'ground' });
    const rampHeight = computeRampHeight(geometry, behavior, 0, nearTopStepZ);

    expect(height).toBeCloseTo(rampHeight, 6);
  });

  it('keeps ground ascent ramp height through the former handoff halo', () => {
    const firstDescentStepZ =
      geometry.topZ - behavior.landingTriggerMargin - toWorldUnits(0.01);
    const rampHeight = computeRampHeight(
      geometry,
      behavior,
      0,
      firstDescentStepZ
    );
    const height = sample({
      x: 0,
      z: firstDescentStepZ,
      currentFloor: 'ground',
    });

    expect(height).toBeCloseTo(rampHeight, 6);
  });

  it('returns the ramp height after clearing the top handoff band', () => {
    const clearedTopStepZ = geometry.topZ - behavior.transitionMargin;
    const rampHeight = computeRampHeight(
      geometry,
      behavior,
      0,
      clearedTopStepZ
    );
    const height = sample({
      x: 0,
      z: clearedTopStepZ,
      currentFloor: 'ground',
    });

    expect(height).toBeCloseTo(rampHeight, 6);
  });

  it('returns upper height for centerline ground samples beyond the ramp run', () => {
    const upperLandingZ = geometry.topZ + toWorldUnits(0.6);

    for (const x of [0, geometry.halfWidth - toWorldUnits(0.05)]) {
      const height = sample({ x, z: upperLandingZ, currentFloor: 'ground' });
      const rampHeight = computeRampHeight(
        geometry,
        behavior,
        x,
        upperLandingZ
      );

      expect(rampHeight).toBe(0);
      expect(height).toBe(upperFloorElevation);
    }
  });

  it('blends the first upper descent sample from the landing lip to the ramp', () => {
    const blendRange =
      behavior.transitionMargin - behavior.landingTriggerMargin;
    const descentZ =
      geometry.topZ - behavior.landingTriggerMargin - blendRange / 2;
    const rampHeight = computeRampHeight(geometry, behavior, 0, descentZ);
    const height = sample({ x: 0, z: descentZ, currentFloor: 'upper' });

    expect(height).toBeGreaterThan(rampHeight);
    expect(height).toBeLessThan(upperFloorElevation);
  });

  it('keeps slow upper descent samples smooth through the full lip band', () => {
    const blendRange =
      behavior.transitionMargin - behavior.landingTriggerMargin;
    const sampleCount = 7;
    const heights = Array.from({ length: sampleCount }, (_, index) => {
      const progress = index / (sampleCount - 1);
      const descentZ =
        geometry.topZ - behavior.landingTriggerMargin - blendRange * progress;

      return sample({ x: 0, z: descentZ, currentFloor: 'upper' });
    });

    for (let index = 1; index < heights.length; index += 1) {
      expect(heights[index]).toBeLessThanOrEqual(heights[index - 1] + 0.001);
      expect(heights[index - 1] - heights[index]).toBeLessThan(0.25);
    }

    expect(heights[0]).toBeGreaterThan(heights.at(-1) ?? heights[0]);
  });

  it('keeps ground ascent samples on the ramp inside the descent lip band', () => {
    const blendRange =
      behavior.transitionMargin - behavior.landingTriggerMargin;
    const descentZ =
      geometry.topZ - behavior.landingTriggerMargin - blendRange / 2;
    const rampHeight = computeRampHeight(geometry, behavior, 0, descentZ);
    const height = sample({ x: 0, z: descentZ, currentFloor: 'ground' });

    expect(height).toBeCloseTo(rampHeight, 6);
  });

  it('returns upper floor elevation across the landing interior', () => {
    const landingInteriorZ = (geometry.landingMinZ + geometry.landingMaxZ) / 2;
    const height = sample({ x: 0, z: landingInteriorZ, currentFloor: 'upper' });
    expect(height).toBeCloseTo(upperFloorElevation, 6);
  });

  it('returns upper floor elevation when outside the stair width above the void', () => {
    const farEastX = geometry.centerX + geometry.halfWidth + toWorldUnits(0.8);
    const landingMidZ = (geometry.landingMinZ + geometry.landingMaxZ) / 2;
    const height = sample({
      x: farEastX,
      z: landingMidZ,
      currentFloor: 'upper',
    });
    expect(height).toBeCloseTo(upperFloorElevation, 6);
  });

  it('clamps to ground level when outside the stair span', () => {
    const farEastX = geometry.centerX + geometry.halfWidth + toWorldUnits(0.8);
    const height = sample({
      x: farEastX,
      z: -toWorldUnits(0.4),
      currentFloor: 'ground',
    });
    expect(height).toBe(0);
  });
});
