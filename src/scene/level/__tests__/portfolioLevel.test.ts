import { describe, expect, it } from 'vitest';

import {
  FLOOR_PLAN,
  FLOOR_PLAN_LEVELS,
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  getCombinedWallSegments,
  getFloorBounds,
} from '../../../assets/floorPlan';
import { compileLegacyFloorPlan } from '../compileLegacyFloorPlan';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import type { LevelDefinition } from '../schema';
import { validateLevelDefinition } from '../schema';

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

const expectedLegacyPlans = {
  ground: {
    outline: [
      [-16, -16],
      [16, -16],
      [16, 16],
      [-16, 16],
    ],
    rooms: [
      {
        id: 'livingRoom',
        bounds: { minX: -16, maxX: 16, minZ: -16, maxZ: -4 },
        doorways: [
          { wall: 'north', start: -11, end: -7 },
          { wall: 'north', start: 5.5, end: 9.5 },
        ],
      },
      {
        id: 'studio',
        bounds: { minX: -2, maxX: 16, minZ: -4, maxZ: 8 },
        doorways: [
          { wall: 'south', start: 5.5, end: 9.5 },
          { wall: 'west', start: 0, end: 4 },
          { wall: 'north', start: 5.5, end: 9.5 },
        ],
      },
      {
        id: 'kitchen',
        bounds: { minX: -16, maxX: -2, minZ: -4, maxZ: 8 },
        doorways: [
          { wall: 'south', start: -11, end: -7 },
          { wall: 'east', start: 0, end: 4 },
          { wall: 'north', start: -11, end: -7 },
        ],
      },
      {
        id: 'backyard',
        bounds: { minX: -16, maxX: 16, minZ: 8, maxZ: 16 },
        doorways: [
          { wall: 'south', start: -11, end: -7 },
          { wall: 'south', start: 5.5, end: 9.5 },
        ],
      },
    ],
  },
  upper: {
    outline: [
      [-14, -16],
      [14, -16],
      [14, 14],
      [-14, 14],
    ],
    rooms: [
      {
        id: 'upperLanding',
        bounds: { minX: 2, maxX: 10.4, minZ: -16, maxZ: -8 },
        doorways: [
          { wall: 'west', start: -16, end: -13.07 },
          { wall: 'north', start: 2, end: 8.2 },
        ],
      },
      {
        id: 'creatorsStudio',
        bounds: { minX: -10, maxX: 2, minZ: -16, maxZ: 0 },
        doorways: [
          { wall: 'east', start: -16, end: -13.07 },
          { wall: 'east', start: -6, end: -2 },
        ],
      },
      {
        id: 'loftLibrary',
        bounds: { minX: 2, maxX: 12, minZ: -8, maxZ: 6 },
        doorways: [
          { wall: 'south', start: 2, end: 8.2 },
          { wall: 'west', start: -6, end: -2 },
          { wall: 'north', start: 2, end: 6 },
        ],
      },
      {
        id: 'focusPods',
        bounds: { minX: -10, maxX: 12, minZ: 6, maxZ: 14 },
        doorways: [{ wall: 'south', start: 2, end: 6 }],
      },
    ],
  },
};

describe('PORTFOLIO_LEVEL', () => {
  it('is a valid declarative source with unique source IDs', () => {
    expect(validateLevelDefinition(PORTFOLIO_LEVEL).errors).toEqual([]);
  });

  it('does not use production tombstone terms in source IDs or labels', () => {
    const serialized = JSON.stringify(PORTFOLIO_LEVEL);

    expect(serialized).not.toMatch(/former|removed|debug-ID-driven deletion/i);
  });

  it('compiles current room bounds and doorway compatibility from source wall gaps', () => {
    expect(compilePlanFor('ground')).toMatchObject(expectedLegacyPlans.ground);
    expect(compilePlanFor('upper')).toMatchObject(expectedLegacyPlans.upper);
  });

  it('keeps compatibility floor-plan exports stable and scaled', () => {
    expect(FLOOR_PLAN).toEqual(scaleExpectedPlan(expectedLegacyPlans.ground));
    expect(UPPER_FLOOR_PLAN).toEqual(
      scaleExpectedPlan(expectedLegacyPlans.upper)
    );
    expect(FLOOR_PLAN_LEVELS.map((level) => level.id)).toEqual([
      'ground',
      'upper',
    ]);
  });

  it('preserves current floor bounds', () => {
    expect(getFloorBounds(FLOOR_PLAN)).toEqual({
      minX: toWorldUnits(-16),
      maxX: toWorldUnits(16),
      minZ: toWorldUnits(-16),
      maxZ: toWorldUnits(16),
    });
    expect(getFloorBounds(UPPER_FLOOR_PLAN)).toEqual({
      minX: toWorldUnits(-14),
      maxX: toWorldUnits(14),
      minZ: toWorldUnits(-16),
      maxZ: toWorldUnits(14),
    });
  });

  it('documents room connections without letting them affect wall or floor generation', () => {
    const withoutConnections: LevelDefinition = {
      ...PORTFOLIO_LEVEL,
      floors: PORTFOLIO_LEVEL.floors.map((floor) => ({
        ...floor,
        roomConnections: [],
      })),
    };

    expect(compileLegacyFloorPlan(withoutConnections, 'ground')).toEqual(
      compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'ground')
    );
    expect(compileLegacyFloorPlan(withoutConnections, 'upper')).toEqual(
      compileLegacyFloorPlan(PORTFOLIO_LEVEL, 'upper')
    );
  });

  it('compiles declarative wall runs to the same wall bounds as compatibility output', () => {
    for (const floor of PORTFOLIO_LEVEL.floors) {
      const sourceSegments = normalizeSegments(
        compileSourceWallSegments(floor.id)
      );
      const compatibilitySegments = normalizeSegments(
        getCombinedWallSegments(compilePlanFor(floor.id)).map((segment) => ({
          orientation: segment.orientation,
          start: segment.start,
          end: segment.end,
        }))
      );

      expect(sourceSegments).toEqual(compatibilitySegments);
    }
  });
});

