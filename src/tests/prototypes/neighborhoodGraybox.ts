/** Review-only site proposal. No production entrypoint imports this module. */
import { auditExteriorGeometry } from '../../../scripts/exteriorGeometryAudit';
import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  WALL_THICKNESS,
} from '../../assets/floorPlan';
import { generateWallSegmentInstances } from '../../scene/level/generateWalls';
import { PORTFOLIO_LEVEL } from '../../scene/level/portfolioLevel';
import {
  FENCE_HEIGHT,
  FENCE_THICKNESS,
  WALL_HEIGHT,
} from '../../scene/structures/portfolioSceneLayout';
import { AVATAR_COLLISION_RADIUS as R } from '../../scene/units';
import {
  collidesWithColliders,
  type RectCollider,
} from '../../systems/collision';
import { AVATAR_RUN_SPEED } from '../../systems/movement/avatarGait';
import { createNavMesh } from '../../systems/navigation/navMesh';

import { move, navFrom } from './neighborhoodFixtures';
import {
  decomposeArc,
  decomposeSolid,
  deviationBound,
  solidCorners,
  type Arc,
  type Point,
  type RotatedSolid,
} from './rectangularNeighborhood';

export const REVIEW_WIDTH = 6;
export const REVIEW_RADIUS = 18;
export const EXTRA_CLEARANCE_TARGET = 0.2;
export type Segment = { id: string; a: Point; b: Point; width: number };
export type Loop = {
  id: string;
  arcs: Arc[];
  lines: Segment[];
  points: Point[];
};
const scaled = (b: RectCollider): RectCollider => ({
  minX: b.minX * FLOOR_PLAN_SCALE,
  maxX: b.maxX * FLOOR_PLAN_SCALE,
  minZ: b.minZ * FLOOR_PLAN_SCALE,
  maxZ: b.maxZ * FLOOR_PLAN_SCALE,
});
export function extent(points: Point[]): RectCollider {
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minZ: Math.min(...points.map((p) => p.z)),
    maxZ: Math.max(...points.map((p) => p.z)),
  };
}
export function overlaps(a: RectCollider, b: RectCollider, margin = 0) {
  return (
    a.minX < b.maxX + margin &&
    a.maxX > b.minX - margin &&
    a.minZ < b.maxZ + margin &&
    a.maxZ > b.minZ - margin
  );
}
function lineBounds(s: Segment, inset: number, extension = 0): RectCollider {
  const h = s.width / 2 - inset;
  const vertical = Math.abs(s.a.x - s.b.x) < 1e-8;
  return {
    minX: Math.min(s.a.x, s.b.x) - (vertical ? h : extension),
    maxX: Math.max(s.a.x, s.b.x) + (vertical ? h : extension),
    minZ: Math.min(s.a.z, s.b.z) - (vertical ? extension : h),
    maxZ: Math.max(s.a.z, s.b.z) + (vertical ? extension : h),
  };
}
function roundedLoop(
  id: string,
  left: number,
  right: number,
  top: number,
  bottom: number
): Loop {
  const r = REVIEW_RADIUS;
  const centers = [
    { x: right - r, z: bottom - r },
    { x: left + r, z: bottom - r },
    { x: left + r, z: top + r },
    { x: right - r, z: top + r },
  ];
  const arcs = centers.map(
    (center, i): Arc => ({
      sourceId: `${id}.curve.${i}`,
      center,
      radius: r,
      width: REVIEW_WIDTH,
      start: (i * Math.PI) / 2,
      sweep: Math.PI / 2,
    })
  );
  const at = (a: Arc, angle: number) => ({
    x: a.center.x + r * Math.cos(angle),
    z: a.center.z + r * Math.sin(angle),
  });
  const lines = arcs.map(
    (a, i): Segment => ({
      id: `${id}.straight.${i}`,
      a: at(a, a.start + a.sweep),
      b: at(arcs[(i + 1) % 4], arcs[(i + 1) % 4].start),
      width: REVIEW_WIDTH,
    })
  );
  const points = arcs.flatMap((a, i) => {
    const curve = Array.from({ length: 91 }, (_, n) =>
      at(a, a.start + (a.sweep * n) / 90)
    );
    const line = lines[i];
    const n = Math.ceil(
      Math.hypot(line.b.x - line.a.x, line.b.z - line.a.z) / 0.3
    );
    return [
      ...curve,
      ...Array.from({ length: n }, (_, j) => ({
        x: line.a.x + ((line.b.x - line.a.x) * (j + 1)) / n,
        z: line.a.z + ((line.b.z - line.a.z) * (j + 1)) / n,
      })),
    ];
  });
  return { id, arcs, lines, points };
}
export function buildGraybox() {
  const audit = auditExteriorGeometry();
  const floor = PORTFOLIO_LEVEL.floors.find((f) => f.id === 'ground')!;
  const rooms = floor.rooms.map((room) => ({
    id: room.sourceId,
    bounds: scaled(room.bounds),
  }));
  const sidewalk = rooms.find(
    (room) => room.id === 'ground.sidewalk.room'
  )!.bounds;
  const street = rooms.find((room) => room.id === 'ground.street.room')!.bounds;
  const west = (sidewalk.minX + sidewalk.maxX) / 2;
  const left = street.maxX + REVIEW_WIDTH / 2;
  const right = left + 90;
  const outside = right + (street.maxX - street.minX) + REVIEW_WIDTH;
  const loops = [
    roundedLoop('north', left, right, -125, 0),
    roundedLoop('south', left, right, 0, 125),
  ];
  const lines: Segment[] = [
    {
      id: 'home-sidewalk',
      a: { x: west, z: -125 },
      b: { x: west, z: 125 },
      width: sidewalk.maxX - sidewalk.minX,
    },
    {
      id: 'outer-sidewalk',
      a: { x: outside, z: -125 },
      b: { x: outside, z: 125 },
      width: REVIEW_WIDTH,
    },
    ...[-125, 125].map((z) => ({
      id: `end-crossing.${z}`,
      a: { x: west, z },
      b: { x: outside, z },
      width: REVIEW_WIDTH,
    })),
  ];
  const lots = [west - 20, left + 20, right - 20, outside + 20].flatMap(
    (x, side) =>
      [-92, -68, -44, 44, 68, 92].map((z, index) => {
        const id = `lot-${String(side * 6 + index + 1).padStart(2, '0')}`;
        const toward = side % 2 === 0 ? 1 : -1;
        const target = [west, left, right, outside][side];
        const house: RotatedSolid = {
          sourceId: `${id}.house`,
          center: { x, z },
          width: 12,
          depth: 14,
          angle: 0,
        };
        const fences: RotatedSolid[] =
          index % 2 === 0
            ? [-1, 1].map((sign) => ({
                sourceId: `${id}.fence.${sign}`,
                center: { x: x + toward * 9, z: z + sign * 5.95 },
                width: 0.2,
                depth: 8.1,
                angle: 0,
              }))
            : [];
        return {
          id,
          side,
          house,
          fences,
          parcel: { minX: x - 10, maxX: x + 10, minZ: z - 10, maxZ: z + 10 },
          path: {
            id: `${id}.path`,
            a: { x: x + toward * 6, z },
            b: { x: target, z },
            width: 3.8,
          },
          door: { x: x + toward * 6, z },
          height: 5 + (index % 3) * 0.4,
        };
      })
  );
  const protectedRooms = rooms.filter(
    (room) => room.id !== 'ground.street.room'
  );
  const protectedBounds = extent(
    protectedRooms.flatMap(({ bounds: b }) => [
      { x: b.minX, z: b.minZ },
      { x: b.maxX, z: b.maxZ },
    ])
  );
  // Keep every measured existing solid, including shelter posts and bench.
  const walls = generateWallSegmentInstances(floor, {
    coordinateScale: FLOOR_PLAN_SCALE,
    baseElevation: 0,
    wallHeight: WALL_HEIGHT,
    wallThickness: WALL_THICKNESS,
    fenceHeight: FENCE_HEIGHT,
    fenceThickness: FENCE_THICKNESS,
    getRoomCategory: (id) =>
      floor.rooms.find((room) => room.id === id)!.category ?? 'interior',
  });
  const existingSolids = [
    ...audit.declaredColliders.map((s) => s.bounds),
    ...walls.map((wall) => wall.collider),
  ];
  const housePieces = lots.flatMap((lot) => decomposeSolid(lot.house));
  const fencePieces = lots.flatMap((lot) =>
    lot.fences.flatMap((fence) => decomposeSolid(fence))
  );
  const arcs = loops.flatMap((loop) => loop.arcs);
  const curvePieces = arcs.flatMap((arc) => decomposeArc(arc));
  const allLines = [
    ...loops.flatMap((loop) => loop.lines),
    ...lines,
    ...lots.map((lot) => lot.path),
  ];
  // Two-metre tangent overlaps bridge the eroded sector endcaps. Tests qualify
  // the joined union; per-piece feasibility alone does not establish a route.
  const baseZones = createNavMesh(FLOOR_PLAN).polygons;
  const zones = [
    ...baseZones,
    ...curvePieces.map((p) => p.bounds),
    ...allLines.map((line) => lineBounds(line, R + 0.1, 2)),
  ];
  return {
    audit,
    rooms,
    sidewalk,
    street,
    protectedRooms,
    protectedBounds,
    loops,
    lines,
    allLines,
    lots,
    arcs,
    housePieces,
    fencePieces,
    curvePieces,
    zones,
    baseZones,
    walls,
    solids: [
      ...existingSolids,
      ...housePieces.map((p) => p.bounds),
      ...fencePieces.map((p) => p.bounds),
    ],
    existingSolids,
    physicalLines: allLines.map((line) => lineBounds(line, 0)),
    conservativeCurveWidth: REVIEW_WIDTH - 2 * deviationBound(),
    scale: FLOOR_PLAN_SCALE,
  };
}
export type Graybox = ReturnType<typeof buildGraybox>;
/** Offset an independently closed route to exercise both passing lanes. */
export function offsetRoute(points: Point[], offset: number): Point[] {
  const ring = points.slice(0, -1);
  return ring.map((p, i) => {
    const a = ring[(i + ring.length - 1) % ring.length];
    const b = ring[(i + 1) % ring.length];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    return {
      x: p.x - ((b.z - a.z) * offset) / length,
      z: p.z + ((b.x - a.x) * offset) / length,
    };
  });
}
export function qualifyRoute(
  layout: Graybox,
  points: Point[],
  reverse = false,
  frameRate = 30
) {
  const route = reverse ? [...points].reverse() : points;
  const nav = navFrom(layout.zones);
  let p = { ...route[0] };
  let maxError = 0;
  let blocked = !nav.contains(p.x, p.z) || blockedPoint(layout, p) ? 1 : 0;
  for (const destination of [...route.slice(1), route[0]]) {
    if (blocked) break;
    const distance = Math.hypot(destination.x - p.x, destination.z - p.z);
    const frames = Math.max(
      1,
      Math.ceil(distance / (AVATAR_RUN_SPEED / frameRate))
    );
    const dx = (destination.x - p.x) / frames,
      dz = (destination.z - p.z) / frames;
    for (let frame = 0; frame < frames; frame++)
      p = move(p, { x: dx, z: dz }, nav, layout.solids);
    const error = Math.hypot(p.x - destination.x, p.z - destination.z);
    maxError = Math.max(maxError, error);
    if (error > 0.0001) {
      blocked++;
      break;
    }
  }
  return {
    reverse,
    points: route.length,
    runSpeed: AVATAR_RUN_SPEED,
    frameRate,
    maxError,
    blocked,
    qualified: blocked === 0,
  };
}
export function overlapViolations(layout: Graybox) {
  return layout.lots.flatMap((lot, i) => [
    ...(overlaps(lot.parcel, layout.protectedBounds, R)
      ? [`${lot.id}:protected`]
      : []),
    ...layout.lots
      .slice(i + 1)
      .filter((other) => overlaps(lot.parcel, other.parcel))
      .map((other) => `${lot.id}:${other.id}`),
  ]);
}
export function blockedPoint(layout: Graybox, p: Point) {
  return collidesWithColliders(p.x, p.z, R, layout.solids);
}
export { solidCorners };
