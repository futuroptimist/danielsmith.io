import { describe, expect, it } from 'vitest';

import {
  assertValidLevelDefinition,
  validateLevelDefinition,
  type LevelDefinition,
} from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

const createLevel = (): LevelDefinition => ({
  id: 'test-level',
  floors: [
    {
      id: 'ground',
      name: 'Ground',
      outline: [
        [0, 0],
        [10, 0],
        [10, 6],
        [0, 6],
      ],
      rooms: [
        {
          id: 'gallery',
          sourceId: sourceId('ground.gallery.room'),
          name: 'Gallery',
          bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 6 },
          ledColor: 0xffffff,
        },
        {
          id: 'studio',
          sourceId: sourceId('ground.studio.room'),
          name: 'Studio',
          bounds: { minX: 5, maxX: 10, minZ: 0, maxZ: 6 },
          ledColor: 0x58c4ff,
        },
      ],
      walls: [
        {
          id: 'gallery-south-wall',
          sourceId: sourceId('ground.gallery.south_wall'),
          floorId: 'ground',
          wallKind: 'wall',
          segments: [{ start: { x: 0, z: 0 }, end: { x: 5, z: 0 } }],
          rooms: ['gallery'],
          purpose: 'room-boundary',
        },
        {
          id: 'studio-west-wall',
          sourceId: sourceId('ground.studio.west_wall'),
          floorId: 'ground',
          wallKind: 'wall',
          run: {
            start: { x: 5, z: 0 },
            end: { x: 5, z: 6 },
            gaps: [{ start: 2, end: 4, label: 'open passage' }],
          },
          rooms: ['gallery', 'studio'],
        },
      ],
      floorSurfaces: [
        {
          id: 'gallery-floor',
          sourceId: sourceId('ground.gallery.floor_surface'),
          floorId: 'ground',
          bounds: { minX: 0, maxX: 5, minZ: 0, maxZ: 6 },
          roomId: 'gallery',
          purpose: 'walkable floor',
        },
      ],
      safetyColliders: [
        {
          id: 'stair-guard',
          sourceId: sourceId('ground.stair_guard.safety_collider'),
          floorId: 'ground',
          bounds: { minX: 4, maxX: 6, minZ: 5, maxZ: 6 },
          purpose: 'Prevent falls near test void.',
        },
      ],
      sceneObjects: [
        {
          id: 'threshold',
          sourceId: sourceId('ground.gallery_threshold.scene_object'),
          floorId: 'ground',
          kind: 'threshold',
          position: { x: 5, z: 3 },
          colliderPolicy: { kind: 'none', reason: 'walkable trim' },
          roomId: 'gallery',
        },
      ],
      roomConnections: [
        {
          id: 'gallery-to-studio',
          sourceId: sourceId('ground.gallery_to_studio.connection'),
          floorId: 'ground',
          rooms: ['gallery', 'studio'],
          label: 'Gallery to Studio',
          purpose: 'semantic adjacency only',
        },
      ],
    },
  ],
});

describe('declarative level schema validation', () => {
  it('validates a small declarative floor with rooms, walls, surfaces, colliders, objects, and connections', () => {
    expect(() => assertValidLevelDefinition(createLevel())).not.toThrow();
  });

  it('allows intentional current-state wall gaps without former wall records', () => {
    const result = validateLevelDefinition(createLevel());

    expect(result.errors).toEqual([]);
    expect(createLevel().floors[0].walls[1]).toMatchObject({
      run: { gaps: [{ start: 2, end: 4 }] },
    });
  });

  it('rejects invalid source IDs, duplicates, zero geometry, and missing room references', () => {
    const level = createLevel();
    level.floors[0].rooms[0].sourceId = 'Ground.Bad Room' as never;
    level.floors[0].walls[1].sourceId = sourceId('ground.gallery.south_wall');
    level.floors[0].walls[0].segments[0].end = { x: 0, z: 0 };
    level.floors[0].floorSurfaces[0].bounds.maxX = 0;
    level.floors[0].safetyColliders![0].purpose = '';
    level.floors[0].roomConnections![0].rooms = ['gallery', 'missing'];

    expect(validateLevelDefinition(level).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('invalid sourceId'),
        expect.stringContaining('Duplicate sourceId'),
        expect.stringContaining('positive length'),
        expect.stringContaining('positive area'),
        expect.stringContaining('requires a purpose'),
        expect.stringContaining('references missing room "missing"'),
      ])
    );
  });

  it('rejects source IDs that look like tombstone/debug-only removal records', () => {
    const level = createLevel();
    level.floors[0].walls[0].sourceId = sourceId('ground.gallery.removed');

    expect(validateLevelDefinition(level).errors).toContain(
      'wall "gallery-south-wall" sourceId "ground.gallery.removed" uses forbidden tombstone wording.'
    );
  });

  it('rejects malformed floor outlines and non-finite room bounds', () => {
    const level = createLevel();
    level.floors[0].outline = [
      [0, 0],
      [Number.NaN, 0],
      [0, 0],
    ];
    level.floors[0].rooms[0].bounds.maxX = Number.NaN;

    expect(validateLevelDefinition(level).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('point 1 must use finite coordinates'),
        expect.stringContaining('must not contain repeated points'),
        expect.stringContaining('bounds must use finite coordinates'),
      ])
    );
  });

  it('reports malformed wall geometry instead of throwing', () => {
    const level = createLevel();
    level.floors[0].walls[0] = {
      ...level.floors[0].walls[0],
      segments: undefined,
    } as never;

    expect(validateLevelDefinition(level).errors).toContain(
      'wall "gallery-south-wall" requires either segments or a run.'
    );
  });

  it('rejects wall gaps that cannot compile into bounded legacy doorways', () => {
    const level = createLevel();
    level.floors[0].walls[1].run = {
      start: { x: 5, z: 0 },
      end: { x: 9, z: 4 },
      gaps: [
        { start: Number.NaN, end: 2 },
        { start: -1, end: 1 },
        { start: 2, end: 2.5 },
      ],
    };

    expect(validateLevelDefinition(level).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('gaps require an axis-aligned run'),
      ])
    );

    level.floors[0].walls[1].run = {
      start: { x: 5, z: 0 },
      end: { x: 5, z: 6 },
      gaps: [
        { start: Number.NaN, end: 2 },
        { start: -1, end: 1 },
        { start: 2, end: 2.5 },
      ],
    };

    expect(validateLevelDefinition(level).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('gap 0 must use finite coordinates'),
        expect.stringContaining('gap 1 must stay within the run'),
        expect.stringContaining('gap 2 must be at least 1.2 units wide'),
      ])
    );
  });
});
