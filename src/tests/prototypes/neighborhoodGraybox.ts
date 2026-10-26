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
export const APPROACH_WIDTH = 3.8;
// Exterior-only variants; the source-built area, not the protected yard, sets scale.
export const HOUSE_VARIANTS = [
  { width: 0.94, depth: 1.04 },
  { width: 1, depth: 1 },
  { width: 1.06, depth: 0.96 },
  { width: 0.98, depth: 1.06 },
  { width: 1.04, depth: 1.02 },
  { width: 1.02, depth: 0.94 },
];
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
/** Exact union area of axis-aligned source rooms/wall bounds, without double counting. */
export function rectangleUnionArea(rectangles: RectCollider[]) {
  const xs = [...new Set(rectangles.flatMap((r) => [r.minX, r.maxX]))].sort(
    (a, b) => a - b
  );
  let area = 0;
  for (let i = 1; i < xs.length; i++) {
    const intervals = rectangles
      .filter((r) => r.minX < xs[i] && r.maxX > xs[i - 1])
      .map((r) => [r.minZ, r.maxZ])
      .sort((a, b) => a[0] - b[0]);
    let length = 0,
      end = -Infinity;
    for (const [a, b] of intervals) {
      length += Math.max(0, b - Math.max(a, end));
      end = Math.max(end, b);
    }
    area += (xs[i] - xs[i - 1]) * length;
  }
  return area;
}
const boundsCorners = (b: RectCollider) => [
  { x: b.minX, z: b.minZ },
  { x: b.maxX, z: b.maxZ },
];
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
  const generateWalls = (sourceFloor: typeof floor) =>
    generateWallSegmentInstances(sourceFloor, {
      coordinateScale: FLOOR_PLAN_SCALE,
      baseElevation: 0,
      wallHeight: WALL_HEIGHT,
      wallThickness: WALL_THICKNESS,
      fenceHeight: FENCE_HEIGHT,
      fenceThickness: FENCE_THICKNESS,
      getRoomCategory: (id) =>
        sourceFloor.rooms.find((room) => room.id === id)!.category ??
        'interior',
    });
  const walls = generateWalls(floor);
  const builtFloors = PORTFOLIO_LEVEL.floors.filter(
    (f) => f.id === 'ground' || f.id === 'upper'
  );
  const builtRooms = builtFloors.flatMap((f) =>
    f.rooms
      .filter((room) => room.category !== 'exterior')
      .map((room) => ({
        id: room.sourceId,
        floor: f.id,
        bounds: scaled(room.bounds),
      }))
  );
  const builtWalls = builtFloors.flatMap((f) => {
    const ids = f.rooms
      .filter((room) => room.category !== 'exterior')
      .map((room) => room.id);
    return (f.id === 'ground' ? walls : generateWalls(f)).filter(
      (wall) =>
        !wall.isFence &&
        wall.segment.rooms.some((room) => ids.includes(room.id))
    );
  });
  const builtRectangles = [
    ...builtRooms.map((room) => room.bounds),
    ...builtWalls.map((wall) => wall.collider),
  ];
  const builtBounds = extent(builtRectangles.flatMap(boundsCorners));
  const mainHouse = {
    rooms: builtRooms,
    wallSourceIds: [...new Set(builtWalls.map((wall) => wall.sourceId))],
    wallBounds: builtWalls.map((wall) => ({
      id: wall.sourceId,
      bounds: wall.collider,
    })),
    bounds: builtBounds,
    width: builtBounds.maxX - builtBounds.minX,
    depth: builtBounds.maxZ - builtBounds.minZ,
    roomArea: rectangleUnionArea(builtRooms.map((room) => room.bounds)),
    groundRoomArea: rectangleUnionArea(
      builtRooms
        .filter((room) => room.floor === 'ground')
        .map((room) => room.bounds)
    ),
    builtArea: rectangleUnionArea(builtRectangles),
    method:
      'Projected union of ground and upper interior rooms (including garage and upper overhang) ' +
      'plus actual generated wall bounds. Excludes underground basement, ' +
      'exterior yards, driveway, ' +
      'sidewalk, street and fences. Union area is not bounding area or summed floor area.',
  };
  // An equal-area rectangle preserves the built envelope's aspect ratio, then
  // applies modest width/depth variation. It does not copy the yard silhouette.
  const areaScale = Math.sqrt(
    mainHouse.builtArea / (mainHouse.width * mainHouse.depth)
  );
  const referenceWidth = mainHouse.width * areaScale;
  const referenceDepth = mainHouse.depth * areaScale;
  const maxWidth =
    referenceWidth * Math.max(...HOUSE_VARIANTS.map((v) => v.width));
  const maxDepth =
    referenceDepth * Math.max(...HOUSE_VARIANTS.map((v) => v.depth));
  const parcelWidth = maxWidth + 12,
    parcelDepth = maxDepth + 10;
  const frontageOffset = parcelWidth / 2 + REVIEW_WIDTH / 2 + 3;
  const frontageSpacing = parcelDepth + 6;
  const protectedRooms = rooms.filter(
    (room) => room.id !== 'ground.street.room'
  );
  const protectedBounds = extent(
    protectedRooms.flatMap((room) => boundsCorners(room.bounds))
  );
  const innerFrontage =
    Math.max(
      Math.abs(protectedBounds.minZ),
      Math.abs(protectedBounds.maxZ),
      REVIEW_RADIUS + REVIEW_WIDTH / 2
    ) +
    parcelDepth / 2 +
    8;
  const frontageZ = [2, 1, 0]
    .map((i) => -innerFrontage - i * frontageSpacing)
    .concat([0, 1, 2].map((i) => innerFrontage + i * frontageSpacing));
  const halfLength =
    innerFrontage + 2 * frontageSpacing + parcelDepth / 2 + REVIEW_RADIUS + 8;
  const sidewalk = rooms.find(
    (room) => room.id === 'ground.sidewalk.room'
  )!.bounds;
  const street = rooms.find((room) => room.id === 'ground.street.room')!.bounds;
  const west = (sidewalk.minX + sidewalk.maxX) / 2;
  const left = street.maxX + REVIEW_WIDTH / 2;
  const right = left + 2 * frontageOffset + parcelWidth + 12;
  const outside = right + (street.maxX - street.minX) + REVIEW_WIDTH;
  const loops = [
    roundedLoop('north', left, right, -halfLength, 0),
    roundedLoop('south', left, right, 0, halfLength),
  ];
  const lines: Segment[] = [
    {
      id: 'home-sidewalk',
      a: { x: west, z: -halfLength },
      b: { x: west, z: halfLength },
      width: sidewalk.maxX - sidewalk.minX,
    },
    {
      id: 'outer-sidewalk',
      a: { x: outside, z: -halfLength },
      b: { x: outside, z: halfLength },
      width: REVIEW_WIDTH,
    },
    ...[-halfLength, halfLength].map((z) => ({
      id: `end-crossing.${z}`,
      a: { x: west, z },
      b: { x: outside, z },
      width: REVIEW_WIDTH,
    })),
  ];
  const lots = [
    west - frontageOffset,
    left + frontageOffset,
    right - frontageOffset,
    outside + frontageOffset,
  ].flatMap((x, side) =>
    frontageZ.map((z, index) => {
      const id = `lot-${String(side * 6 + index + 1).padStart(2, '0')}`;
      const toward = side % 2 === 0 ? 1 : -1;
      const target = [west, left, right, outside][side];
      const variant = HOUSE_VARIANTS[(index + side) % HOUSE_VARIANTS.length];
      const house: RotatedSolid = {
        sourceId: `${id}.house`,
        center: { x, z },
        width: referenceWidth * variant.width,
        depth: referenceDepth * variant.depth,
        angle: 0,
      };
      const fences: RotatedSolid[] =
        index % 2 === 0
          ? [-1, 1].map((sign) => ({
              sourceId: `${id}.fence.${sign}`,
              center: {
                x: x + toward * (parcelWidth / 2 - 1),
                z: z + sign * (parcelDepth / 4 + APPROACH_WIDTH / 4),
              },
              width: 0.2,
              depth: (parcelDepth - APPROACH_WIDTH) / 2,
              angle: 0,
            }))
          : [];
      return {
        id,
        side,
        house,
        fences,
        parcel: {
          minX: x - parcelWidth / 2,
          maxX: x + parcelWidth / 2,
          minZ: z - parcelDepth / 2,
          maxZ: z + parcelDepth / 2,
        },
        path: {
          id: `${id}.path`,
          a: { x: x + (toward * house.width) / 2, z },
          b: { x: target, z },
          width: APPROACH_WIDTH,
        },
        door: { x: x + (toward * house.width) / 2, z },
        height: 5 + (index % 3) * 0.4,
      };
    })
  );
  // Keep every measured existing solid, including shelter posts and bench.
  const existingSolids = [
    ...audit.declaredColliders.map((s) => s.bounds),
    ...walls.map((wall) => wall.collider),
  ];
  const boundaryGates = walls.filter((wall) =>
    collidesWithColliders(
      west,
      (wall.collider.minZ + wall.collider.maxZ) / 2,
      R,
      [wall.collider]
    )
  );
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
    mainHouse,
    siting: {
      parcelWidth,
      parcelDepth,
      frontageSpacing,
      frontageOffset,
      halfLength,
    },
    proposedStreets: [
      {
        minX: sidewalk.maxX,
        maxX: left - REVIEW_WIDTH / 2,
        minZ: -halfLength,
        maxZ: halfLength,
      },
      {
        minX: right + REVIEW_WIDTH / 2,
        maxX: outside - REVIEW_WIDTH / 2,
        minZ: -halfLength,
        maxZ: halfLength,
      },
    ],
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
    boundaryGates,
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
    lastPosition: p,
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
