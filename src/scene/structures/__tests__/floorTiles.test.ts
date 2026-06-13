import { BoxGeometry, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, UPPER_FLOOR_PLAN } from '../../../assets/floorPlan';
import {
  computeStaircaseLandingBounds,
  computeStairLayout,
  computeStairwellOpeningBounds,
} from '../../../systems/movement/stairLayout';
import { createRoomFloorTiles } from '../floorTiles';

const toWorldUnits = (value: number): number => value * FLOOR_PLAN_SCALE;

const overlaps = (
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  cutout: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  bounds.minX < cutout.maxX &&
  bounds.maxX > cutout.minX &&
  bounds.minZ < cutout.maxZ &&
  bounds.maxZ > cutout.minZ;

const contains = (
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  target: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  bounds.minX <= target.minX &&
  bounds.maxX >= target.maxX &&
  bounds.minZ <= target.minZ &&
  bounds.maxZ >= target.maxZ;

const valuesAreClose = (actual: number, expected: number): boolean =>
  Math.abs(actual - expected) < 1e-6;

const boundsAreClose = (
  actual: { minX: number; maxX: number; minZ: number; maxZ: number },
  expected: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  valuesAreClose(actual.minX, expected.minX) &&
  valuesAreClose(actual.maxX, expected.maxX) &&
  valuesAreClose(actual.minZ, expected.minZ) &&
  valuesAreClose(actual.maxZ, expected.maxZ);

const createUpperStairTestLayout = () => {
  const upperLandingRoom = UPPER_FLOOR_PLAN.rooms.find(
    (room) => room.id === 'upperLanding'
  );
  expect(upperLandingRoom).toBeDefined();

  const stairCenterX = toWorldUnits(6.2);
  const stairHalfWidth = toWorldUnits(3.1) / 2;
  const stairLayout = computeStairLayout({
    baseZ: toWorldUnits(-5.3),
    stepRun: toWorldUnits(0.85),
    stepCount: 9,
    landingDepth: toWorldUnits(2.6),
    direction: 'negativeZ',
    guardMargin: toWorldUnits(0.6),
    stairwellMargin: toWorldUnits(0.4),
  });
  const stairwellOpening = computeStairwellOpeningBounds({
    centerX: stairCenterX,
    halfWidth: stairHalfWidth,
    marginX: toWorldUnits(0.2),
    roomBounds: upperLandingRoom!.bounds,
    layout: stairLayout,
  });
  const landingTopSurface = computeStaircaseLandingBounds({
    centerX: stairCenterX,
    halfWidth: stairHalfWidth,
    layout: stairLayout,
  });

  return {
    upperLandingRoom: upperLandingRoom!,
    stairCenterX,
    stairHalfWidth,
    stairLayout,
    stairwellOpening,
    landingTopSurface,
  };
};

describe('createRoomFloorTiles', () => {
  it('builds opaque upper-floor slabs with a layout-driven stairwell opening', () => {
    const material = new MeshStandardMaterial({
      transparent: false,
      opacity: 1,
      depthWrite: true,
    });
    const { upperLandingRoom, stairLayout, stairwellOpening } =
      createUpperStairTestLayout();

    const build = createRoomFloorTiles(UPPER_FLOOR_PLAN.rooms, {
      material,
      elevation: 4,
      thickness: 0.45,
      groupName: 'UpperFloorTiles',
      cutoutsByRoom: {
        upperLanding: [stairwellOpening],
      },
    });

    const upperLandingTiles = build.tiles.filter(
      (tile) => tile.roomId === 'upperLanding'
    );

    expect(build.group.name).toBe('UpperFloorTiles');
    expect(upperLandingTiles.length).toBeGreaterThan(0);

    const fillsLeftLandingShoulder = upperLandingTiles.some((tile) =>
      boundsAreClose(tile.bounds, {
        minX: upperLandingRoom.bounds.minX,
        maxX: stairwellOpening.minX,
        minZ: upperLandingRoom.bounds.minZ,
        maxZ: upperLandingRoom.bounds.maxZ,
      })
    );
    const fillsRightLandingShoulder = upperLandingTiles.some((tile) =>
      boundsAreClose(tile.bounds, {
        minX: stairwellOpening.maxX,
        maxX: upperLandingRoom.bounds.maxX,
        minZ: upperLandingRoom.bounds.minZ,
        maxZ: upperLandingRoom.bounds.maxZ,
      })
    );
    expect(fillsLeftLandingShoulder).toBe(true);
    expect(fillsRightLandingShoulder).toBe(true);

    const hiddenStairRunVoid = {
      minX: stairwellOpening.minX,
      maxX: stairwellOpening.maxX,
      minZ: stairLayout.landingMaxZ,
      maxZ: upperLandingRoom.bounds.maxZ,
    };
    expect(
      upperLandingTiles.some((tile) => overlaps(tile.bounds, stairwellOpening))
    ).toBe(false);
    expect(
      upperLandingTiles.some((tile) =>
        overlaps(tile.bounds, hiddenStairRunVoid)
      )
    ).toBe(false);

    for (const tile of build.tiles) {
      const geometry = tile.mesh.geometry as BoxGeometry;
      expect(geometry.parameters.height).toBeCloseTo(0.45);
      expect(tile.mesh.position.y).toBeCloseTo(4 - 0.45 / 2);
      expect(tile.mesh.material).toBe(material);
    }

    for (const tile of upperLandingTiles) {
      expect(overlaps(tile.bounds, stairwellOpening)).toBe(false);
      expect(contains(tile.bounds, stairwellOpening)).toBe(false);
    }

    expect(material.transparent).toBe(false);
    expect(material.opacity).toBe(1);
    expect(material.depthWrite).toBe(true);
  });

  it('cuts the upper landing floor away from the physical stair landing top surface', () => {
    const {
      stairCenterX,
      stairHalfWidth,
      stairwellOpening,
      landingTopSurface,
    } = createUpperStairTestLayout();
    const playerRadius = 0.75;
    const westEgressBlockerMinX =
      stairCenterX - stairHalfWidth + playerRadius * 0.75 + playerRadius + 0.01;
    const visualCutout = {
      ...stairwellOpening,
      minX: Math.max(
        stairwellOpening.minX,
        Math.min(westEgressBlockerMinX, landingTopSurface.minX)
      ),
    };

    const build = createRoomFloorTiles(UPPER_FLOOR_PLAN.rooms, {
      elevation: 4.16,
      thickness: 0.38,
      groupName: 'UpperFloorTiles',
      cutoutsByRoom: {
        upperLanding: [visualCutout],
      },
    });

    const upperLandingTiles = build.tiles.filter(
      (tile) => tile.roomId === 'upperLanding'
    );

    expect(visualCutout.minX).toBeCloseTo(landingTopSurface.minX);
    expect(upperLandingTiles.length).toBeGreaterThan(0);
    expect(
      upperLandingTiles.some((tile) => overlaps(tile.bounds, landingTopSurface))
    ).toBe(false);
  });
});
