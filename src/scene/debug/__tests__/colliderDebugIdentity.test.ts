import type { WallSegmentInstance } from '../../../assets/floorPlan/wallSegments';
import { makeLevelSourceId } from '../../level/sourceIds';
import { getWallSegmentColliderDebugName } from '../colliderDebugIdentity';

const wallInstance = (
  overrides: Partial<Pick<WallSegmentInstance, 'sourceId' | 'segmentId'>> = {}
): Pick<WallSegmentInstance, 'sourceId' | 'segmentId'> => ({
  sourceId: makeLevelSourceId(['ground', 'living_room', 'north_wall']),
  segmentId: 'horizontal|-10.000,20.000|10.000,20.000|livingRoom:north',
  ...overrides,
});

describe('getWallSegmentColliderDebugName', () => {
  it('derives ground wall collider names from source metadata', () => {
    expect(getWallSegmentColliderDebugName('ground', wallInstance())).toBe(
      'GroundWallCollider:ground.living_room.north_wall:' +
        'horizontal|-10.000,20.000|10.000,20.000|livingRoom:north'
    );
  });

  it('derives upper wall collider names from the same stable segment identity', () => {
    expect(
      getWallSegmentColliderDebugName(
        'upper',
        wallInstance({
          sourceId: makeLevelSourceId(['upper', 'focus_pods', 'north_wall']),
        })
      )
    ).toBe(
      'UpperWallCollider:upper.focus_pods.north_wall:' +
        'horizontal|-10.000,20.000|10.000,20.000|livingRoom:north'
    );
  });
});
