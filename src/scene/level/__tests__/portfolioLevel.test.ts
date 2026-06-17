import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  getCombinedWallSegments,
} from '../../../assets/floorPlan';
import { compileLegacyFloorPlan } from '../compileLegacyFloorPlan';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { assertValidLevelDefinition } from '../schema';

const scalePlan = (plan: ReturnType<typeof compileLegacyFloorPlan>) => ({
  outline: plan.outline.map(([x, z]) => [
    x * FLOOR_PLAN_SCALE,
    z * FLOOR_PLAN_SCALE,
  ]),
  rooms: plan.rooms.map((room) => ({
    ...room,
    bounds: {
      minX: room.bounds.minX * FLOOR_PLAN_SCALE,
      maxX: room.bounds.maxX * FLOOR_PLAN_SCALE,
      minZ: room.bounds.minZ * FLOOR_PLAN_SCALE,
      maxZ: room.bounds.maxZ * FLOOR_PLAN_SCALE,
    },
    doorways: room.doorways?.map((doorway) => ({
      ...doorway,
      start: doorway.start * FLOOR_PLAN_SCALE,
      end: doorway.end * FLOOR_PLAN_SCALE,
    })),
  })),
});

const canonicalSourceRecords = () =>
  PORTFOLIO_LEVEL.floors.flatMap((floor) => [
    ...floor.rooms,
    ...floor.walls,
    ...floor.floorSurfaces,
    ...(floor.safetyColliders ?? []),
    ...(floor.sceneObjects ?? []),
    ...(floor.roomConnections ?? []),
  ]);

describe('portfolio declarative level source', () => {
  it('validates source IDs and keeps them globally unique', () => {
    expect(() => assertValidLevelDefinition(PORTFOLIO_LEVEL)).not.toThrow();

    const sourceIds = canonicalSourceRecords().map((record) => record.sourceId);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
  });

  it('does not use tombstone/debug-deletion wording in production source records', () => {
    const serialized = JSON.stringify(canonicalSourceRecords()).toLowerCase();

    expect(serialized).not.toMatch(
      /former|removed|debug-id-driven|debugonlyremoval/
    );
  });

  it('compiles ground and upper rooms into the stable compatibility exports', () => {
    const ground = compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'ground', {
      includeDoorwaysFromWallGaps: true,
    });
    const upper = compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'upper', {
      includeDoorwaysFromWallGaps: true,
    });

    expect(scalePlan(ground)).toEqual(FLOOR_PLAN);
    expect(scalePlan(upper)).toEqual(UPPER_FLOOR_PLAN);
  });

  it('keeps current floor bounds unchanged', () => {
    expect(FLOOR_PLAN.outline).toEqual([
      [expect.closeTo(-32), expect.closeTo(-32)],
      [expect.closeTo(32), expect.closeTo(-32)],
      [expect.closeTo(32), expect.closeTo(32)],
      [expect.closeTo(-32), expect.closeTo(32)],
    ]);
    expect(UPPER_FLOOR_PLAN.outline).toEqual([
      [expect.closeTo(-28), expect.closeTo(-32)],
      [expect.closeTo(28), expect.closeTo(-32)],
      [expect.closeTo(28), expect.closeTo(28)],
      [expect.closeTo(-28), expect.closeTo(28)],
    ]);
  });

  it('preserves current generated wall segment inventory', () => {
    expect(getCombinedWallSegments(FLOOR_PLAN)).toHaveLength(18);
    expect(getCombinedWallSegments(UPPER_FLOOR_PLAN)).toHaveLength(17);
  });

  it('proves semantic room connections do not affect compatibility floor output', () => {
    const withoutConnections = structuredClone(PORTFOLIO_LEVEL);
    withoutConnections.floors.forEach((floor) => {
      floor.roomConnections = [];
    });

    expect(
      compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'ground', {
        includeDoorwaysFromWallGaps: true,
      })
    ).toEqual(
      compileLegacyFloorPlan(withoutConnections, 'ground', {
        includeDoorwaysFromWallGaps: true,
      })
    );
  });
});
