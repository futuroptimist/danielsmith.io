import {
  assertDebugColliderId,
  type DebugColliderId,
} from '../debug/colliderDebugIds';

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
const debugId = (value: string): DebugColliderId =>
  assertDebugColliderId(value);

export const UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES = [
  {
    role: 'side-east',
    render: true,
    sourceId: sourceId('upper.stairwell.landingGuard.sideEast'),
    collision: {
      collision: 'none',
      rationale:
        'visual guard; adjacent side is already blocked by the stairwell void guard',
    },
  },
  {
    role: 'far',
    render: true,
    sourceId: sourceId('upper.stairwell.landingGuard.far'),
    collision: {
      collision: 'none',
      rationale: 'visual guard; the far landing edge remains walkable floor',
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
      debugId: debugId('400D'),
    },
  },
] as const satisfies readonly UpperStairwellLandingSegmentPolicy[];
