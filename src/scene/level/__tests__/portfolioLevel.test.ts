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

    const migratedObjects = migratedIds.map((id) =>
      sceneObjects.find((object) => object.id === id)
    );
    expect(migratedObjects).not.toContain(undefined);

    const migratedSourceIds = migratedObjects.map((object) =>
      String(object!.sourceId)
    );
    expect(new Set(migratedSourceIds).size).toBe(migratedSourceIds.length);

    for (const object of migratedObjects) {
      expect(object!.sourceId).toMatch(/\.scene_object$/);
      expect(object!.colliderPolicy).toEqual({
        kind: 'custom',
        purpose: 'factory-colliders',
      });
      expect(object!.purpose).toEqual(expect.any(String));
      expect(object!.purpose?.trim()).not.toBe('');
    }
  });

  it('rejects scene objects outside their declared room or missing custom purpose', () => {
    const invalidLevel = {
      ...PORTFOLIO_LEVEL,
      floors: PORTFOLIO_LEVEL.floors.map((floor) =>
        floor.id === 'ground'
          ? {
              ...floor,
              sceneObjects: [
                ...(floor.sceneObjects ?? []),
                {
                  id: 'invalid-studio-object',
                  sourceId: floor.sceneObjects![0].sourceId,
                  floorId: 'ground',
                  kind: 'showpiece.invalid',
                  roomId: 'studio',
                  position: { x: 99, z: 99 },
                  colliderPolicy: { kind: 'custom' as const },
                },
              ],
            }
          : floor
      ),
    };

    expect(validateLevelDefinition(invalidLevel).errors).toEqual(
      expect.arrayContaining([
        'scene object "invalid-studio-object" position must stay within room "studio" bounds.',
        'scene object "invalid-studio-object" custom collider policy requires a purpose.',
      ])
    );
  });

  it('compiles compatibility room bounds and doorways for the current floors', () => {
    const ground = compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'ground', {
      includeDoorwaysFromWallGaps: true,
    });
    const upper = compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'upper', {
      includeDoorwaysFromWallGaps: true,
    });

    expect(ground.rooms.map((room) => room.id).sort()).toEqual([
      'backyard',
      'kitchen',
      'livingRoom',
      'studio',
    ]);
    expect(upper.rooms.map((room) => room.id).sort()).toEqual([
      'creatorsStudio',
      'focusPods',
      'loftLibrary',
      'upperLanding',
    ]);
    expect(
      ground.rooms.some((room) => (room.doorways?.length ?? 0) > 0)
    ).toBe(true);
    expect(upper.rooms.some((room) => (room.doorways?.length ?? 0) > 0)).toBe(
      true
    );
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

  it('keeps generated wall segments normalized for compatibility consumers', () => {
    const segments = [
      ...normalizeSegments(FLOOR_PLAN),
      ...normalizeSegments(UPPER_FLOOR_PLAN),
    ];

    expect(segments.length).toBeGreaterThan(0);
    segments.forEach((segment) => {
      expect(segment.rooms.length).toBeGreaterThan(0);
      expect(segment.start.x).toBeLessThanOrEqual(segment.end.x);
      expect(segment.start.z).toBeLessThanOrEqual(segment.end.z);
    });
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
