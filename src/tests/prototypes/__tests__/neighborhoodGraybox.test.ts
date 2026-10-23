import { describe, expect, it, vi } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { withStableCapture, type CaptureIdentity } from '../measureGraybox';
import { maximumSolidDeviation } from '../measureNeighborhood';
import {
  buildGraybox,
  overlapViolations,
  offsetRoute,
  qualifyRoute,
} from '../neighborhoodGraybox';

vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
const layout = buildGraybox();
describe('review-only scaled neighborhood', () => {
  it('derives anchors from current source scale and measured exterior', () => {
    expect(layout.scale).toBe(FLOOR_PLAN_SCALE);
    const sidewalk = layout.audit.reservedRoutes.find(
      (r) => r.sourceId === 'ground.sidewalk.room'
    )!;
    expect(layout.sidewalk).toEqual(sidewalk.worldBounds);
    expect(
      layout.audit.anchors.some((a) => a.sourceId === 'ground.busStop.shelter')
    ).toBe(true);
  });
  it('has 24 unique nonoverlapping lots outside the protected parcel', () => {
    expect(layout.lots).toHaveLength(24);
    expect(new Set(layout.lots.map((l) => l.id)).size).toBe(24);
    expect(overlapViolations(layout)).toEqual([]);
    for (let side = 0; side < 4; side++)
      expect(layout.lots.filter((l) => l.side === side)).toHaveLength(6);
  });
  it('reports all decomposed rectangles, without a misleading global cap', () => {
    expect(layout.solids.length).toBe(
      layout.existingSolids.length +
        layout.housePieces.length +
        layout.fencePieces.length
    );
    expect(layout.zones.length).toBe(
      layout.baseZones.length +
        layout.curvePieces.length +
        layout.allLines.length
    );
    expect(layout.solids.length).toBeGreaterThan(256);
    expect(layout.zones.length).toBeGreaterThan(256);
  });
  for (const loop of layout.loops)
    for (const reverse of [false, true]) {
      it(`traverses joined ${loop.id} loop at run speed, reverse=${reverse}`, () => {
        expect(qualifyRoute(layout, loop.points, reverse)).toMatchObject({
          qualified: true,
          blocked: 0,
        });
      });
    }
  it('connects both loops through the shared cross street', () => {
    const a = layout.loops[0].lines[0],
      b = layout.loops[1].lines[2];
    expect(a.a.z).toBeCloseTo(0);
    expect(b.a.z).toBeCloseTo(0);
    expect(a.a.x).toBeCloseTo(b.b.x);
    expect(a.b.x).toBeCloseTo(b.a.x);
    expect(qualifyRoute(layout, [a.a, a.b]).qualified).toBe(true);
  });
  it('reports preserved sidewalk end gates as failed home connections', () => {
    expect(layout.boundaryGates.map((wall) => wall.sourceId).sort()).toEqual([
      'ground.sidewalk.end0',
      'ground.sidewalk.end1',
    ]);
    const x = layout.lines[0].a.x;
    const stop = layout.audit.anchors.find(
      (a) => a.sourceId === 'ground.busStop.shelter'
    )!;
    for (const z of [-125, 125]) {
      expect(
        qualifyRoute(layout, [
          { x, z: stop.world.z },
          { x, z },
        ]).qualified
      ).toBe(false);
    }
  });
  for (const loop of layout.loops)
    for (const offset of [-0.85, 0.85]) {
      it(`keeps a passing lane across ${loop.id} seams at offset ${offset}`, () => {
        const points = offsetRoute(loop.points, offset).filter(
          (_, i) => i % 8 === 0
        );
        expect(qualifyRoute(layout, points, offset < 0, 4).qualified).toBe(
          true
        );
      });
    }
  it('rejects an obstructed join and a route with its navigation removed', () => {
    const line = layout.loops[0].lines[0];
    const x = (line.a.x + line.b.x) / 2;
    const blocked = {
      ...layout,
      solids: [
        ...layout.solids,
        { minX: x - 1, maxX: x + 1, minZ: -5, maxZ: 5 },
      ],
    };
    expect(qualifyRoute(blocked, [line.a, line.b]).qualified).toBe(false);
    expect(
      qualifyRoute({ ...layout, zones: [] }, [line.a, line.b]).qualified
    ).toBe(false);
  });
  it('keeps the centre and both passing lanes through all 24 lot approaches', () => {
    for (const lot of layout.lots) {
      const sign = Math.sign(lot.path.b.x - lot.path.a.x);
      for (const offset of [-0.85, 0, 0.85]) {
        const points = [
          { x: lot.door.x + sign * 0.95, z: lot.door.z + offset },
          { ...lot.path.b, z: lot.path.b.z + offset },
        ];
        expect(qualifyRoute(layout, points, false, 4).qualified).toBe(true);
      }
    }
  });
  it('binds capture identity before measurement and rejects changes before output', () => {
    const stable: CaptureIdentity = {
      base: 'revision-a',
      dirty: '',
      sourceHashes: [{ path: 'fixture.ts', sha256: 'hash-a' }],
    };
    const action = vi.fn(() => 42);
    expect(withStableCapture(() => stable, action).result).toBe(42);
    for (const changed of [
      { ...stable, base: 'revision-b' },
      { ...stable, dirty: ' M fixture.ts' },
      { ...stable, sourceHashes: [{ path: 'fixture.ts', sha256: 'hash-b' }] },
    ]) {
      let reads = 0;
      expect(() =>
        withStableCapture(() => (reads++ === 0 ? stable : changed), action)
      ).toThrow('changed during measurement');
    }
    action.mockClear();
    expect(() =>
      withStableCapture(() => ({ ...stable, dirty: '?? fixture.ts' }), action)
    ).toThrow('clean repository');
    expect(action).not.toHaveBeenCalled();
  });
  it('measures full fence strips and every solid against the provisional allowance', () => {
    const pieces = [...layout.housePieces, ...layout.fencePieces];
    for (const lot of layout.lots) {
      for (const shape of [lot.house, ...lot.fences]) {
        expect(
          maximumSolidDeviation(
            shape,
            pieces.filter((p) => p.sourceId === shape.sourceId)
          )
        ).toBeLessThanOrEqual(0.2);
      }
      if (!lot.fences.length) continue;
      const [a, b] = lot.fences.map((f) =>
        pieces.filter((p) => p.sourceId === f.sourceId)
      );
      const width =
        Math.min(...b.map((p) => p.bounds.minZ)) -
        Math.max(...a.map((p) => p.bounds.maxZ));
      expect(width).toBeGreaterThanOrEqual(3.2);
    }
  });
});
