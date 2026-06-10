import type { RectCollider } from '../collision';

export interface NamedRectCollider {
  name: string;
  bounds: RectCollider;
}

export interface SplitColliderAroundCorridorOptions {
  name: string;
  bounds: RectCollider;
  corridor: Pick<RectCollider, 'minX' | 'maxX'>;
}

const hasPositiveArea = (bounds: RectCollider): boolean =>
  bounds.maxX > bounds.minX && bounds.maxZ > bounds.minZ;

/**
 * Splits a stairwell blocker around a deliberate entry corridor. The resulting
 * collider pieces keep side/void protection while leaving the stair-to-landing
 * mouth open for normal player-radius collision checks.
 */
export const splitColliderAroundCorridor = ({
  name,
  bounds,
  corridor,
}: SplitColliderAroundCorridorOptions): NamedRectCollider[] => {
  if (!hasPositiveArea(bounds)) {
    return [];
  }

  const pieces: NamedRectCollider[] = [];
  const leftPiece = {
    minX: bounds.minX,
    maxX: Math.min(corridor.minX, bounds.maxX),
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
  };
  const rightPiece = {
    minX: Math.max(corridor.maxX, bounds.minX),
    maxX: bounds.maxX,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
  };

  if (hasPositiveArea(leftPiece)) {
    pieces.push({ name: `${name}West`, bounds: leftPiece });
  }
  if (hasPositiveArea(rightPiece)) {
    pieces.push({ name: `${name}East`, bounds: rightPiece });
  }

  return pieces;
};
