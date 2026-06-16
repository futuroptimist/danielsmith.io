import { describe, expect, it } from 'vitest';

import {
  assertLevelSourceId,
  getLevelSourceDebugRef,
  isLevelSourceId,
  joinLevelSourceId,
  makeLevelSourceId,
} from '../sourceIds';

const validSourceIds = [
  'ground.living-room.north-wall.left',
  'upper.loft-library.south-wall.right',
  'upper.stairwell.hidden-run.safety-collider',
  'ground.living_room.media_wall.scene_object',
  'backyard.greenhouse-path.east-fence.section03',
];

const invalidSourceIds = [
  'ground.living room.north-wall',
  'ground.livingRoom.northWall',
  'ground..living-room',
  'ground/living-room/north-wall',
  '.ground.living-room',
  'ground.living-room.',
];

describe('level source IDs', () => {
  it('accepts valid human-readable hierarchy paths', () => {
    for (const sourceId of validSourceIds) {
      expect(isLevelSourceId(sourceId)).toBe(true);
      expect(assertLevelSourceId(sourceId)).toBe(sourceId);
    }
  });

  it('rejects malformed source IDs with helpful errors', () => {
    for (const sourceId of invalidSourceIds) {
      expect(isLevelSourceId(sourceId)).toBe(false);
      expect(() => assertLevelSourceId(sourceId)).toThrow(
        /Invalid level source ID/
      );
    }
  });

  it('joins source ID parts without silently normalizing them', () => {
    expect(
      joinLevelSourceId('ground', 'living-room', 'north-wall', 'left')
    ).toBe('ground.living-room.north-wall.left');
    expect(makeLevelSourceId(['upper', 'stairwell', 'safety-collider'])).toBe(
      'upper.stairwell.safety-collider'
    );
    expect(() => joinLevelSourceId('ground', 'LivingRoom')).toThrow(
      /Invalid level source ID/
    );
    expect(() => makeLevelSourceId([])).toThrow(
      /at least one hierarchy segment/
    );
  });

  it('creates deterministic uppercase hex debug references', () => {
    const sourceId = assertLevelSourceId(
      'ground.living-room.media-wall.scene-object'
    );

    expect(getLevelSourceDebugRef(sourceId)).toBe(
      getLevelSourceDebugRef(sourceId)
    );
    expect(getLevelSourceDebugRef(sourceId)).toMatch(/^[0-9A-F]{6}$/);
    expect(getLevelSourceDebugRef(sourceId, 4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it('produces distinct debug references for representative source IDs', () => {
    const sourceIds = validSourceIds.map(assertLevelSourceId);
    const refs = sourceIds.map((sourceId) => getLevelSourceDebugRef(sourceId));

    expect(new Set(refs).size).toBe(refs.length);
  });

  it('keeps helper names focused on current source concepts', () => {
    const helperNames = [
      'isLevelSourceId',
      'assertLevelSourceId',
      'joinLevelSourceId',
      'makeLevelSourceId',
      'getLevelSourceDebugRef',
    ];

    expect(helperNames.join(' ')).not.toMatch(/former|removed|skip/i);
  });
});
