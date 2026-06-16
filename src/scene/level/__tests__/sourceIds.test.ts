import { describe, expect, it } from 'vitest';

import * as sourceIds from '../sourceIds';
import {
  assertLevelSourceId,
  getLevelSourceDebugRef,
  isLevelSourceId,
  joinLevelSourceId,
  makeLevelSourceId,
  type LevelSourceMetadata,
} from '../sourceIds';

describe('level source IDs', () => {
  it('accepts semantic hierarchical IDs', () => {
    const validIds = [
      'ground.livingRoom.northWall.left',
      'upper.loftLibrary.southWall.right',
      'upper.stairwell.hiddenRun.safetyCollider',
      'ground.livingRoom.mediaWall.sceneObject',
      'backyard.greenhousePath.eastFence.section03',
      'ground.living_room.media-wall.scene_object',
    ];

    for (const id of validIds) {
      expect(isLevelSourceId(id)).toBe(true);
      expect(assertLevelSourceId(id)).toBe(id);
    }
  });

  it('rejects malformed IDs with helpful errors', () => {
    const invalidIds = [
      'ground livingRoom.northWall',
      'Ground.livingRoom.northWall',
      'ground..livingRoom',
      'ground/livingRoom/northWall',
      '.ground.livingRoom',
      'ground.livingRoom.',
      '',
    ];

    for (const id of invalidIds) {
      expect(isLevelSourceId(id)).toBe(false);
      expect(() => assertLevelSourceId(id)).toThrow(/Invalid level source ID/);
    }
  });

  it('composes source IDs from explicit parts without silent normalization', () => {
    expect(joinLevelSourceId('ground', 'livingRoom', 'northWall', 'left')).toBe(
      'ground.livingRoom.northWall.left'
    );
    expect(
      makeLevelSourceId(['upper', 'stairwell', 'hiddenRun', 'safetyCollider'])
    ).toBe('upper.stairwell.hiddenRun.safetyCollider');
    expect(() => joinLevelSourceId('ground', 'living room')).toThrow(
      /Invalid level source ID/
    );
  });

  it('creates deterministic uppercase hex debug references', () => {
    const sourceId = assertLevelSourceId('ground.livingRoom.northWall.left');

    expect(getLevelSourceDebugRef(sourceId)).toBe(
      getLevelSourceDebugRef(sourceId)
    );
    expect(getLevelSourceDebugRef(sourceId)).toMatch(/^[0-9A-F]{6}$/);
    expect(getLevelSourceDebugRef(sourceId, 8)).toMatch(/^[0-9A-F]{8}$/);
    expect(() => getLevelSourceDebugRef(sourceId, 0)).toThrow(
      /debug ref length/i
    );
  });

  it('distinguishes representative source IDs with short debug refs', () => {
    const ids = [
      'ground.livingRoom.northWall.left',
      'ground.livingRoom.northWall.right',
      'upper.loftLibrary.southWall.right',
      'upper.stairwell.hiddenRun.safetyCollider',
      'ground.livingRoom.mediaWall.sceneObject',
    ].map(assertLevelSourceId);

    const refs = ids.map((id) => getLevelSourceDebugRef(id));

    expect(new Set(refs).size).toBe(refs.length);
  });

  it('exports current-source helpers instead of tombstone-oriented helpers', () => {
    const forbiddenNamePattern = /(former|removed|skip)/i;

    expect(
      Object.keys(sourceIds).filter((name) => forbiddenNamePattern.test(name))
    ).toEqual([]);
  });

  it('types source metadata around current source ownership', () => {
    const metadata: LevelSourceMetadata = {
      sourceId: assertLevelSourceId('ground.livingRoom.mediaWall.sceneObject'),
      sourceType: 'sceneObject',
      purpose: 'Blocks avatar movement through the media wall footprint.',
    };

    expect(metadata.sourceType).toBe('sceneObject');
  });
});
