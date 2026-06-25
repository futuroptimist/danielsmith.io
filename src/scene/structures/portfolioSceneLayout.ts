import { Vector3 } from 'three';

import { FLOOR_PLAN_SCALE, WALL_THICKNESS } from '../../assets/floorPlan';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../level/floorElevations';

import type { StaircaseConfig } from './staircase';

const toWorldUnits = (value: number): number => value * FLOOR_PLAN_SCALE;

export const WALL_HEIGHT = 6;
export { WALL_THICKNESS };
export const FENCE_HEIGHT = 2.4;
export const FENCE_THICKNESS = 0.28;
export const CEILING_COVE_OFFSET = 0.35;

export const STAIRCASE_LANDING_THICKNESS = 0.38;
export const STAIRCASE_STEP_COUNT = 9;
export const STAIRCASE_STEP_RISE =
  (UPPER_FLOOR_TOP_ELEVATION -
    GROUND_FLOOR_TOP_ELEVATION -
    STAIRCASE_LANDING_THICKNESS) /
  STAIRCASE_STEP_COUNT;

export const STAIRCASE_CONFIG = {
  name: 'LivingRoomStaircase',
  basePosition: new Vector3(
    toWorldUnits(6.2),
    GROUND_FLOOR_TOP_ELEVATION,
    toWorldUnits(-5.3)
  ),
  direction: 'negativeZ',
  step: {
    count: STAIRCASE_STEP_COUNT,
    rise: STAIRCASE_STEP_RISE,
    run: toWorldUnits(0.85),
    width: toWorldUnits(3.1),
    material: {
      color: 0x708091,
      roughness: 0.6,
      metalness: 0.12,
    },
    colliderInset: toWorldUnits(0.05),
  },
  landing: {
    depth: toWorldUnits(2.6),
    thickness: STAIRCASE_LANDING_THICKNESS,
    material: {
      color: 0x5b6775,
      roughness: 0.55,
      metalness: 0.08,
    },
    colliderInset: toWorldUnits(0.05),
    guard: {
      height: 0.55,
      thickness: toWorldUnits(0.14),
      inset: toWorldUnits(0.07),
      widthScale: 0.95,
      material: {
        color: 0x2c343f,
        roughness: 0.7,
        metalness: 0.05,
      },
    },
  },
} satisfies StaircaseConfig;
