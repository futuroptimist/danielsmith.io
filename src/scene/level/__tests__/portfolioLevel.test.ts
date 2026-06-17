import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  getCombinedWallSegments,
  getFloorBounds,
  scaleFloorPlanDefinition,
} from '../../../assets/floorPlan';
import { compileLegacyFloorPlan } from '../compileLegacyFloorPlan';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { assertValidLevelDefinition } from '../schema';

const scaledCompiledPlan = (floorId: string) =>
  scaleFloorPlanDefinition(
    compileLegacyFloorPlan(PORTFOLIO_LEVEL, floorId, {
      includeDoorwaysFromWallGaps: true,
    })
  );

const wallSnapshot = (floorId: string) =>
  getCombinedWallSegments(scaledCompiledPlan(floorId)).map((segment) => ({
    orientation: segment.orientation,
    start: segment.start,
    end: segment.end,
    rooms: segment.rooms,
  }));

describe('PORTFOLIO_LEVEL', () => {
  it('is valid and uses unique source IDs for current production records', () => {
    expect(() => assertValidLevelDefinition(PORTFOLIO_LEVEL)).not.toThrow();

    const ids = PORTFOLIO_LEVEL.floors.flatMap((floor) => [
      ...floor.rooms.map((room) => room.sourceId),
      ...floor.walls.map((wall) => wall.sourceId),
      ...floor.floorSurfaces.map((surface) => surface.sourceId),
      ...(floor.safetyColliders ?? []).map((collider) => collider.sourceId),
      ...(floor.sceneObjects ?? []).map((object) => object.sourceId),
      ...(floor.roomConnections ?? []).map((connection) => connection.sourceId),
    ]);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.join(' ')).not.toMatch(/\b(former|removed|debugonlyremoval)\b/);
  });

  it('compiles compatibility floor plans with the current room bounds and doorway data', () => {
    expect(scaledCompiledPlan('ground')).toEqual(FLOOR_PLAN);
    expect(scaledCompiledPlan('upper')).toEqual(UPPER_FLOOR_PLAN);
  });

  it('keeps current floor bounds unchanged', () => {
    expect(getFloorBounds(FLOOR_PLAN)).toEqual({
      minX: -16 * FLOOR_PLAN_SCALE,
      maxX: 16 * FLOOR_PLAN_SCALE,
      minZ: -16 * FLOOR_PLAN_SCALE,
      maxZ: 16 * FLOOR_PLAN_SCALE,
    });
    expect(getFloorBounds(UPPER_FLOOR_PLAN)).toEqual({
      minX: -14 * FLOOR_PLAN_SCALE,
      maxX: 14 * FLOOR_PLAN_SCALE,
      minZ: -16 * FLOOR_PLAN_SCALE,
      maxZ: 14 * FLOOR_PLAN_SCALE,
    });
    expect(FLOOR_PLAN_SCALE).toBe(2.0000000000000004);
  });

  it('compiles declarative wall runs to the current expected wall bounds', () => {
    expect(wallSnapshot('ground')).toMatchSnapshot();
    expect(wallSnapshot('upper')).toMatchSnapshot();
  });

  it('does not use room connections to generate legacy walls or floors', () => {
    const withoutConnections = {
      ...PORTFOLIO_LEVEL,
      floors: PORTFOLIO_LEVEL.floors.map((floor) => ({
        ...floor,
        roomConnections: [],
      })),
    };

    expect(
      scaleFloorPlanDefinition(
        compileLegacyFloorPlan(withoutConnections, 'ground', {
          includeDoorwaysFromWallGaps: true,
        })
      )
    ).toEqual(FLOOR_PLAN);
    expect(
      scaleFloorPlanDefinition(
        compileLegacyFloorPlan(withoutConnections, 'upper', {
          includeDoorwaysFromWallGaps: true,
        })
      )
    ).toEqual(UPPER_FLOOR_PLAN);
  });
});
