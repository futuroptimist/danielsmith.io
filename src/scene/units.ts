/** Runtime physical geometry uses metres, seconds and radians. Plan coordinates are separate. */
export const SCENE_UNITS_PER_METRE = 1;
export const TARGET_AVATAR_HEIGHT = 1.9 * SCENE_UNITS_PER_METRE;
export const TARGET_ROOM_CLEAR_HEIGHT = 2.74 * SCENE_UNITS_PER_METRE;

/** Measured bind-pose floor-to-head height of the approved GLB before normalization. */
export const AUTHORED_AVATAR_HEIGHT = 1.872;
export const AVATAR_BODY_SCALE = TARGET_AVATAR_HEIGHT / AUTHORED_AVATAR_HEIGHT;
/** Conservative navigation envelope already contains the normalized body; preserve tangent routes. */
export const AVATAR_COLLISION_RADIUS = 0.75;

/** Keep the existing conservative stair exclusion envelope until architecture is migrated. */
export const AVATAR_TRAVERSAL_HEIGHT = 2.6;
export const AVATAR_SEAT_HEIGHT = 0.4 * AVATAR_BODY_SCALE;
export const AVATAR_SEAT_RETREAT = 0.395 * AVATAR_BODY_SCALE;
export const AVATAR_FOOT_ORIGIN_HEIGHT = 0.12 * AVATAR_BODY_SCALE;
