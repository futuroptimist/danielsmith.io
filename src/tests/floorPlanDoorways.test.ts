import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN } from '../assets/floorPlan';
import {
  getDoorwayClearanceZones,
  getDoorwayPassageZones,
  getNormalizedDoorways,
} from '../assets/floorPlan/doorways';

import {
  DOOR_EPSILON,
  resolveNormalizedDoorway,
} from './helpers/doorwayTestHelpers';

describe('getDoorwayClearanceZones', () => {
  const zones = getDoorwayClearanceZones(FLOOR_PLAN, {
    depth: 1.2,
    sidePadding: 0.4,
  });

  it('generates doorway clearances for rooms with door definitions', () => {
    const livingRoomZones = zones.filter(
      (zone) => zone.roomId === 'livingRoom'
    );
    expect(livingRoomZones.length).toBeGreaterThan(0);
  });

  it('creates north wall clearances that extend toward positive Z', () => {
    const livingNorth = zones.find(
      (zone) => zone.roomId === 'livingRoom' && zone.wall === 'north'
    );
    expect(livingNorth).toBeDefined();
    const { bounds } = livingNorth!;
    const room = FLOOR_PLAN.rooms.find((entry) => entry.id === 'livingRoom')!;
    expect(bounds.maxZ).toBeGreaterThan(room.bounds.maxZ);
    expect(bounds.minZ).toBeLessThan(bounds.maxZ);
  });

  it('clamps doorway padding within room bounds', () => {
    const studioEast = zones.find(
      (zone) => zone.roomId === 'studio' && zone.wall === 'west'
    );
    expect(studioEast).toBeDefined();
    const { bounds } = studioEast!;
    const room = FLOOR_PLAN.rooms.find((entry) => entry.id === 'studio')!;
    expect(bounds.minZ).toBeGreaterThanOrEqual(room.bounds.minZ - 1e-3);
    expect(bounds.maxZ).toBeLessThanOrEqual(room.bounds.maxZ + 1e-3);
  });
});

describe('getNormalizedDoorways', () => {
  const doorways = getNormalizedDoorways(FLOOR_PLAN);

  it('deduplicates shared doorway definitions', () => {
    const doorway = resolveNormalizedDoorway({
      doorways,
      roomAId: 'livingRoom',
      wallA: 'north',
      roomBId: 'kitchen',
      wallB: 'south',
    });
    expect(doorway).toBeDefined();
    expect(doorway?.width).toBeGreaterThan(0);
  });

  it('includes vertical doorway centers for east-west transitions', () => {
    const doorway = resolveNormalizedDoorway({
      doorways,
      roomAId: 'kitchen',
      wallA: 'east',
      roomBId: 'studio',
      wallB: 'west',
    });
    expect(doorway).toBeDefined();
    expect(doorway?.axis).toBe('vertical');
  });
});

describe('getDoorwayPassageZones', () => {
  const padding = 0.5;
  const depth = 2;
  const zones = getDoorwayPassageZones(FLOOR_PLAN, { padding, depth });

  it('extends horizontal passages along the Z axis using depth', () => {
    const normalized = resolveNormalizedDoorway({
      roomAId: 'livingRoom',
      wallA: 'north',
      roomBId: 'kitchen',
      wallB: 'south',
    });
    const livingKitchen = zones.find(
      (zone) =>
        normalized &&
        Math.abs(zone.doorway.center.x - normalized.center.x) < DOOR_EPSILON &&
        Math.abs(zone.doorway.center.z - normalized.center.z) < DOOR_EPSILON
    );
    expect(livingKitchen).toBeDefined();
    if (!livingKitchen) {
      return;
    }
    const halfDepth = depth / 2;
    expect(livingKitchen.bounds.minZ).toBeCloseTo(
      livingKitchen.doorway.center.z - halfDepth,
      3
    );
    expect(livingKitchen.bounds.maxZ).toBeCloseTo(
      livingKitchen.doorway.center.z + halfDepth,
      3
    );
  });

  it('pads vertical passages along the X axis', () => {
    const normalized = resolveNormalizedDoorway({
      roomAId: 'kitchen',
      wallA: 'east',
      roomBId: 'studio',
      wallB: 'west',
    });
    const kitchenStudio = zones.find(
      (zone) =>
        normalized &&
        Math.abs(zone.doorway.center.x - normalized.center.x) < DOOR_EPSILON &&
        Math.abs(zone.doorway.center.z - normalized.center.z) < DOOR_EPSILON
    );
    expect(kitchenStudio).toBeDefined();
    if (!kitchenStudio) {
      return;
    }
    const halfWidth = kitchenStudio.doorway.width / 2;
    expect(kitchenStudio.bounds.minX).toBeCloseTo(
      kitchenStudio.doorway.center.x - depth / 2,
      3
    );
    expect(kitchenStudio.bounds.maxX).toBeCloseTo(
      kitchenStudio.doorway.center.x + depth / 2,
      3
    );
    expect(kitchenStudio.bounds.minZ).toBeCloseTo(
      kitchenStudio.doorway.center.z - halfWidth - padding,
      3
    );
    expect(kitchenStudio.bounds.maxZ).toBeCloseTo(
      kitchenStudio.doorway.center.z + halfWidth + padding,
      3
    );
  });
});
