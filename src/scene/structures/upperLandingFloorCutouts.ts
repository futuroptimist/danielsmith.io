import type { Bounds2D } from '../../assets/floorPlan';

import type { RoomFloorCutout } from './floorTiles';

export interface UpperLandingFloorCutoutConfig {
  /** Full visible top footprint of the physical StaircaseLanding slab. */
  readonly staircaseLandingFootprint: Bounds2D;
  /** Shared stairwell void used by the upper landing floor tiles. */
  readonly stairwellOpening: Bounds2D;
  /**
   * Visible top footprint of the final stair tread. Its top face is coplanar
   * with the underside of upper-floor tiles, so leaving a tile over this tread
   * can produce a jagged z-fighting seam at the landing mouth.
   */
  readonly finalStairStepFootprint: Bounds2D;
  /** West edge of the hidden-run void after preserving the egress lane. */
  readonly hiddenRunVoidMinX: number;
}

/**
 * Keeps upper landing floor tiles away from the physical staircase landing slab
 * while preserving the narrower hidden-run cutout that protects upstairs egress.
 * The first cutout removes the coplanar slab footprint; the second removes
 * upper-floor tile undersides from the final top tread; the third keeps the
 * no-floor void open only where the hidden stair run should remain uncovered.
 */
export function createUpperLandingFloorCutouts(
  config: UpperLandingFloorCutoutConfig
): RoomFloorCutout[] {
  return [
    { ...config.staircaseLandingFootprint },
    { ...config.finalStairStepFootprint },
    {
      ...config.stairwellOpening,
      minX: config.hiddenRunVoidMinX,
    },
  ];
}
