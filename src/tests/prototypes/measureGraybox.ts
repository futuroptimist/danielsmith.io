/** Explicit-output offline review capture; never imported by the app. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, platform } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { AVATAR_COLLISION_RADIUS as R } from '../../scene/units';
import { collidesWithColliders } from '../../systems/collision';

import { maximumSolidDeviation } from './measureNeighborhood';
import { navFrom } from './neighborhoodFixtures';
import {
  buildGraybox,
  extent,
  overlapViolations,
  offsetRoute,
  qualifyRoute,
  solidCorners,
  type Graybox,
  EXTRA_CLEARANCE_TARGET,
} from './neighborhoodGraybox';
import { type Point, type RotatedSolid } from './rectangularNeighborhood';

const hash = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');
const number = (n: number) => Number(n.toFixed(4));
export function probeWholeLayout(layout: Graybox) {
  const nav = navFrom(layout.zones);
  const probe = () => {
    let hits = 0;
    for (let i = 0; i < 128; i++) {
      // Deliberate misses force a full global-array scan on both interfaces.
      if (collidesWithColliders(-1000 - i, -1000, R, layout.solids)) hits++;
      if (nav.contains(-1000 - i, -1000)) hits++;
    }
    return hits;
  };
  for (let i = 0; i < 50; i++) probe();
  return Array.from({ length: 3 }, () => {
    const samples = [];
    let hits = 0;
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      hits += probe();
      samples.push(performance.now() - start);
    }
    const sorted = [...samples].sort((a, b) => a - b);
    return {
      samplesMs: samples,
      p50: sorted[49],
      p95: sorted[94],
      p99: sorted[98],
      max: sorted[99],
      hits,
    };
  });
}
export function measurement(layout: Graybox) {
  const loops = layout.loops.flatMap((loop) =>
    [false, true].map((reverse) => ({
      id: loop.id,
      ...qualifyRoute(layout, loop.points, reverse),
    }))
  );
  const passingLanes = layout.loops.flatMap((loop) =>
    [-0.85, 0.85].map((offset) => ({
      id: loop.id,
      offset,
      ...qualifyRoute(
        layout,
        offsetRoute(loop.points, offset).filter((_, i) => i % 8 === 0),
        offset < 0,
        4
      ),
    }))
  );
  const common = layout.loops[0].lines[0];
  const joins = [
    {
      id: 'shared-cross-street',
      ...qualifyRoute(layout, [common.a, common.b]),
    },
  ];
  const paths = layout.lots.map((lot) => {
    const sign = Math.sign(lot.path.b.x - lot.path.a.x);
    return {
      id: lot.id,
      ...qualifyRoute(layout, [
        { x: lot.door.x + sign * (R + EXTRA_CLEARANCE_TARGET), z: lot.door.z },
        lot.path.b,
      ]),
    };
  });
  const home = layout.lines[0];
  const stop = layout.audit.anchors.find(
    (a) => a.sourceId === 'ground.busStop.shelter'
  )!;
  const approaches = [-125, 125].map((z) => ({
    id: `preserved-sidewalk-to-${z}`,
    ...qualifyRoute(layout, [
      { x: home.a.x, z: stop.world.z },
      { x: home.a.x, z },
    ]),
  }));
  const openings = layout.lots
    .filter((l) => l.fences.length)
    .map((lot) => {
      const [a, b] = lot.fences.map((f) =>
        layout.fencePieces.filter((p) => p.sourceId === f.sourceId)
      );
      const physicalWidth =
        Math.min(...b.map((p) => p.bounds.minZ)) -
        Math.max(...a.map((p) => p.bounds.maxZ));
      return {
        id: lot.id,
        authoredWidth: 3.8,
        physicalWidth,
        actorCenterWidth: physicalWidth - 2 * R,
      };
    });
  const shapes = layout.lots.flatMap((l) => [l.house, ...l.fences]);
  const pieces = [...layout.housePieces, ...layout.fencePieces];
  const deviations = shapes.map((s) => ({
    id: s.sourceId,
    maximum: maximumSolidDeviation(
      s,
      pieces.filter((p) => p.sourceId === s.sourceId)
    ),
  }));
  return {
    scope:
      'Offline review layout only; no scene activation or full runtime/hardware qualification.',
    coordinateContract: {
      scale: layout.scale,
      units: 'world metres',
      anchors:
        'Current source FLOOR_PLAN_SCALE and actual exterior builders; no copied coordinates.',
    },
    counts: {
      lots: layout.lots.length,
      closedLoops: layout.loops.length,
      existingExteriorSolids: layout.audit.declaredColliders.length,
      existingGroundWalls: layout.walls.length,
      existingGroundNavZones: layout.baseZones.length,
      proposedHouseRectangles: layout.housePieces.length,
      proposedFenceRectangles: layout.fencePieces.length,
      wholeReviewSolidArray: layout.solids.length,
      wholeReviewNavArray: layout.zones.length,
      curvedNavRectangles: layout.curvePieces.length,
      straightNavRectangles: layout.allLines.length,
      scope:
        'Complete review arrays, including existing ground walls/nav and exterior solids. ' +
        'Dynamic doors, furnishings and stair guards are not a full live runtime capture.',
    },
    provisionalTargets: {
      additionalClearanceMetres: EXTRA_CLEARANCE_TARGET,
      solidQueryCap: 256,
      navQueryCap: 256,
      acceptedProductionLimits: false,
      solidCountWithinTarget: layout.solids.length <= 256,
      navCountWithinTarget: layout.zones.length <= 256,
    },
    qualification: {
      loops,
      passingLanes,
      joins,
      paths,
      approaches,
      boundaryGates: layout.boundaryGates.map((wall) => ({
        sourceId: wall.sourceId,
        bounds: wall.collider,
      })),
      homeConnectionQualified: approaches.every((route) => route.qualified),
      overlapViolations: overlapViolations(layout),
      integratedRuntime: false,
      lowEndHardware: false,
      note: 'Movement uses current radius, run speed, subdivision and X-then-Z occupancy order.',
    },
    clearance: {
      actorRadius: R,
      authoredCurveWidth: 6,
      curveRadius: 18,
      conservativeCurvePhysicalWidth: layout.conservativeCurveWidth,
      twoActorPhysicalWidth: 4 * R,
      provisionalTwoActorWidthWithAllowance: 4 * R + EXTRA_CLEARANCE_TARGET,
      openings,
      solidDeviations: deviations,
    },
    protected: { rooms: layout.protectedRooms, exterior: layout.audit },
    lots: layout.lots,
    cpu: {
      environment: {
        node: process.version,
        platform: platform(),
        cpu: cpus()[0]?.model,
      },
      method:
        '128 collision and 128 nav miss queries per batch, 50 warm batches, 3 x 100 samples.',
      arrays:
        'Actual complete review arrays, no truncation or per-lot broadphase.',
      attempts: probeWholeLayout(layout),
    },
    remainingGates: [
      'Existing sidewalk end walls block both home connections; retained without runtime edits.',
      'Global arrays exceed provisional query targets; engine expansion not attempted.',
      'No rendering/FPS, low-end hardware, normal-scene traversal or visual production acceptance.',
    ],
  };
}
export function renderGraybox(layout: Graybox, isometric = false) {
  const project = (p: Point, height = 0): Point =>
    isometric
      ? { x: ((p.x - p.z) * Math.sqrt(3)) / 2, z: (p.x + p.z) / 2 - height }
      : p;
  const all = layout.lots.flatMap((l) => solidCorners(l.house));
  all.push(
    { x: layout.protectedBounds.minX, z: -150 },
    { x: 220, z: 150 },
    { x: -20, z: 141 }
  );
  const bounds = extent(all.map((p) => project(p)));
  const box = {
    x: bounds.minX - 25,
    y: bounds.minZ - 35,
    w: bounds.maxX - bounds.minX + 50,
    h: bounds.maxZ - bounds.minZ + 65,
  };
  const points = (ps: Point[], height = 0) =>
    ps
      .map((p) => {
        const q = project(p, height);
        return `${number(q.x)},${number(q.z)}`;
      })
      .join(' ');
  const polygon = (ps: Point[], fill: string, height = 0) =>
    `<polygon points="${points(ps, height)}" fill="${fill}" stroke="#64748b" stroke-width=".25"/>`;
  const rect = (
    b: { minX: number; maxX: number; minZ: number; maxZ: number },
    fill: string
  ) =>
    polygon(
      [
        { x: b.minX, z: b.minZ },
        { x: b.maxX, z: b.minZ },
        { x: b.maxX, z: b.maxZ },
        { x: b.minX, z: b.maxZ },
      ],
      fill
    );
  const text = (p: Point, s: string, size = 2.7) => {
    const q = project(p);
    return `<text x="${q.x}" y="${q.z}" font-size="${size}">${s}</text>`;
  };
  const house = (s: RotatedSolid, height: number) => {
    const corners = solidCorners(s);
    const walls = isometric
      ? corners
          .map((p, i) => {
            const q = corners[(i + 1) % 4];
            const polygonPoints = [
              project(p),
              project(q),
              project(q, height),
              project(p, height),
            ];
            return (
              `<polygon points="${polygonPoints.map((p) => `${p.x},${p.z}`).join(' ')}" ` +
              'fill="#a7adb4" stroke="#64748b" stroke-width=".25"/>'
            );
          })
          .join('')
      : '';
    const ridge = [
      { x: s.center.x, z: s.center.z - s.depth / 2 },
      { x: s.center.x, z: s.center.z + s.depth / 2 },
    ];
    const face = (ps: Point[], fill: string) =>
      `<polygon points="${ps.map((p) => `${p.x},${p.z}`).join(' ')}" ` +
      `fill="${fill}" stroke="#64748b" stroke-width=".25"/>`;
    const r = ridge.map((p) => project(p, height + (isometric ? 1.5 : 0)));
    const e = corners.map((p) => project(p, height));
    return (
      walls +
      face([e[0], r[0], r[1], e[3]], '#7d8894') +
      face([r[0], e[1], e[2], r[1]], '#a8b1bb') +
      face([e[0], e[1], r[0]], '#9aa2aa') +
      face([e[2], e[3], r[1]], '#9aa2aa')
    );
  };
  const path = (ps: Point[], width: number, color: string) =>
    `<polyline points="${points(ps)}" fill="none" stroke="${color}" ` +
    `stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const stop = layout.audit.anchors.find(
    (a) => a.sourceId === 'ground.busStop.shelter'
  )!;
  const stopBounds = {
    minX: stop.measuredAssemblyBounds.min[0],
    maxX: stop.measuredAssemblyBounds.max[0],
    minZ: stop.measuredAssemblyBounds.min[2],
    maxZ: stop.measuredAssemblyBounds.max[2],
  };
  const title = isometric
    ? 'Isometric massing review'
    : 'Scaled overhead review';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}"`,
    ' width="1400" height="1400" role="img" aria-labelledby="title desc">',
    `<title id="title">${title}: 24 proposed lots</title>`,
    '<desc id="desc">Offline review only. Blue is protected source geometry; gold is the measured',
    ' bus stop. Green and teal are connected walking loops. ',
    'Labels identify every proposed lot.</desc>',
    `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="#f8fafc"/>`,
    '<g font-family="Arial,sans-serif" fill="#172554">',
    `<text x="${box.x + 6}" y="${box.y + 9}" font-size="5">${title} · 24 lots</text>`,
    `<text x="${box.x + 6}" y="${box.y + 16}" font-size="3">`,
    'REVIEW ONLY · world metres · no live scene changes</text>',
    ...layout.protectedRooms.map((r) => rect(r.bounds, '#dbeafe')),
    ...layout.walls.map((wall) => rect(wall.collider, '#647b9b')),
    ...layout.lots.map((l) => rect(l.parcel, '#e5e7eb')),
    ...layout.physicalLines.map((b) => rect(b, '#d1d5db')),
    ...layout.loops.flatMap((loop, i) => {
      const color = i ? '#99d6ce' : '#a7d9b4';
      const ribbons = loop.arcs.map((arc) => {
        const edge = (radius: number) =>
          Array.from({ length: 91 }, (_, n) => ({
            x:
              arc.center.x +
              radius * Math.cos(arc.start + (arc.sweep * n) / 90),
            z:
              arc.center.z +
              radius * Math.sin(arc.start + (arc.sweep * n) / 90),
          }));
        return polygon(
          [
            ...edge(arc.radius + arc.width / 2),
            ...edge(arc.radius - arc.width / 2).reverse(),
          ],
          color
        );
      });
      return [
        ...ribbons,
        ...loop.lines.map((line) =>
          rect(
            layout.physicalLines[
              layout.allLines.findIndex((s) => s.id === line.id)
            ],
            color
          )
        ),
      ];
    }),
    ...layout.loops.map((l, i) =>
      path([...l.points, l.points[0]], 0.5, i ? '#0f766e' : '#15803d')
    ),
    ...layout.lots.map((l) => house(l.house, isometric ? l.height : 0)),
    ...layout.lots.flatMap((l) =>
      l.fences.map((f) =>
        polygon(solidCorners(f), '#856b50', isometric ? 1 : 0)
      )
    ),
    ...layout.lots.map((l) =>
      text({ x: l.house.center.x - 6, z: l.house.center.z + 12 }, l.id)
    ),
    rect(stopBounds, '#fbbf24'),
    ...layout.boundaryGates.map((wall) => rect(wall.collider, '#dc2626')),
    text(
      { x: layout.sidewalk.maxX + 1, z: layout.sidewalk.minZ - 2 },
      'Blocked exit',
      2.5
    ),
    text(
      { x: layout.sidewalk.maxX + 1, z: layout.sidewalk.maxZ + 3 },
      'Blocked exit',
      2.5
    ),
    text(
      { x: layout.protectedBounds.minX, z: layout.protectedBounds.minZ - 4 },
      'Protected existing home'
    ),
    text({ x: stopBounds.maxX + 2, z: stopBounds.minZ }, 'Bus stop'),
    text(
      { x: layout.loops[0].arcs[1].center.x + 10, z: -62 },
      'Loop A · R18 m',
      3.5
    ),
    text(
      { x: layout.loops[1].arcs[1].center.x + 10, z: 62 },
      'Loop B · R18 m',
      3.5
    ),
    path(
      [
        { x: -20, z: 135 },
        { x: 0, z: 135 },
      ],
      1,
      '#172554'
    ),
    text({ x: -20, z: 141 }, '20 m'),
    '</g></svg>\n',
  ].join('');
}
function run(output: string) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  // The audit needs only canvas creation. Null context suppresses sign text paint,
  // not geometry, matching the existing geometry audit tests.
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => ({ width: 0, height: 0, getContext: () => null }),
    },
  });
  let layout: Graybox;
  try {
    layout = buildGraybox();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
  process.stderr.write(
    'Geometry built; qualifying routes and measuring global queries.\n'
  );
  const report = measurement(layout);
  process.stderr.write('Measurements complete; writing evidence.\n');
  const sourceFiles = execFileSync(
    'git',
    ['ls-files', 'src', 'scripts/exteriorGeometryAudit.ts'],
    { encoding: 'utf8' }
  )
    .trim()
    .split(/\r?\n/);
  for (const name of ['neighborhoodGraybox.ts', 'measureGraybox.ts']) {
    const file = `src/tests/prototypes/${name}`;
    if (!sourceFiles.includes(file)) sourceFiles.push(file);
  }
  const provenance = {
    base: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    dirty: execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf8',
    }).trim(),
    capturedAt: new Date().toISOString(),
    sourceHashes: Object.fromEntries(
      sourceFiles.sort().map((file) => [file, hash(readFileSync(file))])
    ),
  };
  mkdirSync(output, { recursive: true });
  writeFileSync(
    join(output, 'neighborhood-graybox.json'),
    JSON.stringify({ provenance, ...report }, null, 2) + '\n'
  );
  writeFileSync(
    join(output, 'neighborhood-graybox-overhead.svg'),
    renderGraybox(layout)
  );
  writeFileSync(
    join(output, 'neighborhood-graybox-isometric.svg'),
    renderGraybox(layout, true)
  );
  process.stdout.write(
    JSON.stringify({
      counts: report.counts,
      qualification: report.qualification,
      cpu: report.cpu.attempts.map((a) => ({ p95: a.p95, p99: a.p99 })),
      openings: report.clearance.openings,
    }) + '\n'
  );
}
if (process.argv[1]?.endsWith('measureGraybox.ts')) {
  if (!process.argv[2])
    throw new Error('Provide an explicit output directory.');
  run(process.argv[2]);
}
