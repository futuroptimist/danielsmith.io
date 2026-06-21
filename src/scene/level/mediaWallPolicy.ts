import type { SourceCollisionPolicy } from './sourceCollision';
import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type MediaWallComponentRole = 'futuroptimist-media-wall';
export type MediaWallRenderIntent = 'wall-mounted-visual-media-poi';

export interface MediaWallComponentPolicy {
  sourceId: LevelSourceId;
  subsystem: 'living-room-media-wall';
  role: MediaWallComponentRole;
  renderIntent: MediaWallRenderIntent;
  collision: SourceCollisionPolicy;
}

export const FUTUROPTIMIST_MEDIA_WALL_POLICY = {
  sourceId: assertLevelSourceId('ground.living_room.mediaWall.futuroptimist'),
  subsystem: 'living-room-media-wall',
  role: 'futuroptimist-media-wall',
  renderIntent: 'wall-mounted-visual-media-poi',
  collision: {
    collision: 'none',
    rationale:
      'Wall-mounted media component; intentionally no floor-level interaction footprint.',
  },
} as const satisfies MediaWallComponentPolicy;
