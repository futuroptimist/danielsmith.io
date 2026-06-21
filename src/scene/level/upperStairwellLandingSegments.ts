import {
  assertDebugColliderId,
  type DebugColliderId,
} from '../debug/colliderDebugIds';

import type { SourceCollisionPolicy } from './sourceCollision';
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
  collision: SourceCollisionPolicy & { debugId?: DebugColliderId };
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
      kind: 'none',
      rationale: 'visual rail outside the active east-shoulder collision strip',
    },
  },
  {
    role: 'far',
    render: true,
    sourceId: sourceId('upper.stairwell.landingGuard.far'),
    collision: {
      kind: 'none',
      rationale: 'visual rail leaves the descent approach open',
    },
  },
  {
    role: 'shoulder-east',
    render: true,
    sourceId: sourceId('upper.stairwell.landingGuard.shoulderEast'),
    collision: {
      kind: 'active',
      intent: 'safety-guard',
      purpose: 'upper stairwell landing shoulder-east guard',
      name: 'UpperStairwellLandingGuard-3',
      debugId: debugId('400D'),
    },
  },
] as const satisfies readonly UpperStairwellLandingSegmentPolicy[];
