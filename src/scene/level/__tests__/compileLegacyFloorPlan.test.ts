import { describe, expect, it } from 'vitest';

import { getCombinedWallSegments } from '../../../assets/floorPlan';
import { compileLegacyFloorPlan } from '../compileLegacyFloorPlan';
import type { FloorDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const sid = assertLevelSourceId;

const createFloor = (withConnection = true): FloorDefinition => ({
  id: 'ground',
  name: 'Ground Floor',
  outline: [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ],
  rooms: [
    {
      id: 'leftRoom',
      sourceId: sid('ground.left_room.room'),
      name: 'Left Room',
      bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 10 },
      ledColor: 0xffffff,
    },
    {
      id: 'rightRoom',
      sourceId: sid('ground.right_room.room'),
      name: 'Right Room',
      bounds: { minX: 5, maxX: 10, minZ: 0, maxZ: 10 },
      ledColor: 0x00ffff,
    },
  ],
  walls: [
    {
      id: 'sharedRun',
      sourceId: sid('ground.shared_wall.wall'),
      floorId: 'ground',
      wallKind: 'wall',
      run: {
        start: { x: 5, z: 0 },
        end: { x: 5, z: 10 },
        gaps: [{ start: 4, end: 6, purpose: 'current open passage' }],
      },
      rooms: [
        { roomId: 'leftRoom', wall: 'east' },
        { roomId: 'rightRoom', wall: 'west' },
      ],
    },
  ],
  floorSurfaces: [
    {
      id: 'leftFloor',
      sourceId: sid('ground.left_room.floor_surface'),
      floorId: 'ground',
      bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 10 },
      roomId: 'leftRoom',
    },
  ],
  roomConnections: withConnection
    ? [
        {
          id: 'semanticOnlyConnection',
          sourceId: sid('ground.left_to_right.connection'),
          floorId: 'ground',
          rooms: ['leftRoom', 'rightRoom'],
          purpose: 'semantic adjacency only',
        },
      ]
    : [],
});

describe('compileLegacyFloorPlan', () => {
  it('compiles declarative rooms and intentional wall-run gaps to legacy doorways', () => {
    const plan = compileLegacyFloorPlan(createFloor());

    expect(plan.rooms).toMatchObject([
      { id: 'leftRoom', doorways: [{ wall: 'east', start: 4, end: 6 }] },
      { id: 'rightRoom', doorways: [{ wall: 'west', start: 4, end: 6 }] },
    ]);
  });

  it('does not let roomConnections alone generate or remove geometry', () => {
    const withConnection = compileLegacyFloorPlan(createFloor(true));
    const withoutConnection = compileLegacyFloorPlan(createFloor(false));

    expect(getCombinedWallSegments(withConnection)).toEqual(
      getCombinedWallSegments(withoutConnection)
    );
  });
});
