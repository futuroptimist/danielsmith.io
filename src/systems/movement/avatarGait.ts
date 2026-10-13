import { AVATAR_BODY_SCALE } from '../../scene/units';

/** Metres per second, scaled by the same measured ratio as the body and stride. */
export const AVATAR_WALK_SPEED = 1.1 * AVATAR_BODY_SCALE;
export const AVATAR_RUN_SPEED = 4.2 * AVATAR_BODY_SCALE;

/** Fixed audio calibration: movement tuning must not alter walking footsteps. */
export const AVATAR_FOOTSTEP_REFERENCE_SPEED = 3.0 * AVATAR_BODY_SCALE;
