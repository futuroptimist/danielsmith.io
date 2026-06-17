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
            gaps: [{ start: 1.5, end: 2.5 }],
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
      outline: level.floors[0].outline,
      rooms: [
        expect.objectContaining({ id: 'left', doorways: undefined }),
        expect.objectContaining({ id: 'right', doorways: undefined }),
      ],
    });
  });

  it('derives legacy doorway compatibility from current wall gaps when requested', () => {
    const plan = compileLegacyFloorPlan(level, 'ground', {
      includeDoorwaysFromWallGaps: true,
    });

    expect(plan.rooms).toMatchObject([
      { id: 'left', doorways: [{ wall: 'east', start: 1.5, end: 2.5 }] },
      { id: 'right', doorways: [{ wall: 'west', start: 1.5, end: 2.5 }] },
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
