import { describe, expect, it } from 'vitest';

import {
  type FloorDefinition,
  validateFloorDefinition,
  validateLevelDefinition,
} from '../schema';
import { makeLevelSourceId } from '../sourceIds';

const sourceId = (...parts: string[]) => makeLevelSourceId(parts);

const createFloor = (
  overrides: Partial<FloorDefinition> = {}
): FloorDefinition => ({
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
      id: 'roomA',
      sourceId: sourceId('ground', 'room_a', 'room'),
      name: 'Room A',
      bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 10 },
      ledColor: 0xffffff,
    },
    {
      id: 'roomB',
      sourceId: sourceId('ground', 'room_b', 'room'),
      name: 'Room B',
      bounds: { minX: 5, maxX: 10, minZ: 0, maxZ: 10 },
      ledColor: 0xff00ff,
    },
  ],
  walls: [
    {
      id: 'sharedWall',
      sourceId: sourceId('ground', 'room_a_room_b', 'wall'),
      floorId: 'ground',
      wallKind: 'wall',
      geometry: {
        kind: 'run',
        start: { x: 5, z: 0 },
        end: { x: 5, z: 10 },
        gaps: [{ start: 4, end: 6, purpose: 'open passage' }],
      },
      rooms: [
        { id: 'roomA', wall: 'east' },
        { id: 'roomB', wall: 'west' },
      ],
    },
    {
      id: 'northWall',
      sourceId: sourceId('ground', 'room_a', 'north_wall'),
      floorId: 'ground',
      wallKind: 'wall',
      geometry: {
        kind: 'segment',
        start: { x: 0, z: 10 },
        end: { x: 5, z: 10 },
      },
      rooms: [{ id: 'roomA', wall: 'north' }],
    },
  ],
  floorSurfaces: [
    {
      id: 'roomAFloor',
      sourceId: sourceId('ground', 'room_a', 'floor_surface'),
      floorId: 'ground',
      bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 10 },
      roomId: 'roomA',
      purpose: 'walkable room floor',
    },
  ],
  safetyColliders: [
    {
      id: 'voidGuard',
      sourceId: sourceId('ground', 'stair_void', 'safety_collider'),
      floorId: 'ground',
      bounds: { minX: 1, maxX: 2, minZ: 1, maxZ: 2 },
      purpose: 'keeps players out of the stair void',
    },
  ],
  sceneObjects: [
    {
      id: 'thresholdTrim',
      sourceId: sourceId('ground', 'room_a_room_b', 'threshold_trim'),
      floorId: 'ground',
      kind: 'threshold',
      position: { x: 5, z: 5 },
      colliderPolicy: { kind: 'none' },
      roomId: 'roomA',
    },
  ],
  roomConnections: [
    {
      id: 'roomAToRoomB',
      sourceId: sourceId('ground', 'room_a_room_b', 'connection'),
      floorId: 'ground',
      rooms: ['roomA', 'roomB'],
      label: 'Open passage',
      purpose: 'semantic adjacency only',
    },
  ],
  ...overrides,
});

describe('declarative level schema validation', () => {
  it('validates a small declarative floor with rooms, walls, surfaces, objects, and connections', () => {
    const floor = createFloor();

    expect(() => validateFloorDefinition(floor)).not.toThrow();
    expect(() =>
      validateLevelDefinition({ id: 'testLevel', floors: [floor] })
    ).not.toThrow();
  });

  it('accepts intentional current-state wall gaps in wall runs', () => {
    const floor = createFloor({
      walls: [
        {
          id: 'southWallWithDoor',
          sourceId: sourceId('ground', 'room_a', 'south_wall'),
          floorId: 'ground',
          wallKind: 'wall',
          geometry: {
            kind: 'run',
            start: { x: 0, z: 0 },
            end: { x: 5, z: 0 },
            gaps: [{ start: 2, end: 3, purpose: 'doorway' }],
          },
          rooms: [{ id: 'roomA', wall: 'south' }],
        },
      ],
    });

    expect(() => validateFloorDefinition(floor)).not.toThrow();
  });

  it('rejects invalid source IDs and tombstone markers', () => {
    const invalidSourceFloor = createFloor({
      rooms: [
        {
          ...createFloor().rooms[0],
          sourceId: 'Ground.Room' as ReturnType<typeof sourceId>,
        },
      ],
    });

    expect(() => validateFloorDefinition(invalidSourceFloor)).toThrow(
      /Invalid level source ID/
    );

    const tombstoneFloor = createFloor({
      rooms: [
        {
          ...createFloor().rooms[0],
          sourceId: 'ground.former.room' as ReturnType<typeof sourceId>,
        },
      ],
    });

    expect(() => validateFloorDefinition(tombstoneFloor)).toThrow(
      /forbidden tombstone marker/
    );
  });

  it('rejects duplicate source IDs', () => {
    const floor = createFloor({
      floorSurfaces: [
        {
          id: 'duplicateSourceSurface',
          sourceId: sourceId('ground', 'room_a', 'room'),
          floorId: 'ground',
          bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 },
        },
      ],
    });

    expect(() => validateFloorDefinition(floor)).toThrow(/Duplicate source ID/);
  });

  it('rejects zero-length walls, zero-area surfaces, and missing room references', () => {
    expect(() =>
      validateFloorDefinition(
        createFloor({
          walls: [
            {
              id: 'zeroWall',
              sourceId: sourceId('ground', 'zero_wall'),
              floorId: 'ground',
              wallKind: 'wall',
              geometry: {
                kind: 'segment',
                start: { x: 1, z: 1 },
                end: { x: 1, z: 1 },
              },
            },
          ],
        })
      )
    ).toThrow(/positive length/);

    expect(() =>
      validateFloorDefinition(
        createFloor({
          floorSurfaces: [
            {
              id: 'zeroSurface',
              sourceId: sourceId('ground', 'zero_surface'),
              floorId: 'ground',
              bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 1 },
            },
          ],
        })
      )
    ).toThrow(/positive area/);

    expect(() =>
      validateFloorDefinition(
        createFloor({
          roomConnections: [
            {
              id: 'missingConnection',
              sourceId: sourceId('ground', 'missing_connection'),
              floorId: 'ground',
              rooms: ['roomA', 'missingRoom'],
            },
          ],
        })
      )
    ).toThrow(/missing room/);
  });
});
