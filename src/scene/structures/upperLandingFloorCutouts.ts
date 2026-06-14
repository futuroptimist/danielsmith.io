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
  /**
   * Upper Landing Floor 6 (debug solid 634BE9 before the fix) was the
   * camera-facing half of this approach strip. Keep that upper-floor tile out
   * of the stair-run approach so it cannot obscure the visible treads.
   */
  readonly stairRunApproachFootprint: Bounds2D;
  /** West edge of the hidden-run void after preserving the egress lane. */
  readonly hiddenRunVoidMinX: number;
}

export interface UpperLandingStairRunApproachFootprintConfig {
  readonly stairCenterX: number;
  readonly stairHalfWidth: number;
  readonly stairwellOpening: Bounds2D;
  readonly upperLandingRoomBounds: Bounds2D;
}

/**
 * Covers the full physical stair width where upper-floor tiles would otherwise
 * extend from the stairwell mouth toward the camera-facing upper landing edge.
 */
export function createUpperLandingStairRunApproachFootprint({
  stairCenterX,
  stairHalfWidth,
  stairwellOpening,
  upperLandingRoomBounds,
}: UpperLandingStairRunApproachFootprintConfig): Bounds2D {
  return {
    minX: stairCenterX - stairHalfWidth,
    maxX: stairCenterX + stairHalfWidth,
    minZ: stairwellOpening.minZ,
    maxZ: upperLandingRoomBounds.maxZ,
  };
}

/**
 * Keeps upper landing floor tiles away from the physical staircase landing slab
 * while preserving the narrower hidden-run cutout that protects upstairs egress.
 * The first cutout removes the coplanar slab footprint; the second removes
 * upper-floor tile undersides from the final top tread; the third removes the
 * narrow stair-run approach strip that used to cover the upper treads; the
 * fourth keeps the no-floor void open only where the hidden stair run should
 * remain uncovered.
 */
export function createUpperLandingFloorCutouts(
  config: UpperLandingFloorCutoutConfig
): RoomFloorCutout[] {
  return [
    { ...config.staircaseLandingFootprint },
    { ...config.finalStairStepFootprint },
    { ...config.stairRunApproachFootprint },
    {
      ...config.stairwellOpening,
      minX: config.hiddenRunVoidMinX,
    },
  ];
}
