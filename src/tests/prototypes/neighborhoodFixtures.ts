import { AVATAR_COLLISION_RADIUS } from '../../scene/units';
import {
  collidesWithColliders,
  type RectCollider,
} from '../../systems/collision';
import { planMovementSubsteps } from '../../systems/movement/movementSubsteps';
import { createNavMesh, type NavMesh } from '../../systems/navigation/navMesh';

import {
  decomposeArc,
  decomposeSolid,
  type Arc,
  type Point,
  type RotatedSolid,
} from './rectangularNeighborhood';

// Synthetic local coordinates, deliberately unrelated to the accepted site footprint.
export const INNER_CURVE: Arc = {
  sourceId: 'synthetic.inner-curve',
  center: { x: 0, z: 0 },
  radius: 18,
  width: 6,
  start: 0,
  sweep: Math.PI / 2,
};
export const ROTATED_FRONTAGE: RotatedSolid = {
  sourceId: 'synthetic.closed-frontage',
  center: { x: 50, z: 50 },
  width: 12,
  depth: 8,
  angle: Math.PI / 5,
};
export function fenceOpening(angle: number, gap = 3.8): RotatedSolid[] {
  return [-1, 1].map((side) => ({
    sourceId: `synthetic.fence.${side}`,
    center: {
      x: 60 + side * (4 + gap / 2) * Math.cos(angle),
      z: side * (4 + gap / 2) * Math.sin(angle),
    },
    width: 8,
    depth: 0.2,
    angle,
  }));
}
export function navFrom(rects: readonly RectCollider[]): NavMesh {
  return createNavMesh(
    { outline: [], rooms: [] },
    { extraZones: rects, epsilon: 0 }
  );
}
/** Test driver uses current subdivision plus the scene's X-then-Z occupancy order.
 * radius/2 is the upper bound; the live stair-aware bound can only be smaller.
 */
export function move(
  start: Point,
  delta: Point,
  nav: NavMesh,
  solids: readonly RectCollider[],
  maxStep = AVATAR_COLLISION_RADIUS / 2
): Point {
  const p = { ...start };
  const steps = planMovementSubsteps(delta.x, delta.z, maxStep);
  const valid = (x: number, z: number) =>
    nav.contains(x, z) &&
    !collidesWithColliders(x, z, AVATAR_COLLISION_RADIUS, solids);
  for (let i = 0; i < steps.count; i++) {
    if (valid(p.x + steps.stepX, p.z)) p.x += steps.stepX;
    if (valid(p.x, p.z + steps.stepZ)) p.z += steps.stepZ;
  }
  return p;
}
export function fixture() {
  const walkable = decomposeArc(INNER_CURVE);
  const solids = [ROTATED_FRONTAGE, ...fenceOpening(Math.PI / 4)].flatMap((s) =>
    decomposeSolid(s)
  );
  return { walkable, solids };
}
