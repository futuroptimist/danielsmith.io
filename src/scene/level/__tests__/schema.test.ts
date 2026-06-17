import { describe, expect, it } from 'vitest';

import { type LevelDefinition, validateLevelDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const sid = assertLevelSourceId;

const createLevel = (): LevelDefinition => ({
  id: 'testLevel',
  floors: [
    {
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
          id: 'livingRoom',
          sourceId: sid('ground.living_room.room'),
          name: 'Living Room',
          bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 10 },
          ledColor: 0xffffff,
        },
        {
          id: 'kitchen',
          sourceId: sid('ground.kitchen.room'),
          name: 'Kitchen',
          bounds: { minX: 5, maxX: 10, minZ: 0, maxZ: 10 },
          ledColor: 0xffaa00,
        },
      ],
      walls: [
        {
          id: 'sharedWall',
          sourceId: sid('ground.living_room.east_wall'),
          floorId: 'ground',
          wallKind: 'wall',
          run: {
            start: { x: 5, z: 0 },
            end: { x: 5, z: 10 },
            gaps: [{ start: 4, end: 6, purpose: 'open passage' }],
          },
          rooms: [
            { roomId: 'livingRoom', wall: 'east' },
            { roomId: 'kitchen', wall: 'west' },
          ],
        },
        {
          id: 'northFence',
          sourceId: sid('ground.kitchen.north_fence'),
          floorId: 'ground',
          wallKind: 'fence',
          segments: [{ start: { x: 5, z: 10 }, end: { x: 10, z: 10 } }],
          rooms: [{ roomId: 'kitchen', wall: 'north' }],
        },
      ],
      floorSurfaces: [
        {
          id: 'livingFloor',
          sourceId: sid('ground.living_room.floor_surface'),
          floorId: 'ground',
          bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 10 },
          roomId: 'livingRoom',
        },
      ],
      safetyColliders: [
        {
          id: 'voidGuard',
          sourceId: sid('ground.stair.void_guard.safety_collider'),
          floorId: 'ground',
          bounds: { minX: 1, maxX: 2, minZ: 1, maxZ: 2 },
          purpose: 'prevent falling into the stair void',
        },
      ],
      sceneObjects: [
        {
          id: 'thresholdTrim',
          sourceId: sid('ground.living_room.threshold.scene_object'),
          floorId: 'ground',
          kind: 'thresholdTrim',
          position: { x: 5, z: 5 },
          colliderPolicy: { kind: 'none' },
          roomId: 'livingRoom',
        },
      ],
      roomConnections: [
        {
          id: 'livingToKitchen',
          sourceId: sid('ground.living_room_to_kitchen.connection'),
          floorId: 'ground',
          rooms: ['livingRoom', 'kitchen'],
          label: 'Open passage',
        },
      ],
    },
  ],
});

describe('validateLevelDefinition', () => {
  it('accepts a small declarative floor with rooms, walls, surfaces, and connections', () => {
    expect(() => validateLevelDefinition(createLevel())).not.toThrow();
  });

  it('accepts intentional wall gaps on current-state wall runs', () => {
    const level = createLevel();
    const wall = level.floors[0]!.walls[0]!;

    expect('run' in wall ? wall.run.gaps : []).toEqual([
      { start: 4, end: 6, purpose: 'open passage' },
    ]);
    expect(() => validateLevelDefinition(level)).not.toThrow();
  });

  it('rejects invalid source IDs, duplicates, zero geometry, and missing references', () => {
    const duplicate = createLevel();
    duplicate.floors[0]!.floorSurfaces[0]!.sourceId =
      duplicate.floors[0]!.rooms[0]!.sourceId;
    expect(() => validateLevelDefinition(duplicate)).toThrow(
      /Duplicate source ID/
    );

    const zeroWall = createLevel();
    zeroWall.floors[0]!.walls[1]!.segments = [
      { start: { x: 1, z: 1 }, end: { x: 1, z: 1 } },
    ];
    expect(() => validateLevelDefinition(zeroWall)).toThrow(/zero-length/);

    const zeroSurface = createLevel();
    zeroSurface.floors[0]!.floorSurfaces[0]!.bounds.maxX = 0;
    expect(() => validateLevelDefinition(zeroSurface)).toThrow(/zero area/);

    const missingRoom = createLevel();
    missingRoom.floors[0]!.roomConnections![0]!.rooms = [
      'livingRoom',
      'missingRoom',
    ];
    expect(() => validateLevelDefinition(missingRoom)).toThrow(/missing room/);

    const tombstone = createLevel();
    tombstone.floors[0]!.walls[0]!.sourceId = sid('ground.former.wall');
    expect(() => validateLevelDefinition(tombstone)).toThrow(/tombstone/);
  });
});
