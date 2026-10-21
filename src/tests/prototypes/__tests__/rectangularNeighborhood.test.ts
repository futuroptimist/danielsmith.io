import { describe, expect, it } from 'vitest';

import { AVATAR_COLLISION_RADIUS as R } from '../../../scene/units';
import { collidesWithColliders } from '../../../systems/collision';
import { AVATAR_RUN_SPEED } from '../../../systems/movement/avatarGait';
import { planMovementSubsteps } from '../../../systems/movement/movementSubsteps';
import {
  fenceOpening,
  fixture,
  INNER_CURVE,
  move,
  navFrom,
  ROTATED_FRONTAGE,
} from '../neighborhoodFixtures';
import {
  arcContainsDisk,
  corners,
  decomposeArc,
  decomposeSolid,
  deviationBound,
  GRID,
  solidCorners,
  type RotatedSolid,
} from '../rectangularNeighborhood';

const field = navFrom([{ minX: -100, maxX: 100, minZ: -100, maxZ: 100 }]);
function local(s: RotatedSolid, x: number, z: number) {
  return {
    x: s.center.x + x * Math.cos(s.angle) - z * Math.sin(s.angle),
    z: s.center.z + x * Math.sin(s.angle) + z * Math.cos(s.angle),
  };
}
describe('isolated rectangular neighborhood feasibility', () => {
  it('fits the proposed candidate and geometric-deviation ceilings', () => {
    const current = fixture();
    expect(current.solids.length + 2).toBeLessThanOrEqual(256);
    expect(current.walkable.length + 3).toBeLessThanOrEqual(256);
    expect(deviationBound()).toBeLessThanOrEqual(0.18);
  });
  it('has one connected walkable union with overlapping row seams', () => {
    const pieces = decomposeArc(INNER_CURVE).map((p) => p.bounds);
    const nav = navFrom(pieces),
      visited = new Set([0]),
      pending = [0];
    while (pending.length) {
      const a = pieces[pending.pop()!];
      for (let index = 0; index < pieces.length; index++) {
        if (visited.has(index)) continue;
        const b = pieces[index],
          minX = Math.max(a.minX, b.minX),
          maxX = Math.min(a.maxX, b.maxX),
          minZ = Math.max(a.minZ, b.minZ),
          maxZ = Math.min(a.maxZ, b.maxZ);
        if (maxX > minX && maxZ > minZ) {
          expect(nav.contains((minX + maxX) / 2, (minZ + maxZ) / 2)).toBe(true);
          visited.add(index);
          pending.push(index);
        }
      }
    }
    expect(visited.size).toBe(pieces.length);
  });
  it('is deterministic, source-owned and bounded before expensive enumeration', () => {
    const a = decomposeArc(INNER_CURVE),
      b = decomposeArc(INNER_CURVE);
    expect(a).toEqual(b);
    expect(new Set(a.map((p) => p.pieceId)).size).toBe(a.length);
    expect(a.every((p) => p.sourceId === INNER_CURVE.sourceId)).toBe(true);
    expect(a.length).toBeLessThan(512);
    expect(() => decomposeArc(INNER_CURVE, { ...GRID, maxCells: 10 })).toThrow(
      'cell budget'
    );
    expect(() =>
      decomposeArc(INNER_CURVE, { ...GRID, maxRectangles: 1 })
    ).toThrow('Rectangle budget');
    expect(() =>
      decomposeArc(INNER_CURVE, { ...GRID, maxCells: 262145 })
    ).toThrow('Invalid bounded grid');
    expect(() =>
      decomposeSolid(ROTATED_FRONTAGE, { ...GRID, maxRectangles: 513 })
    ).toThrow('Invalid bounded grid');
    expect(() => decomposeArc({ ...INNER_CURVE, width: 2 * R })).toThrow();
    expect(() => decomposeSolid({ ...ROTATED_FRONTAGE, angle: NaN })).toThrow();
    expect(() =>
      decomposeSolid({ ...ROTATED_FRONTAGE, center: { x: 1e16, z: 0 } })
    ).toThrow('Unsafe grid index');
    expect(() =>
      decomposeSolid(ROTATED_FRONTAGE, { ...GRID, cellSize: 0 })
    ).toThrow();
  });
  it.each([
    { axis: 'x', center: { x: 1e14, z: 0 }, width: 1e-6, depth: 1 },
    { axis: 'z', center: { x: 0, z: 1e14 }, width: 1, depth: 1e-6 },
  ])(
    'rejects precision-collapsed $axis extents before iteration',
    ({ center, width, depth }) => {
      // Keep the other axis small so a regression fails quickly rather than hanging a worker.
      expect(() =>
        decomposeSolid({ ...ROTATED_FRONTAGE, center, width, depth, angle: 0 })
      ).toThrow('Collapsed grid extent');
    }
  );
  it('keeps the full actor disk inside the curve, including inner concave edges', () => {
    const pieces = decomposeArc(INNER_CURVE);
    for (const piece of pieces) {
      const b = piece.bounds;
      for (let i = 0; i <= 4; i++)
        for (let j = 0; j <= 4; j++) {
          const p = {
            x: b.minX + ((b.maxX - b.minX) * i) / 4,
            z: b.minZ + ((b.maxZ - b.minZ) * j) / 4,
          };
          expect(arcContainsDisk(INNER_CURVE, p, R)).toBe(true);
          // Independent physical-boundary oracle samples the actor circumference.
          for (let k = 0; k < 24; k++) {
            const x = p.x + R * Math.cos((k * Math.PI) / 12),
              z = p.z + R * Math.sin((k * Math.PI) / 12);
            expect(Math.hypot(x, z)).toBeGreaterThanOrEqual(15 - 1e-10);
            expect(Math.hypot(x, z)).toBeLessThanOrEqual(21 + 1e-10);
            expect(Math.min(x, z)).toBeGreaterThanOrEqual(-1e-10);
          }
        }
    }
  });
  it.each([-1.5, 0, 1.5])(
    'traverses both directions across inner-curve seams at offset %s',
    (offset) => {
      const nav = navFrom(decomposeArc(INNER_CURVE).map((p) => p.bounds));
      for (const reverse of [false, true]) {
        const radius = INNER_CURVE.radius + offset;
        const angles = Array.from(
          { length: 241 },
          (_, i) => ((10 + (70 * i) / 240) * Math.PI) / 180
        );
        if (reverse) angles.reverse();
        let p = {
          x: radius * Math.cos(angles[0]),
          z: radius * Math.sin(angles[0]),
        };
        for (const theta of angles.slice(1)) {
          const target = {
            x: radius * Math.cos(theta),
            z: radius * Math.sin(theta),
          };
          expect(nav.contains(target.x, target.z)).toBe(true);
          p = move(p, { x: target.x - p.x, z: target.z - p.z }, nav, []);
          expect(Math.hypot(p.x - target.x, p.z - target.z)).toBeLessThan(1e-8);
        }
      }
    }
  );
  it.each([0, Math.PI / 7, Math.PI / 4, Math.PI / 2, -Math.PI / 3])(
    'covers rotated solids and corners at %s radians',
    (angle) => {
      const s = { ...ROTATED_FRONTAGE, angle },
        pieces = decomposeSolid(s),
        nav = navFrom(pieces.map((p) => p.bounds));
      for (let x = -6; x <= 6; x += 0.2)
        for (let z = -4; z <= 4; z += 0.2) {
          const p = local(s, x, z);
          expect(nav.contains(p.x, p.z)).toBe(true);
          expect(
            collidesWithColliders(
              p.x,
              p.z,
              R,
              pieces.map((p) => p.bounds)
            )
          ).toBe(true);
        }
      for (const p of solidCorners(s))
        expect(nav.contains(p.x, p.z)).toBe(true);
      // Every emitted rectangle corner stays within the analytical overcoverage cap.
      for (const piece of pieces)
        for (const p of corners(piece.bounds)) {
          const dx = p.x - s.center.x,
            dz = p.z - s.center.z;
          const x = dx * Math.cos(angle) + dz * Math.sin(angle),
            z = -dx * Math.sin(angle) + dz * Math.cos(angle);
          const distance = Math.hypot(
            Math.max(0, Math.abs(x) - 6),
            Math.max(0, Math.abs(z) - 4)
          );
          expect(distance).toBeLessThanOrEqual(deviationBound() + 1e-9);
        }
    }
  );
  it.each([0, Math.PI / 7, Math.PI / 4])(
    'crosses a fence opening with actor clearance at %s',
    (angle) => {
      const fences = fenceOpening(angle),
        solids = fences.flatMap((s) => decomposeSolid(s).map((p) => p.bounds));
      const projected = fences.map((fence) =>
        decomposeSolid(fence).flatMap((piece) =>
          corners(piece.bounds).map(
            (point) =>
              (point.x - 60) * Math.cos(angle) + point.z * Math.sin(angle)
          )
        )
      );
      // Physical clearance is independent of the still-unapproved allowance.
      expect(
        Math.min(...projected[1]) - Math.max(...projected[0])
      ).toBeGreaterThanOrEqual(3.0);
      const center = { ...fences[0], center: { x: 60, z: 0 } };
      // Two actors on parallel lanes (1.5 m center separation), both directions.
      for (const offset of [-0.75, 0.75])
        for (const direction of [-1, 1]) {
          let p = local(center, offset, -3 * direction);
          for (let i = 1; i <= 60; i++) {
            const target = local(center, offset, (-3 + i / 10) * direction);
            p = move(
              p,
              { x: target.x - p.x, z: target.z - p.z },
              field,
              solids
            );
            expect(Math.hypot(p.x - target.x, p.z - target.z)).toBeLessThan(
              1e-8
            );
          }
        }
    }
  );
  it.each([0.016, 0.1, 0.25, 1, 10])(
    'does not tunnel through thin rotated fences at frame %s s',
    (dt) => {
      for (const angle of [0, Math.PI / 4, Math.PI / 2]) {
        const s = {
          sourceId: 'synthetic.barrier',
          center: { x: 0, z: 0 },
          width: 40,
          depth: 0.1,
          angle,
        };
        const solids = decomposeSolid(s).map((p) => p.bounds),
          start = local(s, 0, -2);
        const distance = AVATAR_RUN_SPEED * dt;
        const delta = {
          x: -Math.sin(angle) * distance,
          z: Math.cos(angle) * distance,
        };
        let p = start;
        // Small dt cases must actually reach the barrier, not pass vacuously.
        for (let frame = 0; frame < Math.ceil(4 / distance); frame++) {
          p = move(p, delta, field, solids);
        }
        const normal = p.x * -Math.sin(angle) + p.z * Math.cos(angle);
        expect(normal).toBeLessThan(-0.1 / 2);
        expect(collidesWithColliders(p.x, p.z, R, solids)).toBe(false);
      }
      const plan = planMovementSubsteps(AVATAR_RUN_SPEED * dt, 0, R / 2);
      expect(plan.count).toBeLessThanOrEqual(64);
      expect(Math.hypot(plan.stepX, plan.stepZ)).toBeLessThanOrEqual(
        R / 2 + 1e-9
      );
    }
  );
  it('rejects a sub-diameter opening despite point containment', () => {
    const solids = fenceOpening(Math.PI / 4, 1.4).flatMap((s) =>
      decomposeSolid(s).map((p) => p.bounds)
    );
    expect(field.contains(60, 0)).toBe(true);
    expect(collidesWithColliders(60, 0, R, solids)).toBe(true);
  });
  it('connects a synthetic intersection and protected-stop approach', () => {
    // Explicitly synthetic: these rectangles are not the existing stop or parcel audit.
    const physicalWidth = 3.8;
    const half = physicalWidth / 2 - R;
    const nav = navFrom([
      { minX: -10, maxX: 10, minZ: -half, maxZ: half },
      { minX: -half, maxX: half, minZ: -10, maxZ: 10 },
      { minX: 8, maxX: 14, minZ: -half, maxZ: half },
    ]);
    const solids = [
      { minX: 8, maxX: 14, minZ: physicalWidth / 2, maxZ: 3 },
      { minX: 8, maxX: 14, minZ: -3, maxZ: -physicalWidth / 2 },
    ];
    for (const points of [
      [
        { x: -8, z: 0 },
        { x: 0, z: 0 },
        { x: 0, z: 8 },
      ],
      [
        { x: 0, z: -8 },
        { x: 0, z: 0 },
        { x: 12, z: 0 },
      ],
    ]) {
      let p = points[0];
      for (const target of points.slice(1)) {
        p = move(p, { x: target.x - p.x, z: target.z - p.z }, nav, solids);
        expect(p.x).toBeCloseTo(target.x, 8);
        expect(p.z).toBeCloseTo(target.z, 8);
      }
    }
    expect(nav.contains(0.9, 0.9)).toBe(true);
    const diagonal = move(
      { x: -0.9, z: -0.9 },
      { x: 1.8, z: 1.8 },
      nav,
      solids
    );
    expect(diagonal.x).toBeCloseTo(0.9, 10);
    expect(diagonal.z).toBeCloseTo(0.9, 10);
  });
});
