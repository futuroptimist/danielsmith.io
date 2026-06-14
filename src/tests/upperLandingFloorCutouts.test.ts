import { MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, UPPER_FLOOR_PLAN } from '../assets/floorPlan';
import type { Bounds2D } from '../assets/floorPlan';
import { createRoomFloorTiles } from '../scene/structures/floorTiles';
import {
  createUpperLandingFloorCutouts,
  createUpperLandingStairRunApproachFootprint,
} from '../scene/structures/upperLandingFloorCutouts';
import {
  computeStairLayout,
  computeStairwellOpeningBounds,
} from '../systems/movement/stairLayout';
import {
  createStairNavigationZones,
  type StairBehavior,
  type StairGeometry,
} from '../systems/movement/stairs';

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

const createProductionUpperLandingCutoutFixture = () => {
  const upperLandingRoom = UPPER_FLOOR_PLAN.rooms.find(
    (room) => room.id === 'upperLanding'
  );
  expect(upperLandingRoom).toBeDefined();
  if (!upperLandingRoom) {
    throw new Error('Expected upper landing room fixture to exist');
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
  const finalStairStepFootprint = {
    minX: STAIR_CENTER_X - STAIR_HALF_WIDTH,
    maxX: STAIR_CENTER_X + STAIR_HALF_WIDTH,
    minZ: Math.min(
      stairLayout.topZ,
      stairLayout.topZ - stairLayout.directionMultiplier * STAIR_RUN
    ),
    maxZ: Math.max(
      stairLayout.topZ,
      stairLayout.topZ - stairLayout.directionMultiplier * STAIR_RUN
    ),
  };
  const stairGeometry: StairGeometry = {
    centerX: STAIR_CENTER_X,
    halfWidth: STAIR_HALF_WIDTH,
    bottomZ: STAIR_BOTTOM_Z,
    topZ: stairLayout.topZ,
    landingMinZ: stairLayout.landingMinZ,
    landingMaxZ: stairLayout.landingMaxZ,
    totalRise: STAIR_STEP_COUNT * 0.42,
    direction: stairLayout.directionMultiplier,
  };
  const stairBehavior: StairBehavior = {
    transitionMargin: toWorldUnits(0.6),
    landingTriggerMargin: toWorldUnits(0.2),
    stepRise: 0.42,
    descentCorridorInset: PLAYER_RADIUS,
  };
  const stairNavigationZones = createStairNavigationZones(
    stairGeometry,
    stairBehavior
  );
  const westEgressLaneX =
    STAIR_CENTER_X - STAIR_HALF_WIDTH + PLAYER_RADIUS * 0.75;
  const hiddenRunVoidMinX = westEgressLaneX + PLAYER_RADIUS + 0.01;
  const stairRunApproachFootprint = createUpperLandingStairRunApproachFootprint(
    {
      stairCenterX: STAIR_CENTER_X,
      stairHalfWidth: STAIR_HALF_WIDTH,
      stairwellOpening,
      upperLandingRoomBounds: upperLandingRoom.bounds,
    }
  );

  return {
    upperLandingRoom,
    stairNavigationZones,
    staircaseLandingFootprint,
    finalStairStepFootprint,
    stairRunApproachFootprint,
    stairwellOpening,
    hiddenRunVoidMinX,
  };
};

describe('createUpperLandingFloorCutouts', () => {
  it('removes the physical staircase landing footprint from upper landing floor tiles', () => {
    const {
      upperLandingRoom,
      staircaseLandingFootprint,
      finalStairStepFootprint,
      stairRunApproachFootprint,
      stairwellOpening,
      hiddenRunVoidMinX,
    } = createProductionUpperLandingCutoutFixture();

    const cutouts = createUpperLandingFloorCutouts({
      staircaseLandingFootprint,
      finalStairStepFootprint,
      stairRunApproachFootprint,
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
    expect(cutouts[1]).toEqual(finalStairStepFootprint);
    expect(cutouts[2]).toEqual(stairRunApproachFootprint);
    expect(cutouts[3]).toEqual({
      ...stairwellOpening,
      minX: hiddenRunVoidMinX,
    });
    expect(
      floorTiles.tiles
        .filter((tile) => tile.roomId === 'upperLanding')
        .every((tile) => !overlaps(tile.bounds, staircaseLandingFootprint))
    ).toBe(true);
    expect(
      floorTiles.tiles
        .filter((tile) => tile.roomId === 'upperLanding')
        .every((tile) => !overlaps(tile.bounds, finalStairStepFootprint))
    ).toBe(true);
    expect(
      floorTiles.tiles
        .filter((tile) => tile.roomId === 'upperLanding')
        .every((tile) => !overlaps(tile.bounds, stairRunApproachFootprint))
    ).toBe(true);

    const upperFloorTileBottomY = 4.16 - 0.38;
    const finalStairStepTopY = STAIR_STEP_COUNT * 0.42;
    expect(upperFloorTileBottomY).toBeCloseTo(finalStairStepTopY);
  });

  it('derives the stair-run approach cutout from the production stair geometry', () => {
    const {
      stairNavigationZones,
      stairRunApproachFootprint,
      stairwellOpening,
      upperLandingRoom,
    } = createProductionUpperLandingCutoutFixture();

    expect(stairRunApproachFootprint).toEqual({
      minX: STAIR_CENTER_X - STAIR_HALF_WIDTH,
      maxX: STAIR_CENTER_X + STAIR_HALF_WIDTH,
      minZ: stairwellOpening.minZ,
      maxZ: upperLandingRoom.bounds.maxZ,
    });
    expect(stairRunApproachFootprint.minX).toBeLessThan(
      stairNavigationZones.explicitDescentCorridor.minX
    );
    expect(stairRunApproachFootprint.maxX).toBeGreaterThan(
      stairNavigationZones.explicitDescentCorridor.maxX
    );
  });

  it('prevents upper landing tiles from covering the final top tread underside seam', () => {
    const finalTopTread = {
      minX: 9.3,
      maxX: 15.5,
      minZ: -25.9,
      maxZ: -24.2,
    };
    const cutouts = createUpperLandingFloorCutouts({
      staircaseLandingFootprint: {
        minX: 9.3,
        maxX: 15.5,
        minZ: -31.1,
        maxZ: -25.9,
      },
      finalStairStepFootprint: finalTopTread,
      stairRunApproachFootprint: {
        minX: 9.3,
        maxX: 10.62,
        minZ: -24.2,
        maxZ: -16,
      },
      stairwellOpening: {
        minX: 8.9,
        maxX: 15.9,
        minZ: -31.9,
        maxZ: -24.2,
      },
      hiddenRunVoidMinX: 10.62,
    });

    const floorTiles = createRoomFloorTiles(
      [
        {
          id: 'upperLanding',
          name: 'Upper Landing',
          bounds: { minX: 4, maxX: 20.8, minZ: -32, maxZ: -16 },
          doorways: [],
        },
      ],
      {
        material: new MeshStandardMaterial(),
        elevation: 4.16,
        thickness: 0.38,
        cutoutsByRoom: { upperLanding: cutouts },
      }
    );

    expect(
      floorTiles.tiles.every((tile) => !overlaps(tile.bounds, finalTopTread))
    ).toBe(true);
  });

  it('removes the Upper Landing Floor 6 approach strip over the upper stair run', () => {
    const {
      upperLandingRoom,
      staircaseLandingFootprint,
      finalStairStepFootprint,
      stairRunApproachFootprint,
      stairwellOpening,
      hiddenRunVoidMinX,
    } = createProductionUpperLandingCutoutFixture();
    const cutouts = createUpperLandingFloorCutouts({
      staircaseLandingFootprint,
      finalStairStepFootprint,
      stairRunApproachFootprint,
      stairwellOpening,
      hiddenRunVoidMinX,
    });

    const floorTiles = createRoomFloorTiles([upperLandingRoom], {
      material: new MeshStandardMaterial(),
      elevation: 4.16,
      thickness: 0.38,
      cutoutsByRoom: { upperLanding: cutouts },
    });

    expect(
      floorTiles.tiles.every(
        (tile) => !overlaps(tile.bounds, stairRunApproachFootprint)
      )
    ).toBe(true);
  });
});
