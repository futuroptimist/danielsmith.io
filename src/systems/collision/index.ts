import { MathUtils } from 'three';

export interface RectCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function collidesWithColliders(
  x: number,
  z: number,
  radius: number,
  colliders: readonly RectCollider[]
): boolean {
  for (const collider of colliders) {
    const closestX = MathUtils.clamp(x, collider.minX, collider.maxX);
    const closestZ = MathUtils.clamp(z, collider.minZ, collider.maxZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    if (dx * dx + dz * dz < radius * radius) {
      return true;
    }
  }

  return false;
}
