import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  getCombinedWallSegments,
  getFloorBounds,
} from '../../../assets/floorPlan';
import { compileLegacyFloorPlan } from '../compileLegacyFloorPlan';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { validateLevelDefinition } from '../schema';

const toWorld = (value: number) => value * FLOOR_PLAN_SCALE;

const normalizeSegments = (plan: typeof FLOOR_PLAN) =>
  getCombinedWallSegments(plan)
    .map((segment) => ({
      orientation: segment.orientation,
      start: segment.start,
      end: segment.end,
      rooms: segment.rooms.map((room) => `${room.id}:${room.wall}`).sort(),
    }))
    .sort((a, b) =>
      [a.orientation, a.start.x, a.start.z, a.end.x, a.end.z, a.rooms.join('|')]
        .join('|')
        .localeCompare(
          [
            b.orientation,
            b.start.x,
            b.start.z,
            b.end.x,
            b.end.z,
            b.rooms.join('|'),
          ].join('|')
        )
    );

const collectSourceIds = () =>
  PORTFOLIO_LEVEL.floors.flatMap((floor) => [
    ...floor.rooms.map((room) => room.sourceId),
    ...floor.walls.map((wall) => wall.sourceId),
    ...floor.floorSurfaces.map((surface) => surface.sourceId),
    ...(floor.safetyColliders ?? []).map((collider) => collider.sourceId),
    ...(floor.sceneObjects ?? []).map((object) => object.sourceId),
    ...(floor.roomConnections ?? []).map((connection) => connection.sourceId),
  ]);

describe('PORTFOLIO_LEVEL', () => {
  it('uses valid, unique production source IDs', () => {
    expect(validateLevelDefinition(PORTFOLIO_LEVEL).errors).toEqual([]);
    const sourceIds = collectSourceIds().map(String);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(sourceIds).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/(^|\.)(former|removed|debugonlyremoval)(\.|$)/),
      ])
    );
  });

  it('declares collider policies for migrated solid-like scene objects', () => {
    const migratedIds = [
      'flywheel-studio-flywheel',
      'jobbot-studio-terminal',
      'axel-studio-tracker',
      'wove-kitchen-loom',
      'pr-reaper-backyard-console',
    ];
    const sceneObjects = PORTFOLIO_LEVEL.floors.flatMap(
      (floor) => floor.sceneObjects ?? []
    );

    expect(sceneObjects.map((object) => object.id)).toEqual(
      expect.arrayContaining(migratedIds)
    );

    for (const object of sceneObjects.filter((next) =>
      migratedIds.includes(next.id)
    )) {
      expect(object.sourceId).toMatch(/\.scene_object$/);
      expect(object.colliderPolicy).toMatchObject({
        kind: 'custom',
        purpose: 'factory-colliders',
      });
      expect(object.purpose).toEqual(expect.any(String));
      expect(object.purpose?.trim()).not.toBe('');
    }
  });

  it('compiles compatibility room bounds and doorways for the current floors', () => {
    expect(
      compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'ground', {
        includeDoorwaysFromWallGaps: true,
      })
    ).toMatchSnapshot();
    expect(
      compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'upper', {
        includeDoorwaysFromWallGaps: true,
      })
    ).toMatchSnapshot();
  });

  it('keeps current compatibility floor bounds unchanged', () => {
    expect(getFloorBounds(FLOOR_PLAN)).toEqual({
      minX: toWorld(-16),
      maxX: toWorld(16),
      minZ: toWorld(-16),
      maxZ: toWorld(16),
    });
    expect(getFloorBounds(UPPER_FLOOR_PLAN)).toEqual({
      minX: toWorld(-14),
      maxX: toWorld(14),
      minZ: toWorld(-16),
      maxZ: toWorld(14),
    });
  });

  it('keeps current generated wall bounds stable for compatibility consumers', () => {
    expect(normalizeSegments(FLOOR_PLAN)).toMatchSnapshot();
    expect(normalizeSegments(UPPER_FLOOR_PLAN)).toMatchSnapshot();
  });

  it('does not let semantic room connections affect legacy room or wall generation', () => {
    const withoutConnections = {
      ...PORTFOLIO_LEVEL,
      floors: PORTFOLIO_LEVEL.floors.map((floor) => ({
        ...floor,
        roomConnections: [],
      })),
    };

    expect(
      compileLegacyFloorPlan(withoutConnections, 'ground', {
        includeDoorwaysFromWallGaps: true,
      })
    ).toEqual(
      compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'ground', {
        includeDoorwaysFromWallGaps: true,
      })
    );
    expect(
      compileLegacyFloorPlan(withoutConnections, 'upper', {
        includeDoorwaysFromWallGaps: true,
      })
    ).toEqual(
      compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'upper', {
        includeDoorwaysFromWallGaps: true,
      })
    );
  });
});