function compilePlanFor(floorId: string) {
  return compileLegacyFloorPlan(PORTFOLIO_LEVEL, floorId, {
    includeDoorwaysFromWallGaps: true,
  });
}

function scaleExpectedPlan(plan: (typeof expectedLegacyPlans)['ground']) {
  return {
    outline: plan.outline.map(([x, z]) => [toWorldUnits(x), toWorldUnits(z)]),
    rooms: plan.rooms.map((room) => ({
      ...room,
      name: expect.any(String),
      ledColor: expect.any(Number),
      category: room.id === 'backyard' ? 'exterior' : undefined,
      bounds: {
        minX: toWorldUnits(room.bounds.minX),
        maxX: toWorldUnits(room.bounds.maxX),
        minZ: toWorldUnits(room.bounds.minZ),
        maxZ: toWorldUnits(room.bounds.maxZ),
      },
      doorways: room.doorways.map((doorway) => ({
        ...doorway,
        start: toWorldUnits(doorway.start),
        end: toWorldUnits(doorway.end),
      })),
    })),
  };
}

function compileSourceWallSegments(floorId: string) {
  const floor = PORTFOLIO_LEVEL.floors.find(
    (candidate) => candidate.id === floorId
  );
  if (!floor) throw new Error(`Missing floor ${floorId}`);

  return floor.walls.flatMap((wall) => {
    if (!('run' in wall)) return wall.segments;

    const length = Math.hypot(
      wall.run.end.x - wall.run.start.x,
      wall.run.end.z - wall.run.start.z
    );
    const breakpoints = [
      0,
      length,
      ...(wall.run.gaps ?? []).flatMap((gap) => [gap.start, gap.end]),
    ];

    for (const room of floor.rooms.filter((candidate) =>
      wall.rooms?.includes(candidate.id)
    )) {
      if (Math.abs(wall.run.start.z - wall.run.end.z) <= 1e-6) {
        const runZ = wall.run.start.z;
        if (
          Math.abs(room.bounds.minZ - runZ) <= 1e-6 ||
          Math.abs(room.bounds.maxZ - runZ) <= 1e-6
        ) {
          breakpoints.push(
            room.bounds.minX - wall.run.start.x,
            room.bounds.maxX - wall.run.start.x
          );
        }
      } else {
        const runX = wall.run.start.x;
        if (
          Math.abs(room.bounds.minX - runX) <= 1e-6 ||
          Math.abs(room.bounds.maxX - runX) <= 1e-6
        ) {
          breakpoints.push(
            room.bounds.minZ - wall.run.start.z,
            room.bounds.maxZ - wall.run.start.z
          );
        }
      }
    }

    const sorted = [...new Set(breakpoints)]
      .filter((point) => point >= -1e-6 && point <= length + 1e-6)
      .sort((a, b) => a - b);

    return sorted.flatMap((start, index) => {
      const end = sorted[index + 1];
      if (end === undefined) return [];
      const isGap = (wall.run.gaps ?? []).some(
        (gap) => gap.start <= start + 1e-6 && gap.end >= end - 1e-6
      );
      if (isGap) return [];
      const segment = makeSegment(wall.run, start, end);
      return segment ? [segment] : [];
    });
  });
}

function makeSegment(
  run: NonNullable<PORTFOLIO_LEVEL['floors'][number]['walls'][number]['run']>,
  start: number,
  end: number
) {
  if (end - start <= 1e-6) return undefined;

  const length = Math.hypot(run.end.x - run.start.x, run.end.z - run.start.z);
  const pointAt = (distance: number) => ({
    x: run.start.x + ((run.end.x - run.start.x) * distance) / length,
    z: run.start.z + ((run.end.z - run.start.z) * distance) / length,
  });
  const segment = { start: pointAt(start), end: pointAt(end) };

  return {
    orientation:
      Math.abs(segment.start.z - segment.end.z) <= 1e-6
        ? 'horizontal'
        : 'vertical',
    ...segment,
  };
}

function normalizeSegments(
  segments: Array<{
    orientation: string;
    start: { x: number; z: number };
    end: { x: number; z: number };
  }>
) {
  return segments
    .map((segment) => ({
      orientation: segment.orientation,
      start: {
        x: Number(Math.min(segment.start.x, segment.end.x).toFixed(3)),
        z: Number(Math.min(segment.start.z, segment.end.z).toFixed(3)),
      },
      end: {
        x: Number(Math.max(segment.start.x, segment.end.x).toFixed(3)),
        z: Number(Math.max(segment.start.z, segment.end.z).toFixed(3)),
      },
    }))
    .sort(
      (a, b) =>
        a.orientation.localeCompare(b.orientation) ||
        a.start.x - b.start.x ||
        a.start.z - b.start.z ||
        a.end.x - b.end.x ||
        a.end.z - b.end.z
    );
}
