import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
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
  totalRise: 0.42 * 9,
  direction: 1,
};

const behavior: StairBehavior = {
  transitionMargin: toWorldUnits(0.6),
  landingTriggerMargin: toWorldUnits(0.2),
  stepRise: 0.42,
};

const upperFloorElevation = geometry.totalRise + 0.38;

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

  it('retains ramp height when descending toward the top step', () => {
    const nearTopStepZ = geometry.topZ - toWorldUnits(0.2);
    const height = sample({ x: 0, z: nearTopStepZ, currentFloor: 'ground' });
    expect(height).toBeGreaterThan(geometry.totalRise * 0.9);
    expect(height).toBeLessThanOrEqual(geometry.totalRise);
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
