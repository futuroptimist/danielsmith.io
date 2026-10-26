import { Vector3 } from 'three';

import { FLOOR_PLAN_SCALE, WALL_THICKNESS } from '../../assets/floorPlan';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../level/floorElevations';
import { HOUSE_HORIZONTAL_SCALE } from '../level/horizontalFootprint';
import {
  AVATAR_COLLISION_RADIUS,
  FLOOR_SLAB_THICKNESS,
  TARGET_ROOM_CLEAR_HEIGHT,
} from '../units';

import type { StaircaseConfig } from './staircase';

const toWorldUnits = (value: number): number => value * FLOOR_PLAN_SCALE;

export const WALL_HEIGHT = TARGET_ROOM_CLEAR_HEIGHT;
export { WALL_THICKNESS };
export const FENCE_HEIGHT = 2.4;
export const FENCE_THICKNESS = 0.28;
export const CEILING_COVE_OFFSET = 0.15;

export const STAIRCASE_LANDING_THICKNESS = FLOOR_SLAB_THICKNESS;
export const STAIRCASE_STEP_COUNT = 18;
export const STAIRCASE_STEP_RISE =
  (UPPER_FLOOR_TOP_ELEVATION - GROUND_FLOOR_TOP_ELEVATION) /
  STAIRCASE_STEP_COUNT;
export const STAIRCASE_STEP_RUN = 0.28;
/** Admit the full capsule before its leading edge reaches the first tread. */
export const STAIRCASE_TRANSITION_MARGIN = Math.max(
  toWorldUnits(0.6),
  AVATAR_COLLISION_RADIUS
);
// The level corridor retains west-room access and a full-height ground underpass.
export const STAIRCASE_TOP_Z = -21.8 * HOUSE_HORIZONTAL_SCALE;

export const STAIRCASE_CONFIG = {
  name: 'LivingRoomStaircase',
  basePosition: new Vector3(
    toWorldUnits(6.2),
    GROUND_FLOOR_TOP_ELEVATION,
    STAIRCASE_TOP_Z + STAIRCASE_STEP_COUNT * STAIRCASE_STEP_RUN
  ),
  direction: 'negativeZ',
  step: {
    count: STAIRCASE_STEP_COUNT,
    rise: STAIRCASE_STEP_RISE,
    run: STAIRCASE_STEP_RUN,
    width: 2.4,
    material: {
      color: 0x708091,
      roughness: 0.6,
      metalness: 0.12,
    },
    colliderInset: toWorldUnits(0.05),
  },
  landing: {
    depth: 9.3 * HOUSE_HORIZONTAL_SCALE,
    topRise: UPPER_FLOOR_TOP_ELEVATION - GROUND_FLOOR_TOP_ELEVATION,
    thickness: STAIRCASE_LANDING_THICKNESS,
    material: {
      color: 0x5b6775,
      roughness: 0.55,
      metalness: 0.08,
    },
    colliderInset: toWorldUnits(0.05),
    guard: {
      height: 1.0,
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
