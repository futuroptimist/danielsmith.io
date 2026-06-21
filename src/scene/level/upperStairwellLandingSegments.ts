import { assertDebugColliderId } from '../debug/colliderDebugIds';

import type { SourceCollisionPolicy } from './sourceBackedColliders';
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
  sourceId: LevelSourceId;
  collision: SourceCollisionPolicy;
}

const sourceId = (value: string): LevelSourceId => assertLevelSourceId(value);

export const UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES = [
  {
    role: 'side-east',
    render: true,
    sourceId: sourceId('upper.stairwell.landingGuard.sideEast'),
    collision: {
      collision: 'none',
      rationale: 'visual rail only; stair safety colliders own this edge',
    },
  },
  {
    role: 'far',
    render: true,
    sourceId: sourceId('upper.stairwell.landingGuard.far'),
    collision: {
      collision: 'none',
      rationale: 'visual rail only; upper void guards own player blocking',
    },
  },
  {
    role: 'shoulder-east',
    render: true,
    sourceId: sourceId('upper.stairwell.landingGuard.shoulderEast'),
    collision: {
      collision: 'active',
      intent: 'safety-guard',
      purpose: 'upper stairwell landing shoulder-east guard',
      runtimeName: 'UpperStairwellLandingGuard-3',
      debugId: assertDebugColliderId('400D'),
    },
  },
] as const satisfies readonly UpperStairwellLandingSegmentPolicy[];
