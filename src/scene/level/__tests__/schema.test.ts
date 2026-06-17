import { describe, expect, it } from 'vitest';

import { assertValidLevelDefinition, type LevelDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

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
          id: 'gallery',
          sourceId: sourceId('ground.gallery.room'),
          name: 'Gallery',
          bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 10 },
          ledColor: 0xffffff,
        },
        {
          id: 'studio',
          sourceId: sourceId('ground.studio.room'),
          name: 'Studio',
          bounds: { minX: 5, maxX: 10, minZ: 0, maxZ: 10 },
          ledColor: 0x58c4ff,
        },
      ],
      walls: [
        {
          id: 'galleryNorthWall',
          sourceId: sourceId('ground.gallery.north_wall'),
          floorId: 'ground',
          wallKind: 'wall',
          rooms: ['gallery'],
          segments: [{ start: { x: 0, z: 10 }, end: { x: 5, z: 10 } }],
        },
        {
          id: 'centerWall',
          sourceId: sourceId('ground.gallery.center_wall'),
          floorId: 'ground',
          wallKind: 'wall',
          rooms: ['gallery', 'studio'],
          run: {
            start: { x: 5, z: 0 },
            end: { x: 5, z: 10 },
            gaps: [{ start: 4, end: 6, purpose: 'Current open passage.' }],
          },
        },
      ],
      floorSurfaces: [
        {
          id: 'galleryFloor',
          sourceId: sourceId('ground.gallery.floor_surface'),
          floorId: 'ground',
          roomId: 'gallery',
          bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 10 },
          purpose: 'Walkable gallery floor.',
        },
      ],
      safetyColliders: [
        {
          id: 'guardRailSafety',
          sourceId: sourceId('ground.gallery.guard_rail.safety_collider'),
          floorId: 'ground',
          bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 10 },
          purpose: 'Keep traversal inside the playable gallery edge.',
        },
      ],
      sceneObjects: [
        {
          id: 'thresholdTrim',
          sourceId: sourceId('ground.gallery.threshold_trim.scene_object'),
          floorId: 'ground',
          kind: 'thresholdTrim',
          position: { x: 5, z: 5 },
          colliderPolicy: { kind: 'none' },
          roomId: 'gallery',
        },
      ],
      roomConnections: [
        {
          id: 'galleryToStudio',
          sourceId: sourceId('ground.gallery_to_studio.connection'),
          floorId: 'ground',
          rooms: ['gallery', 'studio'],
          label: 'Gallery to Studio',
          purpose: 'Semantic adjacency only.',
        },
      ],
    },
  ],
});

describe('declarative level schema validation', () => {
  it('accepts rooms, walls, floor surfaces, safety colliders, objects, and connections', () => {
    expect(() => assertValidLevelDefinition(createLevel())).not.toThrow();
  });

  it('accepts intentional current-state wall-run gaps as authoring convenience', () => {
    const level = createLevel();
    const wall = level.floors[0]!.walls.find(
      (entry) => entry.id === 'centerWall'
    );

    expect(wall).toMatchObject({
      run: { gaps: [{ start: 4, end: 6, purpose: 'Current open passage.' }] },
    });
    expect(() => assertValidLevelDefinition(level)).not.toThrow();
  });

  it('rejects invalid source IDs and tombstone markers', () => {
    const level = createLevel();
    level.floors[0]!.rooms[0]!.sourceId = 'ground.gallery.former.room' as never;

    expect(() => assertValidLevelDefinition(level)).toThrow(/former/);
  });

  it('rejects duplicate source IDs', () => {
    const level = createLevel();
    level.floors[0]!.rooms[1]!.sourceId = level.floors[0]!.rooms[0]!.sourceId;

    expect(() => assertValidLevelDefinition(level)).toThrow(
      /Duplicate level source ID/
    );
  });

  it('rejects zero-length walls and zero-area floor surfaces', () => {
    const level = createLevel();
    level.floors[0]!.walls[0] = {
      id: 'badWall',
      sourceId: sourceId('ground.gallery.bad_wall'),
      floorId: 'ground',
      wallKind: 'wall',
      segments: [{ start: { x: 1, z: 1 }, end: { x: 1, z: 1 } }],
    };
    level.floors[0]!.floorSurfaces[0]!.bounds = {
      minX: 0,
      maxX: 0,
      minZ: 0,
      maxZ: 1,
    };

    expect(() => assertValidLevelDefinition(level)).toThrow(/positive length/);
    expect(() => assertValidLevelDefinition(level)).toThrow(
      /positive bounds area/
    );
  });

  it('rejects safety colliders without area or purpose', () => {
    const level = createLevel();
    level.floors[0]!.safetyColliders![0]!.bounds = {
      minX: 0,
      maxX: 1,
      minZ: 0,
      maxZ: 0,
    };
    level.floors[0]!.safetyColliders![0]!.purpose = ' ';

    expect(() => assertValidLevelDefinition(level)).toThrow(/Safety collider/);
  });

  it('rejects room connections that reference missing rooms', () => {
    const level = createLevel();
    level.floors[0]!.roomConnections![0]!.rooms = ['gallery', 'missingRoom'];

    expect(() => assertValidLevelDefinition(level)).toThrow(/missingRoom/);
  });
});
