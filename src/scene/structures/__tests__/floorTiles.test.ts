import { BoxGeometry, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, UPPER_FLOOR_PLAN } from '../../../assets/floorPlan';
import {
  computeStairLayout,
  computeStairwellOpeningBounds,
} from '../../../systems/movement/stairLayout';
import { createRoomFloorTiles } from '../floorTiles';
import {
  computeStaircaseLandingBounds,
  type StaircaseConfig,
} from '../staircase';

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

describe('createRoomFloorTiles', () => {
  it('builds opaque upper-floor slabs with a layout-driven stairwell opening', () => {
    const material = new MeshStandardMaterial({
      transparent: false,
      opacity: 1,
      depthWrite: true,
    });
    const upperLandingRoom = UPPER_FLOOR_PLAN.rooms.find(
      (room) => room.id === 'upperLanding'
    );
    expect(upperLandingRoom).toBeDefined();

    const stairCenterX = toWorldUnits(6.2);
    const stairHalfWidth = toWorldUnits(3.1) / 2;
    const stairwellMarginX = toWorldUnits(0.2);
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
      marginX: stairwellMarginX,
      roomBounds: upperLandingRoom!.bounds,
      layout: stairLayout,
    });

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
        minX: upperLandingRoom!.bounds.minX,
        maxX: stairwellOpening.minX,
        minZ: upperLandingRoom!.bounds.minZ,
        maxZ: upperLandingRoom!.bounds.maxZ,
      })
    );
    const fillsRightLandingShoulder = upperLandingTiles.some((tile) =>
      boundsAreClose(tile.bounds, {
        minX: stairwellOpening.maxX,
        maxX: upperLandingRoom!.bounds.maxX,
        minZ: upperLandingRoom!.bounds.minZ,
        maxZ: upperLandingRoom!.bounds.maxZ,
      })
    );
    expect(fillsLeftLandingShoulder).toBe(true);
    expect(fillsRightLandingShoulder).toBe(true);

    const hiddenStairRunVoid = {
      minX: stairwellOpening.minX,
      maxX: stairwellOpening.maxX,
      minZ: stairLayout.landingMaxZ,
      maxZ: upperLandingRoom!.bounds.maxZ,
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
  it('cuts the visible staircase landing out of coplanar upper-floor slabs', () => {
    const upperLandingRoom = UPPER_FLOOR_PLAN.rooms.find(
      (room) => room.id === 'upperLanding'
    );
    expect(upperLandingRoom).toBeDefined();

    const stairConfig = {
      basePosition: new Vector3(toWorldUnits(6.2), 0, toWorldUnits(-5.3)),
      direction: 'negativeZ',
      step: {
        count: 9,
        rise: 0.42,
        run: toWorldUnits(0.85),
        width: toWorldUnits(3.1),
        material: {},
      },
      landing: {
        depth: toWorldUnits(2.6),
        thickness: 0.38,
        material: {},
      },
    } satisfies StaircaseConfig;
    const stairLandingVisualBounds = computeStaircaseLandingBounds(stairConfig);
    const stairwellMarginX = toWorldUnits(0.2);
    const stairLayout = computeStairLayout({
      baseZ: stairConfig.basePosition.z,
      stepRun: stairConfig.step.run,
      stepCount: stairConfig.step.count,
      landingDepth: stairConfig.landing.depth,
      direction: stairConfig.direction,
      guardMargin: toWorldUnits(0.6),
      stairwellMargin: toWorldUnits(0.4),
    });
    const stairwellOpening = computeStairwellOpeningBounds({
      centerX: stairConfig.basePosition.x,
      halfWidth: stairConfig.step.width / 2,
      marginX: stairwellMarginX,
      roomBounds: upperLandingRoom!.bounds,
      layout: stairLayout,
    });
    const upperStairWestEgressBlockerMinX =
      stairConfig.basePosition.x -
      stairConfig.step.width / 2 +
      0.75 * 0.75 +
      0.75 +
      0.01;

    const build = createRoomFloorTiles(UPPER_FLOOR_PLAN.rooms, {
      elevation:
        stairConfig.step.count * stairConfig.step.rise +
        stairConfig.landing.thickness,
      thickness: stairConfig.landing.thickness,
      cutoutsByRoom: {
        upperLanding: [
          stairLandingVisualBounds,
          {
            ...stairwellOpening,
            minX: upperStairWestEgressBlockerMinX,
          },
        ],
      },
    });

    const upperLandingTiles = build.tiles.filter(
      (tile) => tile.roomId === 'upperLanding'
    );

    expect(stairLandingVisualBounds.minX).toBeLessThan(
      upperStairWestEgressBlockerMinX
    );
    expect(stairLandingVisualBounds.maxX).toBeLessThanOrEqual(
      stairwellOpening.maxX
    );
    expect(
      upperLandingTiles.some((tile) =>
        overlaps(tile.bounds, stairLandingVisualBounds)
      )
    ).toBe(false);
    expect(
      upperLandingTiles.some(
        (tile) =>
          valuesAreClose(tile.bounds.maxX, stairLandingVisualBounds.minX) &&
          tile.bounds.minZ < stairLandingVisualBounds.maxZ &&
          tile.bounds.maxZ > stairLandingVisualBounds.minZ
      )
    ).toBe(true);
  });
});
