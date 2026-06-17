import { describe, expect, it } from 'vitest';

import { compileLegacyFloorPlan } from '../compileLegacyFloorPlan';
import type { LevelDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

const level: LevelDefinition = {
  id: 'test-level',
  floors: [
    {
      id: 'ground',
      name: 'Ground',
      outline: [
        [0, 0],
        [8, 0],
        [8, 4],
        [0, 4],
      ],
      rooms: [
        {
          id: 'left',
          sourceId: sourceId('ground.left.room'),
          name: 'Left',
          bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
          ledColor: 0xffffff,
        },
        {
          id: 'right',
          sourceId: sourceId('ground.right.room'),
          name: 'Right',
          bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
          ledColor: 0xff00ff,
        },
      ],
      walls: [
        {
          id: 'dividing-wall',
          sourceId: sourceId('ground.dividing_wall'),
          floorId: 'ground',
          wallKind: 'wall',
          run: {
            start: { x: 4, z: 0 },
            end: { x: 4, z: 4 },
            gaps: [{ start: 1.3, end: 2.7 }],
          },
          rooms: ['left', 'right'],
        },
      ],
      floorSurfaces: [
        {
          id: 'left-floor',
          sourceId: sourceId('ground.left.floor_surface'),
          floorId: 'ground',
          bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
        },
      ],
      roomConnections: [
        {
          id: 'left-to-right',
          sourceId: sourceId('ground.left_to_right.connection'),
          floorId: 'ground',
          rooms: ['left', 'right'],
          purpose: 'semantic adjacency only',
        },
      ],
    },
  ],
};

describe('compileLegacyFloorPlan', () => {
  it('compiles declarative rooms into the legacy floor plan shape', () => {
    expect(compileLegacyFloorPlan(level, 'ground')).toEqual({
      outline: level.floors[0].outline.map(([x, z]) => [x, z]),
      rooms: [
        expect.objectContaining({ id: 'left', doorways: undefined }),
        expect.objectContaining({ id: 'right', doorways: undefined }),
      ],
    });
  });

  it('copies mutable legacy plan data away from the declarative source', () => {
    const plan = compileLegacyFloorPlan(level, 'ground');

    plan.outline[0][0] = 999;
    plan.rooms[0].bounds.minX = 999;

    expect(level.floors[0].outline[0][0]).toBe(0);
    expect(level.floors[0].rooms[0].bounds.minX).toBe(0);
  });

  it('derives legacy doorway compatibility from current wall gaps when requested', () => {
    const plan = compileLegacyFloorPlan(level, 'ground', {
      includeDoorwaysFromWallGaps: true,
    });

    expect(plan.rooms).toMatchObject([
      { id: 'left', doorways: [{ wall: 'east', start: 1.3, end: 2.7 }] },
      { id: 'right', doorways: [{ wall: 'west', start: 1.3, end: 2.7 }] },
    ]);
  });

  it('projects offset and reversed vertical wall gaps into absolute doorway ranges', () => {
    const offset = structuredClone(level);
    offset.floors[0].walls[0].run = {
      start: { x: 4, z: 4 },
      end: { x: 4, z: 0 },
      gaps: [{ start: 1.3, end: 2.7 }],
    };

    const plan = compileLegacyFloorPlan(offset, 'ground', {
      includeDoorwaysFromWallGaps: true,
    });

    expect(plan.rooms).toMatchObject([
      { id: 'left', doorways: [{ wall: 'east', start: 1.3, end: 2.7 }] },
      { id: 'right', doorways: [{ wall: 'west', start: 1.3, end: 2.7 }] },
    ]);
  });

  it('projects offset and reversed horizontal wall gaps into absolute doorway ranges', () => {
    const horizontal = structuredClone(level);
    horizontal.floors[0].rooms = [
      {
        id: 'bottom',
        sourceId: sourceId('ground.bottom.room'),
        name: 'Bottom',
        bounds: { minX: 0, maxX: 8, minZ: 0, maxZ: 2 },
        ledColor: 0xffffff,
      },
      {
        id: 'top',
        sourceId: sourceId('ground.top.room'),
        name: 'Top',
        bounds: { minX: 0, maxX: 8, minZ: 2, maxZ: 4 },
        ledColor: 0xff00ff,
      },
    ];
    horizontal.floors[0].walls[0] = {
      ...horizontal.floors[0].walls[0],
      run: {
        start: { x: 8, z: 2 },
        end: { x: 0, z: 2 },
        gaps: [{ start: 2, end: 4 }],
      },
      rooms: ['bottom', 'top'],
    };
    horizontal.floors[0].floorSurfaces[0].roomId = 'bottom';
    horizontal.floors[0].roomConnections = [];

    const plan = compileLegacyFloorPlan(horizontal, 'ground', {
      includeDoorwaysFromWallGaps: true,
    });

    expect(plan.rooms).toMatchObject([
      { id: 'bottom', doorways: [{ wall: 'north', start: 4, end: 6 }] },
      { id: 'top', doorways: [{ wall: 'south', start: 4, end: 6 }] },
    ]);
  });

  it('clips projected wall gaps to the room edge and rechecks doorway width', () => {
    const partialOverlap = structuredClone(level);
    partialOverlap.floors[0].rooms[0].bounds.maxZ = 5;
    partialOverlap.floors[0].rooms[1].bounds.maxZ = 5;
    partialOverlap.floors[0].outline = [
      [0, 0],
      [8, 0],
      [8, 5],
      [0, 5],
    ];
    partialOverlap.floors[0].walls[0].run = {
      start: { x: 4, z: 0 },
      end: { x: 4, z: 10 },
      gaps: [
        { start: 4.1, end: 5.3 },
        { start: 1.3, end: 2.7 },
      ],
    };

    const plan = compileLegacyFloorPlan(partialOverlap, 'ground', {
      includeDoorwaysFromWallGaps: true,
    });

    expect(plan.rooms).toMatchObject([
      { id: 'left', doorways: [{ wall: 'east', start: 1.3, end: 2.7 }] },
      { id: 'right', doorways: [{ wall: 'west', start: 1.3, end: 2.7 }] },
    ]);
  });

  it('ignores wall gaps that do not overlap the referenced room boundary', () => {
    const nonOverlapping = structuredClone(level);
    nonOverlapping.floors[0].walls[0].run = {
      start: { x: 4, z: 5 },
      end: { x: 4, z: 7 },
      gaps: [{ start: 0.1, end: 1.4 }],
    };

    const plan = compileLegacyFloorPlan(nonOverlapping, 'ground', {
      includeDoorwaysFromWallGaps: true,
    });

    expect(plan.rooms).toMatchObject([
      { id: 'left', doorways: undefined },
      { id: 'right', doorways: undefined },
    ]);
  });

  it('proves semantic room connections alone do not generate or remove geometry', () => {
    const withoutConnections = structuredClone(level);
    withoutConnections.floors[0].roomConnections = [];

    expect(compileLegacyFloorPlan(level, 'ground')).toEqual(
      compileLegacyFloorPlan(withoutConnections, 'ground')
    );
  });
});
