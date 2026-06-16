import { describe, expect, it } from 'vitest';

import { DEBUG_ID_MAX_LENGTH } from '../../debug/debugIds';
import {
  assertLevelSourceId,
  getLevelSourceDebugRef,
  isLevelSourceId,
  joinLevelSourceId,
  makeLevelSourceId,
} from '../sourceIds';

const validIds = [
  'ground.living_room.north_wall.left',
  'upper.loft_library.south_wall.right',
  'upper.stairwell.hidden_run.safety_collider',
  'ground.living_room.media_wall.scene_object',
  'backyard.greenhouse_path.east_fence.section03',
  'ground.room_01.wall-02.generated_collider',
];

const invalidIds = [
  'ground living_room.north_wall',
  'Ground.living_room.north_wall',
  'ground..livingRoom',
  'ground/living_room/north_wall',
  '.ground.living_room',
  'ground.living_room.',
  '',
];

describe('level source ID validation', () => {
  it('accepts valid human-readable hierarchical IDs', () => {
    for (const sourceId of validIds) {
      expect(isLevelSourceId(sourceId)).toBe(true);
      expect(assertLevelSourceId(sourceId)).toBe(sourceId);
    }
  });

  it('rejects malformed source IDs', () => {
    for (const sourceId of invalidIds) {
      expect(isLevelSourceId(sourceId)).toBe(false);
      expect(() => assertLevelSourceId(sourceId)).toThrow(
        /Invalid level source ID/
      );
    }
  });
});

describe('level source ID composition', () => {
  it('joins source ID parts with dots', () => {
    expect(
      joinLevelSourceId('ground', 'living_room', 'north_wall', 'left')
    ).toBe('ground.living_room.north_wall.left');
  });

  it('builds source IDs from readonly part arrays', () => {
    expect(
      makeLevelSourceId(['upper', 'loft_library', 'south_wall', 'right'])
    ).toBe('upper.loft_library.south_wall.right');
  });

  it('fails instead of silently normalizing malformed parts', () => {
    expect(() => joinLevelSourceId('ground', '', 'northWall')).toThrow(/empty/);
    expect(() => joinLevelSourceId('ground.living_room', 'north_wall')).toThrow(
      /dots/
    );
    expect(() => joinLevelSourceId('ground', 'LivingRoom')).toThrow(
      /Invalid level source ID/
    );
  });
});

describe('level source debug references', () => {
  it('returns deterministic uppercase hexadecimal references', () => {
    const sourceId = assertLevelSourceId('ground.living_room.north_wall.left');

    expect(getLevelSourceDebugRef(sourceId)).toBe(
      getLevelSourceDebugRef(sourceId)
    );
    expect(getLevelSourceDebugRef(sourceId)).toMatch(
      new RegExp(`^[0-9A-F]{${DEBUG_ID_MAX_LENGTH}}$`)
    );
    expect(getLevelSourceDebugRef(sourceId, 4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it('rejects unsupported debug reference lengths', () => {
    const sourceId = assertLevelSourceId('ground.living_room.north_wall.left');

    const lengthError = new RegExp(
      `integer length from 1 to ${DEBUG_ID_MAX_LENGTH}`
    );

    expect(() => getLevelSourceDebugRef(sourceId, 0)).toThrow(lengthError);
    expect(() =>
      getLevelSourceDebugRef(sourceId, DEBUG_ID_MAX_LENGTH + 1)
    ).toThrow(lengthError);
    expect(() => getLevelSourceDebugRef(sourceId, 1.5)).toThrow(lengthError);
  });

  it('produces different refs for representative different source IDs', () => {
    const refs = validIds.map((sourceId) =>
      getLevelSourceDebugRef(assertLevelSourceId(sourceId))
    );

    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('level source helper names', () => {
  it('avoid tombstone-oriented helper names', async () => {
    const helperNames = Object.keys(await import('../sourceIds'));

    expect(helperNames.join(' ')).not.toMatch(/former|removed|tombstone/i);
  });
});
