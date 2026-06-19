import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type UpperStairwellLandingSegmentRole =
  | 'side-west'
  | 'side-east'
  | 'far'
  | 'shoulder-west'
  | 'shoulder-east';

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
    sourceId: sourceId('upper.stairwell.landingGuard.sideEast'),
  },
  {
    role: 'far',
    render: true,
    collision: false,
    sourceId: sourceId('upper.stairwell.landingGuard.far'),
  },
  {
    role: 'shoulder-east',
    render: true,
    collision: true,
    sourceId: sourceId('upper.stairwell.landingGuard.shoulderEast'),
    colliderName: 'UpperStairwellLandingGuard-3',
  },
] as const satisfies readonly UpperStairwellLandingSegmentPolicy[];
