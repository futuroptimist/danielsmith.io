import { describe, expect, it } from 'vitest';

import { compileLegacyFloorPlan } from '../compileLegacyFloorPlan';
import type { FloorDefinition, LevelDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

const floor: FloorDefinition = {
  id: 'ground',
  name: 'Ground Floor',
  outline: [
    [0, 0],
    [10, 0],
    [10, 5],
    [0, 5],
  ],
  rooms: [
    {
      id: 'westRoom',
      sourceId: sourceId('ground.west_room.room'),
      name: 'West Room',
      bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 5 },
      ledColor: 0xffffff,
    },
    {
      id: 'eastRoom',
      sourceId: sourceId('ground.east_room.room'),
      name: 'East Room',
      bounds: { minX: 5, maxX: 10, minZ: 0, maxZ: 5 },
      ledColor: 0x58c4ff,
    },
  ],
  walls: [
    {
      id: 'dividingWall',
      sourceId: sourceId('ground.dividing_wall'),
      floorId: 'ground',
      wallKind: 'wall',
      rooms: ['westRoom', 'eastRoom'],
      run: {
        start: { x: 5, z: 0 },
        end: { x: 5, z: 5 },
        gaps: [{ start: 2, end: 3, purpose: 'Current passage opening.' }],
      },
    },
  ],
  floorSurfaces: [
    {
      id: 'westFloor',
      sourceId: sourceId('ground.west_room.floor_surface'),
      floorId: 'ground',
      roomId: 'westRoom',
      bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 5 },
    },
  ],
  roomConnections: [
    {
      id: 'semanticConnectionOnly',
      sourceId: sourceId('ground.west_to_east.connection'),
      floorId: 'ground',
      rooms: ['westRoom', 'eastRoom'],
      label: 'Semantic only',
    },
  ],
};

describe('compileLegacyFloorPlan', () => {
  it('compiles declarative rooms to the legacy floor-plan shape', () => {
    expect(compileLegacyFloorPlan(floor)).toEqual({
      outline: floor.outline,
      rooms: [
        {
          id: 'westRoom',
          name: 'West Room',
          bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 5 },
          ledColor: 0xffffff,
          doorways: [{ wall: 'east', start: 2, end: 3 }],
        },
        {
          id: 'eastRoom',
          name: 'East Room',
          bounds: { minX: 5, maxX: 10, minZ: 0, maxZ: 5 },
          ledColor: 0x58c4ff,
          doorways: [{ wall: 'west', start: 2, end: 3 }],
        },
      ],
    });
  });

  it('does not turn semantic room connections into doorways or geometry', () => {
    const withoutGaps: FloorDefinition = { ...floor, walls: [] };

    expect(compileLegacyFloorPlan(withoutGaps).rooms).toEqual([
      expect.not.objectContaining({ doorways: expect.anything() }),
      expect.not.objectContaining({ doorways: expect.anything() }),
    ]);
  });

  it('validates the surrounding level when provided', () => {
    const level: LevelDefinition = { id: 'level', floors: [floor] };

    expect(() => compileLegacyFloorPlan(floor, { level })).not.toThrow();
  });
});
