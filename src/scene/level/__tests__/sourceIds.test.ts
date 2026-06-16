import { describe, expect, it } from 'vitest';

import {
  assertLevelSourceId,
  getLevelSourceDebugRef,
  isLevelSourceId,
  joinLevelSourceId,
  makeLevelSourceId,
} from '../sourceIds';

const validSourceIds = [
  'ground.livingRoom.northWall.left',
  'upper.loftLibrary.southWall.right',
  'upper.stairwell.hiddenRun.safetyCollider',
  'ground.livingRoom.mediaWall.sceneObject',
  'backyard.greenhousePath.eastFence.section03',
];

const invalidSourceIds = [
  'ground.living room.northWall.left',
  'Ground.livingRoom.northWall.left',
  'ground..livingRoom.northWall.left',
  'ground/livingRoom/northWall/left',
  '.ground.livingRoom.northWall.left',
  'ground.livingRoom.northWall.left.',
];

describe('level source IDs', () => {
  it('accepts valid hierarchical IDs', () => {
    for (const sourceId of validSourceIds) {
      expect(isLevelSourceId(sourceId)).toBe(true);
      expect(assertLevelSourceId(sourceId)).toBe(sourceId);
    }
  });

  it('rejects malformed IDs', () => {
    for (const sourceId of invalidSourceIds) {
      expect(isLevelSourceId(sourceId)).toBe(false);
      expect(() => assertLevelSourceId(sourceId)).toThrow(
        /Invalid level source ID/
      );
    }
  });

  it('joins source ID parts without silently normalizing malformed input', () => {
    expect(joinLevelSourceId('ground', 'livingRoom', 'northWall', 'left')).toBe(
      'ground.livingRoom.northWall.left'
    );
    expect(
      makeLevelSourceId(['upper', 'stairwell', 'hiddenRun', 'safetyCollider'])
    ).toBe('upper.stairwell.hiddenRun.safetyCollider');
    expect(() => joinLevelSourceId('ground', 'livingRoom.northWall')).toThrow(
      /dots/
    );
  });

  it('returns deterministic uppercase hex debug references', () => {
    const sourceId = assertLevelSourceId(
      'ground.livingRoom.mediaWall.sceneObject'
    );
    const debugRef = getLevelSourceDebugRef(sourceId);

    expect(debugRef).toBe(getLevelSourceDebugRef(sourceId));
    expect(debugRef).toMatch(/^[0-9A-F]{6}$/);
    expect(getLevelSourceDebugRef(sourceId, 4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it('returns different debug references for representative source IDs', () => {
    const debugRefs = validSourceIds.map((sourceId) =>
      getLevelSourceDebugRef(assertLevelSourceId(sourceId))
    );

    expect(new Set(debugRefs).size).toBe(debugRefs.length);
  });

  it('does not expose tombstone-oriented helper names', async () => {
    const helperNames = Object.keys(await import('../sourceIds'));

    expect(helperNames.join(' ')).not.toMatch(/former|removed|skip/i);
  });
});
