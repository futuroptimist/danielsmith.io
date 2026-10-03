import { FLOOR_TOP_ELEVATIONS } from './floorElevations';

/** Horizontal measurements are level units; elevations are world units. */
export const BASEMENT_STAIR_CONNECTION = {
  id: 'basement-ground',
  lowerFloorId: 'basement',
  upperFloorId: 'ground',
  lowerFloorElevation: FLOOR_TOP_ELEVATIONS.basement,
  upperFloorElevation: FLOOR_TOP_ELEVATIONS.ground,
  centerX: 1.9,
  bottomZ: -14.65,
  width: 2.4,
  stepRun: 0.85,
  stepCount: 9,
  landingDepth: 2.6,
  landingThickness: 0.38,
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
