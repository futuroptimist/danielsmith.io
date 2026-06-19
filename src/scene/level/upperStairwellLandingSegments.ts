import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type UpperStairwellLandingSegmentRole =
  | 'side-east'
  | 'side-west'
  | 'far'
  | 'shoulder-east'
  | 'shoulder-west';

export interface UpperStairwellLandingSegmentPolicy {
  role: UpperStairwellLandingSegmentRole;
  render: boolean;
  collision: boolean;
  sourceId: LevelSourceId;
  colliderName?: string;
}

const sourceId = (value: string): LevelSourceId => assertLevelSourceId(value);

export const UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES = [
  {
    role: 'side-east',
    render: true,
    collision: false,
    sourceId: sourceId('upper.stairwell.landing.sideEast.generatedCollider'),
  },
  {
    role: 'far',
    render: true,
    collision: false,
    sourceId: sourceId('upper.stairwell.landing.far.generatedCollider'),
  },
  {
    role: 'shoulder-east',
    render: true,
    collision: true,
    sourceId: sourceId(
      'upper.stairwell.landing.shoulderEast.generatedCollider'
    ),
    colliderName: 'UpperStairwellLandingGuard-3',
  },
] as const satisfies readonly UpperStairwellLandingSegmentPolicy[];
