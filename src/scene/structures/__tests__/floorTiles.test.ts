import { BoxGeometry, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, UPPER_FLOOR_PLAN } from '../../../assets/floorPlan';
import { computeStairwellOpeningBounds } from '../../../systems/movement/stairLayout';
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

const fullyCovers = (
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  cutout: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  bounds.minX <= cutout.minX &&
  bounds.maxX >= cutout.maxX &&
  bounds.minZ <= cutout.minZ &&
  bounds.maxZ >= cutout.maxZ;

describe('createRoomFloorTiles', () => {
  it('builds opaque upper-floor slabs with a layout-derived stairwell cutout', () => {
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
    const stairBottomZ = toWorldUnits(-5.3);
    const stairRun = toWorldUnits(0.85);
    const stairLandingDepth = toWorldUnits(2.6);
    const stairwellMarginZ = toWorldUnits(0.4);
    const stairwellOpening = computeStairwellOpeningBounds({
      baseZ: stairBottomZ,
      stepRun: stairRun,
      stepCount: 9,
      landingDepth: stairLandingDepth,
      direction: 'negativeZ',
      guardMargin: toWorldUnits(0.6),
      stairwellMargin: stairwellMarginZ,
      centerX: stairCenterX,
      halfWidth: stairHalfWidth,
      marginX: stairwellMarginX,
    });
    const stairwellCutout = {
      minX: Math.max(upperLandingRoom!.bounds.minX, stairwellOpening.minX),
      maxX: Math.min(upperLandingRoom!.bounds.maxX, stairwellOpening.maxX),
      minZ: Math.max(upperLandingRoom!.bounds.minZ, stairwellOpening.minZ),
      maxZ: Math.min(upperLandingRoom!.bounds.maxZ, stairwellOpening.maxZ),
    };
    const build = createRoomFloorTiles(UPPER_FLOOR_PLAN.rooms, {
      material,
      elevation: 4,
      thickness: 0.45,
      groupName: 'UpperFloorTiles',
      cutoutsByRoom: {
        upperLanding: [stairwellCutout],
      },
    });

    const upperLandingTiles = build.tiles.filter(
      (tile) => tile.roomId === 'upperLanding'
    );

    expect(build.group.name).toBe('UpperFloorTiles');
    expect(upperLandingTiles.length).toBeGreaterThan(0);
    expect(stairwellCutout.minX).toBeCloseTo(
      stairCenterX - stairHalfWidth - stairwellMarginX
    );
    expect(stairwellCutout.maxX).toBeCloseTo(
      stairCenterX + stairHalfWidth + stairwellMarginX
    );
    expect(stairwellCutout.minZ).toBeCloseTo(
      Math.max(upperLandingRoom!.bounds.minZ, stairwellOpening.minZ)
    );
    expect(stairwellCutout.maxZ).toBeCloseTo(upperLandingRoom!.bounds.maxZ);

    const fillsLeftStairwellShoulder = upperLandingTiles.some(
      (tile) =>
        tile.bounds.minX < stairwellCutout.minX &&
        tile.bounds.maxX === stairwellCutout.minX &&
        tile.bounds.minZ === upperLandingRoom!.bounds.minZ &&
        tile.bounds.maxZ === upperLandingRoom!.bounds.maxZ
    );
    const fillsRightStairwellShoulder = upperLandingTiles.some(
      (tile) =>
        tile.bounds.minX === stairwellCutout.maxX &&
        tile.bounds.maxX > stairwellCutout.maxX &&
        tile.bounds.minZ === upperLandingRoom!.bounds.minZ &&
        tile.bounds.maxZ === upperLandingRoom!.bounds.maxZ
    );
    expect(fillsLeftStairwellShoulder).toBe(true);
    expect(fillsRightStairwellShoulder).toBe(true);

    for (const tile of build.tiles) {
      const geometry = tile.mesh.geometry as BoxGeometry;
      expect(geometry.parameters.height).toBeCloseTo(0.45);
      expect(tile.mesh.position.y).toBeCloseTo(4 - 0.45 / 2);
      expect(tile.mesh.material).toBe(material);
    }

    for (const tile of upperLandingTiles) {
      expect(overlaps(tile.bounds, stairwellCutout)).toBe(false);
      expect(fullyCovers(tile.bounds, stairwellCutout)).toBe(false);
    }

    expect(material.transparent).toBe(false);
    expect(material.opacity).toBe(1);
    expect(material.depthWrite).toBe(true);
  });
});
