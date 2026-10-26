import { Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { PORTFOLIO_LEVEL } from '../../../scene/level/portfolioLevel';
import { houseShellGeometry, measureExteriorMassing } from '../grayboxMassing';
import {
  renderGraybox,
  withStableCapture,
  type CaptureIdentity,
} from '../measureGraybox';
import { maximumSolidDeviation } from '../measureNeighborhood';
import {
  buildGraybox,
  overlapViolations,
  offsetRoute,
  qualifyRoute,
  rectangleUnionArea,
} from '../neighborhoodGraybox';

vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
const layout = buildGraybox();
describe('review-only scaled neighborhood', () => {
  it('uses built rooms and generated walls, not yards or the protected-zone envelope', () => {
    const interior = PORTFOLIO_LEVEL.floors
      .filter((f) => f.id === 'ground' || f.id === 'upper')
      .flatMap((f) => f.rooms.filter((room) => room.category !== 'exterior'));
    expect(layout.mainHouse.rooms.map((room) => room.id).sort()).toEqual(
      interior.map((room) => room.sourceId).sort()
    );
    expect(
      layout.mainHouse.rooms.some((room) => room.id === 'ground.garage.room')
    ).toBe(true);
    const roomArea = rectangleUnionArea(
      interior.map((room) => ({
        minX: room.bounds.minX * FLOOR_PLAN_SCALE,
        maxX: room.bounds.maxX * FLOOR_PLAN_SCALE,
        minZ: room.bounds.minZ * FLOOR_PLAN_SCALE,
        maxZ: room.bounds.maxZ * FLOOR_PLAN_SCALE,
      }))
    );
    expect(layout.mainHouse.roomArea).toBeCloseTo(roomArea);
    expect(layout.mainHouse.roomArea).toBeGreaterThan(
      layout.mainHouse.groundRoomArea
    );
    expect(
      layout.mainHouse.rooms.some((room) => room.id === 'upper.focus_pods.room')
    ).toBe(true);
    expect(
      layout.mainHouse.wallSourceIds.some((id) => id.startsWith('upper.'))
    ).toBe(true);
    expect(layout.mainHouse.builtArea).toBeGreaterThan(roomArea);
    const protectedArea = rectangleUnionArea(
      layout.protectedRooms.map((room) => room.bounds)
    );
    expect(layout.mainHouse.builtArea).toBeLessThan(protectedArea * 0.75);
    expect(layout.mainHouse.bounds.maxX).toBeLessThan(layout.sidewalk.minX);
    expect(
      rectangleUnionArea([
        { minX: 0, maxX: 2, minZ: 0, maxZ: 2 },
        { minX: 1, maxX: 3, minZ: 1, maxZ: 3 },
      ])
    ).toBe(7);
  });
  it('keeps every varied exterior footprint comparable to the actual built house', () => {
    const sizes = new Set<string>();
    for (const lot of layout.lots) {
      const areaRatio =
        (lot.house.width * lot.house.depth) / layout.mainHouse.builtArea;
      expect(areaRatio).toBeGreaterThanOrEqual(0.9);
      expect(areaRatio).toBeLessThanOrEqual(1.1);
      for (const ratio of [
        lot.house.width / layout.mainHouse.width,
        lot.house.depth / layout.mainHouse.depth,
      ]) {
        expect(ratio).toBeGreaterThanOrEqual(0.85);
        expect(ratio).toBeLessThanOrEqual(1.15);
      }
      sizes.add(`${lot.house.width}:${lot.house.depth}`);
      expect(lot.house.width).toBeLessThan(lot.parcel.maxX - lot.parcel.minX);
      expect(lot.house.depth).toBeLessThan(lot.parcel.maxZ - lot.parcel.minZ);
    }
    expect(sizes.size).toBe(6);
  });
  it('models closed low-poly exterior shells whose triangle count does not scale with footprint', () => {
    const shell = houseShellGeometry(),
      positions = shell.getAttribute('position');
    const indices = shell.index!;
    expect(indices.count / 3).toBe(16);
    const edges = new Map<string, number>();
    let signedVolume = 0;
    for (let i = 0; i < indices.count; i += 3) {
      const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
      const [a, b, c] = ids.map((id) =>
        new Vector3().fromBufferAttribute(positions, id)
      );
      signedVolume += a.dot(b.cross(c)) / 6;
      for (let j = 0; j < 3; j++) {
        const key = [ids[j], ids[(j + 1) % 3]].sort((a, b) => a - b).join(':');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect(signedVolume).toBeCloseTo(1.15);
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    shell.scale(60, 6, 40);
    expect(shell.index!.count / 3).toBe(16);
    shell.dispose();
    const model = measureExteriorMassing(layout);
    expect(
      model.batches.find((batch) => batch.name === 'house-shells')
    ).toMatchObject({
      instances: 24,
      trianglesPerInstance: 16,
      submittedTriangles: 384,
    });
    expect(model.staticBaselineScenario.unbatchedDrawCallsWithinBudget).toBe(
      false
    );
    expect(model.staticBaselineScenario.frameTimeQualified).toBe(false);
  });
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
  it('frames every parcel corner in both review projections after resizing', () => {
    for (const isometric of [false, true]) {
      const svg = renderGraybox(layout, isometric);
      const [x, y, width, height] = svg
        .match(/viewBox="([^"]+)"/)![1]
        .split(' ')
        .map(Number);
      expect(svg).toContain('built home + garage');
      for (const lot of layout.lots) {
        for (const a of [lot.parcel.minX, lot.parcel.maxX])
          for (const b of [lot.parcel.minZ, lot.parcel.maxZ]) {
            const px = isometric ? ((a - b) * Math.sqrt(3)) / 2 : a;
            const py = isometric ? (a + b) / 2 : b;
            expect(px).toBeGreaterThan(x);
            expect(px).toBeLessThan(x + width);
            expect(py).toBeGreaterThan(y);
            expect(py).toBeLessThan(y + height);
          }
      }
    }
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
    for (const z of [layout.lines[0].a.z, layout.lines[0].b.z]) {
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
