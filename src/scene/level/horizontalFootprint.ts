/** Room areas halve while vertical and metre-authored dimensions stay unchanged. */
export const HOUSE_HORIZONTAL_SCALE = Math.SQRT1_2;
export const PLAN_TO_WORLD_SCALE = 2 * HOUSE_HORIZONTAL_SCALE;

export function scaleLayoutPosition<T extends { x: number; z: number }>(
  point: T
): T {
  return {
    ...point,
    x: point.x * HOUSE_HORIZONTAL_SCALE,
    z: point.z * HOUSE_HORIZONTAL_SCALE,
  };
}

export function scaleLayoutBounds<
  T extends { minX: number; maxX: number; minZ: number; maxZ: number },
>(bounds: T): T {
  return {
    ...bounds,
    minX: bounds.minX * HOUSE_HORIZONTAL_SCALE,
    maxX: bounds.maxX * HOUSE_HORIZONTAL_SCALE,
    minZ: bounds.minZ * HOUSE_HORIZONTAL_SCALE,
    maxZ: bounds.maxZ * HOUSE_HORIZONTAL_SCALE,
  };
}
