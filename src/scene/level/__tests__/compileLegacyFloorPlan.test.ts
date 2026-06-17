import { describe, expect, it } from 'vitest';

import { compileLegacyFloorPlan } from '../compileLegacyFloorPlan';
import type { FloorDefinition } from '../schema';
import { makeLevelSourceId } from '../sourceIds';

const sourceId = (...parts: string[]) => makeLevelSourceId(parts);

const createFloor = (includeConnection = true): FloorDefinition => ({
  id: 'ground',
  name: 'Ground Floor',
  outline: [
    [0, 0],
    [8, 0],
    [8, 4],
    [0, 4],
  ],
  rooms: [
    {
      id: 'leftRoom',
      sourceId: sourceId('ground', 'left_room', 'room'),
      name: 'Left Room',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
      ledColor: 0x111111,
    },
    {
      id: 'rightRoom',
      sourceId: sourceId('ground', 'right_room', 'room'),
      name: 'Right Room',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
      ledColor: 0x222222,
    },
  ],
  walls: [
    {
      id: 'sharedWall',
      sourceId: sourceId('ground', 'left_right', 'wall'),
      floorId: 'ground',
      wallKind: 'wall',
      geometry: {
        kind: 'run',
        start: { x: 4, z: 0 },
        end: { x: 4, z: 4 },
        gaps: [{ start: 1.25, end: 2.75, purpose: 'current open doorway' }],
      },
      rooms: [
        { id: 'leftRoom', wall: 'east' },
        { id: 'rightRoom', wall: 'west' },
      ],
    },
    {
      id: 'northLeft',
      sourceId: sourceId('ground', 'left_room', 'north_wall'),
      floorId: 'ground',
      wallKind: 'wall',
      geometry: { kind: 'segment', start: { x: 0, z: 4 }, end: { x: 4, z: 4 } },
      rooms: [{ id: 'leftRoom', wall: 'north' }],
    },
  ],
  floorSurfaces: [
    {
      id: 'leftFloor',
      sourceId: sourceId('ground', 'left_room', 'floor_surface'),
      floorId: 'ground',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
      roomId: 'leftRoom',
    },
    {
      id: 'rightFloor',
      sourceId: sourceId('ground', 'right_room', 'floor_surface'),
      floorId: 'ground',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
      roomId: 'rightRoom',
    },
  ],
  roomConnections: includeConnection
    ? [
        {
          id: 'leftToRight',
          sourceId: sourceId('ground', 'left_right', 'connection'),
          floorId: 'ground',
          rooms: ['leftRoom', 'rightRoom'],
          label: 'Semantic adjacency',
        },
      ]
    : undefined,
});

describe('compileLegacyFloorPlan', () => {
  it('compiles declarative rooms and wall-run gaps into the legacy FloorPlanDefinition shape', () => {
    const plan = compileLegacyFloorPlan(createFloor());

    expect(plan.outline).toEqual([
      [0, 0],
      [8, 0],
      [8, 4],
      [0, 4],
    ]);
    expect(plan.rooms).toEqual([
      {
        id: 'leftRoom',
        name: 'Left Room',
        bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
        ledColor: 0x111111,
        category: undefined,
        doorways: [{ wall: 'east', start: 1.25, end: 2.75 }],
      },
      {
        id: 'rightRoom',
        name: 'Right Room',
        bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
        ledColor: 0x222222,
        category: undefined,
        doorways: [{ wall: 'west', start: 1.25, end: 2.75 }],
      },
    ]);
  });

  it('proves roomConnections alone do not generate or remove legacy geometry', () => {
    const withConnection = compileLegacyFloorPlan(createFloor(true));
    const withoutConnection = compileLegacyFloorPlan(createFloor(false));

    expect(withConnection).toEqual(withoutConnection);
  });
});
