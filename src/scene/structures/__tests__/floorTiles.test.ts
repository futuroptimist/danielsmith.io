import { BoxGeometry, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, UPPER_FLOOR_PLAN } from '../../../assets/floorPlan';
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

describe('createRoomFloorTiles', () => {
  it('builds opaque upper-floor slabs with a targeted stairwell cutout', () => {
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
    const descentCorridorInset = 0.75;
    const stairTopZ = toWorldUnits(-5.3) - toWorldUnits(0.85) * 9;
    const landingClearance = toWorldUnits(0.05);
    const landingTriggerMargin = toWorldUnits(0.2);
    const upperLandingSolidStartZ = stairTopZ + landingClearance;
    const broadStairwellBounds = {
      minX: stairCenterX - stairHalfWidth - stairwellMarginX,
      maxX: stairCenterX + stairHalfWidth + stairwellMarginX,
      minZ: upperLandingRoom!.bounds.minZ,
      maxZ: upperLandingRoom!.bounds.maxZ,
    };
    const descentCorridorHalfWidth = Math.max(
      stairHalfWidth - descentCorridorInset,
      stairHalfWidth * 0.55
    );
    const stairwellCutout = {
      minX: stairCenterX - descentCorridorHalfWidth,
      maxX: stairCenterX + descentCorridorHalfWidth,
      minZ: upperLandingRoom!.bounds.minZ,
      maxZ: stairTopZ + landingTriggerMargin + landingClearance,
    };
    const shoulderStubCutouts = [
      {
        minX: upperLandingRoom!.bounds.minX,
        maxX: stairwellCutout.minX,
        minZ: upperLandingSolidStartZ,
        maxZ: upperLandingRoom!.bounds.maxZ,
      },
      {
        minX: stairwellCutout.maxX,
        maxX: upperLandingRoom!.bounds.maxX,
        minZ: upperLandingSolidStartZ,
        maxZ: upperLandingRoom!.bounds.maxZ,
      },
    ];
    const build = createRoomFloorTiles(UPPER_FLOOR_PLAN.rooms, {
      material,
      elevation: 4,
      thickness: 0.45,
      groupName: 'UpperFloorTiles',
      cutoutsByRoom: {
        upperLanding: [stairwellCutout, ...shoulderStubCutouts],
      },
    });

    const upperLandingTiles = build.tiles.filter(
      (tile) => tile.roomId === 'upperLanding'
    );

    expect(build.group.name).toBe('UpperFloorTiles');
    expect(upperLandingTiles.length).toBeGreaterThan(0);
    const fillsLeftStairwellShoulder = upperLandingTiles.some(
      (tile) =>
        tile.bounds.minX < broadStairwellBounds.minX &&
        tile.bounds.maxX > broadStairwellBounds.minX &&
        tile.bounds.maxX <= stairwellCutout.minX
    );
    const fillsRightStairwellShoulder = upperLandingTiles.some(
      (tile) =>
        tile.bounds.minX >= stairwellCutout.maxX &&
        tile.bounds.minX < broadStairwellBounds.maxX &&
        tile.bounds.maxX > broadStairwellBounds.maxX
    );
    const fillsCentralLandingPastDescent = upperLandingTiles.some(
      (tile) =>
        tile.bounds.minX >= stairwellCutout.minX &&
        tile.bounds.maxX <= stairwellCutout.maxX &&
        tile.bounds.minZ >= stairwellCutout.maxZ &&
        tile.bounds.maxZ === upperLandingRoom!.bounds.maxZ
    );
    expect(fillsLeftStairwellShoulder).toBe(true);
    expect(fillsRightStairwellShoulder).toBe(true);
    expect(fillsCentralLandingPastDescent).toBe(true);

    for (const tile of build.tiles) {
      const geometry = tile.mesh.geometry as BoxGeometry;
      expect(geometry.parameters.height).toBeCloseTo(0.45);
      expect(tile.mesh.position.y).toBeCloseTo(4 - 0.45 / 2);
      expect(tile.mesh.material).toBe(material);
    }

    for (const tile of upperLandingTiles) {
      expect(overlaps(tile.bounds, stairwellCutout)).toBe(false);
      for (const shoulderStubCutout of shoulderStubCutouts) {
        expect(overlaps(tile.bounds, shoulderStubCutout)).toBe(false);
      }
    }

    expect(material.transparent).toBe(false);
    expect(material.opacity).toBe(1);
    expect(material.depthWrite).toBe(true);
  });
});
