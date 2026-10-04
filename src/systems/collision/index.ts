import { MathUtils } from 'three';

export interface RectCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  debugName?: string;
  /** Optional world-space solid extent; absent bounds remain floor-wide barriers. */
  minY?: number;
  maxY?: number;
  /** The staircase surface is traversable only by its admitted connection. */
  traversableConnectionId?: string;
}

export interface CollisionActor {
  feetY: number;
  height: number;
  activeConnectionId: string | null;
}

export function collidesWithColliders(
  x: number,
  z: number,
  radius: number,
  colliders: readonly RectCollider[],
  actor?: CollisionActor
): boolean {
  for (const collider of colliders) {
    if (
      actor &&
      ((collider.traversableConnectionId !== undefined &&
        collider.traversableConnectionId === actor.activeConnectionId) ||
        (collider.minY !== undefined &&
          actor.feetY + actor.height <= collider.minY) ||
        (collider.maxY !== undefined && actor.feetY >= collider.maxY))
    )
      continue;
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
