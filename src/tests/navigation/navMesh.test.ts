import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN, WALL_THICKNESS } from '../../assets/floorPlan';
import { createNavMesh } from '../../systems/navigation/navMesh';
import { resolveNormalizedDoorway } from '../helpers/doorwayTestHelpers';

const PLAYER_RADIUS = 0.75;

describe('createNavMesh', () => {
  const doorwayPadding = PLAYER_RADIUS * 0.6;
  const doorwayDepth = WALL_THICKNESS + PLAYER_RADIUS * 2;
  const extraZone = { minX: 40, maxX: 42, minZ: 40, maxZ: 42 };
  const navMesh = createNavMesh(FLOOR_PLAN, {
    padding: doorwayPadding,
    depth: doorwayDepth,
    extraZones: [extraZone],
  });

  it('contains points inside interior rooms', () => {
    expect(navMesh.contains(0, -10)).toBe(true);
  });

  it('spans doorway thresholds along north-south transitions', () => {
    const livingKitchen = resolveNormalizedDoorway({
      roomAId: 'livingRoom',
      wallA: 'north',
      roomBId: 'kitchen',
      wallB: 'south',
    });
    expect(livingKitchen).toBeDefined();
    if (!livingKitchen) {
      return;
    }
    const halfDepth = doorwayDepth / 2 - 0.05;
    expect(
      navMesh.contains(livingKitchen.center.x, livingKitchen.center.z)
    ).toBe(true);
    expect(
      navMesh.contains(
        livingKitchen.center.x,
        livingKitchen.center.z + halfDepth
      )
    ).toBe(true);
    expect(
      navMesh.contains(
        livingKitchen.center.x,
        livingKitchen.center.z - halfDepth
      )
    ).toBe(true);
  });

  it('spans doorway thresholds along east-west transitions', () => {
    const kitchenStudio = resolveNormalizedDoorway({
      roomAId: 'kitchen',
      wallA: 'east',
      roomBId: 'studio',
      wallB: 'west',
    });
    expect(kitchenStudio).toBeDefined();
    if (!kitchenStudio) {
      return;
    }
    const halfDepth = doorwayDepth / 2 - 0.05;
    expect(
      navMesh.contains(
        kitchenStudio.center.x + halfDepth,
        kitchenStudio.center.z
      )
    ).toBe(true);
    expect(
      navMesh.contains(
        kitchenStudio.center.x - halfDepth,
        kitchenStudio.center.z
      )
    ).toBe(true);
  });

  it('includes explicitly provided zones', () => {
    expect(navMesh.contains(41, 41)).toBe(true);
  });
});
