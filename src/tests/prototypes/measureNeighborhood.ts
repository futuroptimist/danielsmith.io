/** Read-only runtime probe: writes only a review report/overlay to its explicit output directory. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { platform, arch, cpus } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { AVATAR_COLLISION_RADIUS as R } from '../../scene/units';
import {
  collidesWithColliders,
  type RectCollider,
} from '../../systems/collision';

import {
  fenceOpening,
  fixture,
  INNER_CURVE,
  navFrom,
  ROTATED_FRONTAGE,
} from './neighborhoodFixtures';
import {
  corners,
  decomposeSolid,
  deviationBound,
  GRID,
  solidCorners,
  type Piece,
  type RotatedSolid,
} from './rectangularNeighborhood';

export function maximumSolidDeviation(
  s: RotatedSolid,
  pieces: Piece[]
): number {
  return Math.max(
    ...pieces.flatMap((p) =>
      corners(p.bounds).map((v) => {
        const dx = v.x - s.center.x,
          dz = v.z - s.center.z;
        const x = dx * Math.cos(s.angle) + dz * Math.sin(s.angle);
        const z = -dx * Math.sin(s.angle) + dz * Math.cos(s.angle);
        return Math.hypot(
          Math.max(0, Math.abs(x) - s.width / 2),
          Math.max(0, Math.abs(z) - s.depth / 2)
        );
      })
    )
  );
}
export function openingEvidence(angle: number, gap: number) {
  const fences = fenceOpening(angle, gap),
    parts = fences.map((s) => decomposeSolid(s));
  // Project every emitted corner on the opening axis. This proves a clear strip
  // across the entire fence depth, stronger than sampling point containment.
  const projected = parts.map((ps) =>
    ps.flatMap((p) =>
      corners(p.bounds).map(
        (v) => (v.x - 60) * Math.cos(angle) + v.z * Math.sin(angle)
      )
    )
  );
  const minimumPhysicalClearWidth =
    Math.min(...projected[1]) - Math.max(...projected[0]);
  return {
    angle,
    authoredGap: gap,
    minimumPhysicalClearWidth,
    guaranteedActorCenterStrip: minimumPhysicalClearWidth - 2 * R,
    maxBoundaryDeviation: Math.max(
      ...fences.map((s, i) => maximumSolidDeviation(s, parts[i]))
    ),
    rectangleCount: parts.flat().length,
  };
}
function timing(count: number, zoneCount: number) {
  // Bounded worst-case misses scan every rectangle. No GPU, scene or hardware claim.
  const source = fixture().solids.map((p) => p.bounds);
  const colliders: RectCollider[] = Array.from({ length: count }, (_, i) => ({
    ...source[i % source.length],
    minX: 100 + i * 2,
    maxX: 101 + i * 2,
    minZ: 100,
    maxZ: 101,
  }));
  const zones = colliders.slice(0, zoneCount);
  const nav = navFrom(zones);
  const probe = () => {
    let hits = 0;
    for (let i = 0; i < 128; i++) {
      // 64 capped substeps, two axis candidates each.
      if (collidesWithColliders(i / 1000, 0, R, colliders)) hits++;
      if (nav.contains(i / 1000, 0)) hits++;
    }
    return hits;
  };
  for (let i = 0; i < 100; i++) probe();
  const attempts = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const samples = [];
    let hits = 0;
    for (let i = 0; i < 300; i++) {
      const start = performance.now();
      hits += probe();
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    attempts.push({
      samples: samples.length,
      p50: samples[149],
      p95: samples[284],
      p99: samples[296],
      max: samples[299],
      hits,
    });
  }
  return {
    colliders: count,
    walkableRectangles: zones.length,
    queriesPerBatch: 128,
    attempts,
  };
}
const escape = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
function overlay() {
  const { walkable, solids } = fixture();
  const rect = (p: Piece, color: string) =>
    `<rect x="${p.bounds.minX}" y="${p.bounds.minZ}" width="${p.bounds.maxX - p.bounds.minX}" height="${p.bounds.maxZ - p.bounds.minZ}" fill="${color}" fill-opacity=".15" stroke="${color}" stroke-width=".035"><title>${escape(p.pieceId)}</title></rect>`;
  const poly = (s: RotatedSolid) =>
    `<polygon points="${solidCorners(s)
      .map((p) => `${p.x},${p.z}`)
      .join(
        ' '
      )}" fill="#475569" fill-opacity=".35" stroke="#334155" stroke-width=".08"/>`;
  const arc = Array.from({ length: 181 }, (_, i) => {
    const a = (i * Math.PI) / 360;
    return `${18 * Math.cos(a)},${18 * Math.sin(a)}`;
  }).join(' ');
  const actor = Array.from({ length: 8 }, (_, i) => {
    const a = ((10 + i * 10) * Math.PI) / 180;
    return `<circle cx="${18 * Math.cos(a)}" cy="${18 * Math.sin(a)}" r="${R}" fill="none" stroke="#047857" stroke-width=".08"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -10 78 74" width="1014" height="962" role="img" aria-labelledby="title desc"><title id="title">Synthetic rectangular collision feasibility</title><desc id="desc">Blue rectangles are actor-center walkable zones. Orange rectangles conservatively cover grey solids. Green circles show the 0.75 metre actor. Coordinates are synthetic, not a site layout.</desc><rect x="-3" y="-10" width="78" height="74" fill="#f8fafc"/><g font-family="sans-serif" font-size="1.1" fill="#172554"><text x="0" y="-7">Synthetic feasibility — not neighborhood activation</text><text x="0" y="-5">Blue: walkable center zones · Orange: solids · Green: actor radius</text><text x="0" y="25">Inner curve: 6.0 m authored width</text><text x="44" y="11">Rotated fence / 3.8 m opening</text><text x="40" y="61">Rotated closed-house frontage</text></g><polyline points="${arc}" fill="none" stroke="#cbd5e1" stroke-width="6"/>${[ROTATED_FRONTAGE, ...fenceOpening(Math.PI / 4)].map(poly).join('')}${walkable.map((p) => rect(p, '#2563eb')).join('')}${solids.map((p) => rect(p, '#c2410c')).join('')}${actor}<g transform="translate(52 26)"><path d="M-9 0 H14 M0-9 V9" fill="none" stroke="#cbd5e1" stroke-width="3.8"/><path d="M-9 0 H14 M0-9 V9" fill="none" stroke="#2563eb" stroke-opacity=".25" stroke-width="2.3"/><rect x="8" y="-4" width="6" height="8" fill="none" stroke="#7c3aed" stroke-dasharray=".3 .2" stroke-width=".08"/><rect x="8" y="1.9" width="6" height="1.1" fill="#c2410c" fill-opacity=".25"/><rect x="8" y="-3" width="6" height="1.1" fill="#c2410c" fill-opacity=".25"/><circle cx="12" cy="0" r=".75" fill="none" stroke="#047857" stroke-width=".08"/></g><text x="39" y="38" font-family="sans-serif" font-size="1.1" fill="#172554">Intersection / synthetic protected-stop approach</text></svg>`;
}
export function run(output: string) {
  const { walkable, solids } = fixture();
  const report = {
    schema: 1,
    captureCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    acceptedBaseCommit: execFileSync(
      'git',
      ['merge-base', 'HEAD', 'origin/main'],
      { encoding: 'utf8' }
    ).trim(),
    prototypeWorkingTreeDirty:
      execFileSync(
        'git',
        [
          'status',
          '--porcelain',
          '--untracked-files=all',
          '--',
          'src/tests/prototypes',
        ],
        { encoding: 'utf8' }
      ).trim().length > 0,
    prototypeHashes: Object.fromEntries(
      [
        'rectangularNeighborhood.ts',
        'neighborhoodFixtures.ts',
        'measureNeighborhood.ts',
      ].map((name) => [
        name,
        createHash('sha256')
          .update(readFileSync(join(__dirname, name)))
          .digest('hex'),
      ])
    ),
    environment: {
      node: process.version,
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model,
    },
    scope:
      'Synthetic, test-only feasibility; no live scene or low-end hardware qualification.',
    parameters: {
      ...GRID,
      actorRadius: R,
      physicalClearWidthRequirement: 3,
      collisionAllowance: 'Unconfirmed; sweep only, no acceptance claim',
    },
    curve: {
      authoredWidth: INNER_CURVE.width,
      walkableRectangleCount: walkable.length,
      conservativeRadialCenterStrip:
        INNER_CURVE.width - 2 * R - 2 * deviationBound(),
      ends: 'Actor-eroded sector endcaps; later route joins need independent union validation.',
    },
    fixtureSolidRectangleCount: solids.length,
    maxSolidBoundaryDeviation: maximumSolidDeviation(
      ROTATED_FRONTAGE,
      decomposeSolid(ROTATED_FRONTAGE)
    ),
    openings: [3, 3.2, 3.4, 3.8].flatMap((gap) =>
      [0, Math.PI / 7, Math.PI / 4].map((angle) => openingEvidence(angle, gap))
    ),
    cpu: [
      [32, 16],
      [128, 64],
      [256, 128],
      [256, 256],
      [512, 256],
      [1024, 512],
      [2048, 1024],
    ].map(([count, zones]) => timing(count, zones)),
  };
  mkdirSync(output, { recursive: true });
  writeFileSync(
    join(output, 'report.json'),
    JSON.stringify(report, null, 2) + '\n'
  );
  writeFileSync(join(output, 'overlay.svg'), overlay());
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
if (process.argv[1]?.endsWith('measureNeighborhood.ts')) {
  const output = process.argv[2];
  if (!output) throw new Error('Provide an explicit review-output directory.');
  run(output);
}
