import type { SourceCollisionPolicy } from './sourceCollision';
import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type MediaWallPolicyRole = 'living-room-futuroptimist-media';
export type MediaWallSubsystemRole = 'poi-media-wall';
export type MediaWallRenderIntent = 'visual-media-poi';

export interface MediaWallPolicy {
  role: MediaWallPolicyRole;
  subsystemRole: MediaWallSubsystemRole;
  renderIntent: MediaWallRenderIntent;
  render: true;
  sourceId: LevelSourceId;
  collision: SourceCollisionPolicy;
}

export const FUTUROPTIMIST_MEDIA_WALL_POLICY = {
  role: 'living-room-futuroptimist-media',
  subsystemRole: 'poi-media-wall',
  renderIntent: 'visual-media-poi',
  render: true,
  sourceId: assertLevelSourceId('ground.livingRoom.mediaWall.futuroptimist'),
  collision: {
    collision: 'none',
    rationale:
      'Wall-mounted media component intentionally has no floor-level interaction footprint.',
  },
} as const satisfies MediaWallPolicy;
