import { MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, UPPER_FLOOR_PLAN } from '../assets/floorPlan';
import type { Bounds2D } from '../assets/floorPlan';
import { createRoomFloorTiles } from '../scene/structures/floorTiles';
import { createUpperLandingFloorCutouts } from '../scene/structures/upperLandingFloorCutouts';
import {
  computeStairLayout,
  computeStairwellOpeningBounds,
} from '../systems/movement/stairLayout';

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

const STAIR_CENTER_X = toWorldUnits(6.2);
const STAIR_HALF_WIDTH = toWorldUnits(3.1) / 2;
const STAIR_BOTTOM_Z = toWorldUnits(-5.3);
const STAIR_RUN = toWorldUnits(0.85);
const STAIR_STEP_COUNT = 9;
const STAIR_LANDING_DEPTH = toWorldUnits(2.6);
const STAIRWELL_MARGIN_X = toWorldUnits(0.2);
const STAIRWELL_MARGIN_Z = toWorldUnits(0.4);
const PLAYER_RADIUS = 0.75;

const overlaps = (a: Bounds2D, b: Bounds2D): boolean =>
  a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

describe('createUpperLandingFloorCutouts', () => {
  it('removes the physical staircase landing footprint from upper landing floor tiles', () => {
    const upperLandingRoom = UPPER_FLOOR_PLAN.rooms.find(
      (room) => room.id === 'upperLanding'
    );
    expect(upperLandingRoom).toBeDefined();
    if (!upperLandingRoom) {
      return;
    }

    const stairLayout = computeStairLayout({
      baseZ: STAIR_BOTTOM_Z,
      stepRun: STAIR_RUN,
      stepCount: STAIR_STEP_COUNT,
      landingDepth: STAIR_LANDING_DEPTH,
      direction: 'negativeZ',
      guardMargin: toWorldUnits(0.6),
      stairwellMargin: STAIRWELL_MARGIN_Z,
    });
    const stairwellOpening = computeStairwellOpeningBounds({
      centerX: STAIR_CENTER_X,
      halfWidth: STAIR_HALF_WIDTH,
      marginX: STAIRWELL_MARGIN_X,
      roomBounds: upperLandingRoom.bounds,
      layout: stairLayout,
    });
    const staircaseLandingFootprint = {
      minX: STAIR_CENTER_X - STAIR_HALF_WIDTH,
      maxX: STAIR_CENTER_X + STAIR_HALF_WIDTH,
      minZ: stairLayout.landingMinZ,
      maxZ: stairLayout.landingMaxZ,
    };
    const westEgressLaneX =
      STAIR_CENTER_X - STAIR_HALF_WIDTH + PLAYER_RADIUS * 0.75;
    const hiddenRunVoidMinX = westEgressLaneX + PLAYER_RADIUS + 0.01;

    const cutouts = createUpperLandingFloorCutouts({
      staircaseLandingFootprint,
      stairwellOpening,
      hiddenRunVoidMinX,
    });
    const floorTiles = createRoomFloorTiles([upperLandingRoom], {
      material: new MeshStandardMaterial(),
      elevation: 4.16,
      thickness: 0.38,
      cutoutsByRoom: { upperLanding: cutouts },
    });

    expect(cutouts[0]).toEqual(staircaseLandingFootprint);
    expect(cutouts[1]).toEqual({
      ...stairwellOpening,
      minX: hiddenRunVoidMinX,
    });
    expect(
      floorTiles.tiles
        .filter((tile) => tile.roomId === 'upperLanding')
        .every((tile) => !overlaps(tile.bounds, staircaseLandingFootprint))
    ).toBe(true);
  });
});
