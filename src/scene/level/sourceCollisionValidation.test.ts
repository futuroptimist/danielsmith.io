import { describe, expect, it } from 'vitest';

import {
  validateSourceCollisionPolicy,
  validateSourceCollisionRecords,
  type SourceCollisionRecord,
} from './sourceCollisionValidation';
import { assertLevelSourceId } from './sourceIds';

const bounds = {
  minX: 0,
  maxX: 1,
  minZ: 0,
  maxZ: 1,
};

const createRecord = (
  overrides: Partial<SourceCollisionRecord<'guard'>> = {}
): SourceCollisionRecord<'guard'> => ({
  role: 'guard',
  sourceId: assertLevelSourceId('upper.stairwell.safetyCollider'),
  sourceType: 'safetyCollider',
  intent: 'safety-guard',
  purpose: 'Keep the player inside the playable stairwell path.',
  bounds,
  name: 'UpperStairwellSafetyGuard',
  ...overrides,
});

describe('source collision validation', () => {
  it.each(['former', 'removed', 'debugonlyremoval'])(
    'rejects %s source ID segments for policies and records',
    (term) => {
      const sourceId = assertLevelSourceId(`upper.stairwell.${term}.guard`);

      expect(
        validateSourceCollisionPolicy({
          role: 'guard',
          sourceId,
          collision: {
            collision: 'active',
            intent: 'safety-guard',
            purpose: 'Keep the player inside the playable stairwell path.',
            runtimeName: 'UpperStairwellSafetyGuard',
          },
        })
      ).toContain(
        `Policy guard sourceId "upper.stairwell.${term}.guard" uses forbidden tombstone wording.`
      );

      expect(
        validateSourceCollisionRecords([
          createRecord({
            sourceId,
          }),
        ])
      ).toContain(
        `upper.stairwell.${term}.guard (guard) sourceId "upper.stairwell.${term}.guard" uses forbidden tombstone wording.`
      );
    }
  );

  it('rejects source types outside the known level source type set', () => {
    expect(
      validateSourceCollisionRecords([
        createRecord({
          sourceType: 'safetyColliders',
        } as Partial<SourceCollisionRecord<'guard'>>),
      ])
    ).toContain(
      'upper.stairwell.safetyCollider (guard) has invalid sourceType "safetyColliders".'
    );
  });
});
