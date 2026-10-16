import type { SourceBackedCollider } from '../../scene/level/sourceCollision';
import { AVATAR_COLLISION_RADIUS } from '../../scene/units';
import type { RectCollider } from '../../systems/collision';

/** Experimental geometry only. Never imported by the shipped scene. */
export type Point = { x: number; z: number };
export type Piece = SourceBackedCollider<
  'walkable' | 'solid',
  string,
  'synthetic-prototype'
> & { pieceId: string };
export interface GridOptions {
  cellSize: number;
  maxCells: number;
  maxRectangles: number;
  overlap: number;
}
const MAX_CELLS = 262144;
const MAX_RECTANGLES = 512;
export const GRID: Readonly<GridOptions> = Object.freeze({
  cellSize: 0.125,
  maxCells: MAX_CELLS,
  maxRectangles: MAX_RECTANGLES,
  overlap: 0.001,
});
export interface Arc {
  sourceId: string;
  center: Point;
  radius: number;
  width: number;
  start: number;
  sweep: number;
}
export interface RotatedSolid {
  sourceId: string;
  center: Point;
  width: number;
  depth: number;
  angle: number;
}
export function corners(r: RectCollider): Point[] {
  return [
    { x: r.minX, z: r.minZ },
    { x: r.maxX, z: r.minZ },
    { x: r.maxX, z: r.maxZ },
    { x: r.minX, z: r.maxZ },
  ];
}
function finite(...values: number[]) {
  if (!values.every(Number.isFinite)) throw new Error('Non-finite geometry.');
}
function bounds(points: Point[]): RectCollider {
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minZ: Math.min(...points.map((p) => p.z)),
    maxZ: Math.max(...points.map((p) => p.z)),
  };
}
export function solidCorners(s: RotatedSolid): Point[] {
  return corners({
    minX: -s.width / 2,
    maxX: s.width / 2,
    minZ: -s.depth / 2,
    maxZ: s.depth / 2,
  }).map((p) => ({
    x: s.center.x + p.x * Math.cos(s.angle) - p.z * Math.sin(s.angle),
    z: s.center.z + p.x * Math.sin(s.angle) + p.z * Math.cos(s.angle),
  }));
}
/** SAT is used only offline to emit the existing axis-aligned rectangles. */
export function intersectsSolid(r: RectCollider, s: RotatedSolid): boolean {
  const a = corners(r),
    b = solidCorners(s);
  const axes = [
    { x: 1, z: 0 },
    { x: 0, z: 1 },
    { x: Math.cos(s.angle), z: Math.sin(s.angle) },
    { x: -Math.sin(s.angle), z: Math.cos(s.angle) },
  ];
  return axes.every((axis) => {
    const ap = a.map((p) => p.x * axis.x + p.z * axis.z),
      bp = b.map((p) => p.x * axis.x + p.z * axis.z);
    return (
      Math.max(...ap) >= Math.min(...bp) && Math.max(...bp) >= Math.min(...ap)
    );
  });
}
function rasterize(
  sourceId: string,
  role: Piece['role'],
  extent: RectCollider,
  accept: (r: RectCollider) => boolean,
  options: GridOptions
): Piece[] {
  const { cellSize: h, maxCells, maxRectangles, overlap } = options;
  finite(h, overlap, ...(Object.values(extent) as number[]));
  if (
    !sourceId.trim() ||
    h <= 0 ||
    overlap < 0 ||
    overlap >= h / 4 ||
    !Number.isSafeInteger(maxCells) ||
    maxCells < 1 ||
    maxCells > MAX_CELLS ||
    !Number.isSafeInteger(maxRectangles) ||
    maxRectangles < 1 ||
    maxRectangles > MAX_RECTANGLES
  ) {
    throw new Error('Invalid bounded grid.');
  }
  const x0 = Math.floor(extent.minX / h),
    x1 = Math.ceil(extent.maxX / h);
  const z0 = Math.floor(extent.minZ / h),
    z1 = Math.ceil(extent.maxZ / h);
  if (![x0, x1, z0, z1].every(Number.isSafeInteger)) {
    throw new Error('Unsafe grid index range.');
  }
  if ((x1 - x0) * (z1 - z0) > maxCells)
    throw new Error('Candidate cell budget exceeded.');
  const pieces: Piece[] = [];
  for (let z = z0; z < z1; z++) {
    let run: RectCollider | undefined;
    const flush = () => {
      if (!run) return;
      if (pieces.length >= maxRectangles)
        throw new Error('Rectangle budget exceeded.');
      const pieceId = `${sourceId}.${role}.${pieces.length}`;
      pieces.push({
        sourceId,
        sourceType: 'synthetic-prototype',
        role,
        pieceId,
        intent: 'physical-boundary',
        purpose: 'Isolated feasibility fixture',
        name: pieceId,
        bounds: { ...run, debugName: pieceId },
      });
      run = undefined;
    };
    for (let x = x0; x < x1; x++) {
      const r = {
        minX: x * h - overlap,
        maxX: (x + 1) * h + overlap,
        minZ: z * h - overlap,
        maxZ: (z + 1) * h + overlap,
      };
      if (accept(r)) {
        if (run) run.maxX = r.maxX;
        else run = r;
      } else flush();
    }
    flush();
  }
  if (!pieces.length) throw new Error('No feasible rectangles.');
  return pieces;
}
/** Exact conservative disk clearance from annulus and convex-sector boundaries. */
export function arcContainsDisk(a: Arc, p: Point, radius: number): boolean {
  const x = p.x - a.center.x,
    z = p.z - a.center.z,
    distance = Math.hypot(x, z);
  const end = a.start + a.sweep;
  return (
    distance >= a.radius - a.width / 2 + radius &&
    distance <= a.radius + a.width / 2 - radius &&
    Math.cos(a.start) * z - Math.sin(a.start) * x >= radius &&
    Math.sin(end) * x - Math.cos(end) * z >= radius
  );
}
export function decomposeArc(
  a: Arc,
  options: GridOptions = GRID,
  actorRadius = AVATAR_COLLISION_RADIUS
): Piece[] {
  finite(
    a.center.x,
    a.center.z,
    a.radius,
    a.width,
    a.start,
    a.sweep,
    actorRadius
  );
  if (
    actorRadius < 0 ||
    a.width <= 2 * actorRadius ||
    a.radius <= a.width / 2 ||
    a.sweep <= 0 ||
    a.sweep > Math.PI
  )
    throw new Error('Invalid annular sector.');
  const outer = a.radius + a.width / 2;
  return rasterize(
    a.sourceId,
    'walkable',
    {
      minX: a.center.x - outer,
      maxX: a.center.x + outer,
      minZ: a.center.z - outer,
      maxZ: a.center.z + outer,
    },
    (r) => {
      const nearest = {
        x: Math.max(r.minX, Math.min(a.center.x, r.maxX)),
        z: Math.max(r.minZ, Math.min(a.center.z, r.maxZ)),
      };
      return (
        Math.hypot(nearest.x - a.center.x, nearest.z - a.center.z) >=
          a.radius - a.width / 2 + actorRadius &&
        corners(r).every((p) => arcContainsDisk(a, p, actorRadius))
      );
    },
    options
  );
}
export function decomposeSolid(
  s: RotatedSolid,
  options: GridOptions = GRID
): Piece[] {
  finite(s.center.x, s.center.z, s.width, s.depth, s.angle);
  if (s.width <= 0 || s.depth <= 0)
    throw new Error('Invalid solid dimensions.');
  return rasterize(
    s.sourceId,
    'solid',
    bounds(solidCorners(s)),
    (r) => intersectsSolid(r, s),
    options
  );
}
/** Conservative geometric overcoverage bound, not a hardware performance claim. */
export function deviationBound(options: GridOptions = GRID): number {
  return Math.SQRT2 * (options.cellSize + 2 * options.overlap);
}
