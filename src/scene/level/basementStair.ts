import { FLOOR_SLAB_THICKNESS } from '../units';

import { FLOOR_TOP_ELEVATIONS } from './floorElevations';

/** Horizontal measurements are level units; elevations are world units. */
export const BASEMENT_STAIR_CONNECTION = {
  id: 'basement-ground',
  lowerFloorId: 'basement',
  upperFloorId: 'ground',
  lowerFloorElevation: FLOOR_TOP_ELEVATIONS.basement,
  upperFloorElevation: FLOOR_TOP_ELEVATIONS.ground,
  centerX: 1.9,
  bottomZ: -9.52,
  width: 1.2,
  stepRun: 0.14,
  stepCount: 18,
  landingDepth: 1.2,
  landingThickness: FLOOR_SLAB_THICKNESS,
  direction: 'positiveZ',
  transitionMargin: 0.6,
  landingTriggerMargin: 0.2,
  guardThickness: 0.12,
  openingMargin: 0.4,
  landingOccluderSourceId: 'ground.living_room.north_wall',
  sources: {
    visual: 'basement.groundStairs.visual',
    navigation: 'basement.groundStairs.navigation',
    trim: 'ground.basementStairs.trim',
  },
} as const;
