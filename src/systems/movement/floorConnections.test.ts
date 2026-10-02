import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createFloorRegistry,
  type RuntimeFloor,
} from '../../scene/floors/floorRegistry';
import {
  getFloorTopElevation,
  type FloorId,
} from '../../scene/level/floorElevations';
import { createNavMesh } from '../navigation/navMesh';

import {
  createFloorConnectionController,
  type StairConnection,
} from './floorConnections';
import { computeStairLayout } from './stairLayout';
import { predictStairFloorId, sampleStairSurfaceHeight } from './stairs';

const floor = (
  id: FloorId,
  elevation = getFloorTopElevation(id)
): RuntimeFloor => {
  const plan = {
    outline: [] as Array<[number, number]>,
    rooms: [
      {
        id: `${id}Room`,
        name: id,
        ledColor: 0,
        bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
      },
    ],
  };
  return {
    id,
    elevation,
    plan,
    groups: [new Group()],
    lightingGroups: [new Group()],
    poiGroup: new Group(),
    structureGroup: new Group(),
    colliders: [],
    navMesh: createNavMesh(plan),
  };
};

const connection = (
  id: string,
  lowerFloorId: FloorId,
  upperFloorId: FloorId,
  direction: 1 | -1,
  centerX: number,
  lowerFloorElevation = getFloorTopElevation(lowerFloorId),
  upperFloorElevation = getFloorTopElevation(upperFloorId)
): StairConnection => {
  const layout = computeStairLayout({
    baseZ: -10.6,
    stepRun: 1.7,
    stepCount: 9,
    landingDepth: 5.2,
    direction: direction === 1 ? 'positiveZ' : 'negativeZ',
    guardMargin: 1.2,
    stairwellMargin: 0.8,
  });
  return {
    id,
    lowerFloorId,
    upperFloorId,
    lowerFloorElevation,
    upperFloorElevation,
    layout,
    geometry: {
      centerX,
      halfWidth: 3.1,
      bottomZ: -10.6,
      topZ: layout.topZ,
      landingMinZ: layout.landingMinZ,
      landingMaxZ: layout.landingMaxZ,
      totalRise: upperFloorElevation - lowerFloorElevation - 0.38,
      direction,
    },
    behavior: {
      transitionMargin: 1.2,
      landingTriggerMargin: 0.4,
      stepRise: 4.62 / 9,
      descentCorridorInset: 0.75,
    },
    groups: [new Group()],
    sources: {
      visual: `${id}.visual`,
      navigation: `${id}.navigation`,
      safety: [`${id}.lower.safety`, `${id}.upper.safety`],
    },
  };
};

const upstairs = connection('upstairs', 'ground', 'upper', -1, 12.4);
const basement = connection('basement-stairs', 'basement', 'ground', 1, -12.4);
const makeController = (initialFloorId: FloorId = 'ground') =>
  createFloorConnectionController({
    floors: createFloorRegistry([
      floor('basement'),
      floor('ground'),
      floor('upper'),
    ]),
    connections: [upstairs, basement],
    initialFloorId,
  });

describe('floor registry', () => {
  it('registers only built floors and rejects unknown/prototype IDs', () => {
    const registry = createFloorRegistry([floor('ground'), floor('upper')]);
    expect(registry.all().map((entry) => entry.id)).toEqual([
      'ground',
      'upper',
    ]);
    for (const id of ['basement', 'attic', 'toString', '__proto__']) {
      expect(() => registry.get(id)).toThrow(/Unknown or unbuilt floor/);
    }
    expect(() => getFloorTopElevation('toString')).toThrow(
      /Unknown floor elevation/
    );
    expect(() =>
      createFloorRegistry([floor('ground'), floor('ground')])
    ).toThrow(/Duplicate/);
  });

  it('reports negative elevation and detached read-only floor snapshots', () => {
    const registry = createFloorRegistry([floor('basement')]);
    const snapshot = registry.getSnapshot();
    expect(snapshot[0].elevation).toBe(-5);
    snapshot[0].navigation[0].minX = 99;
    snapshot[0].roomIds.push('not-a-room');
    expect(registry.getSnapshot()[0].navigation[0].minX).toBe(-100);
    expect(registry.getSnapshot()[0].roomIds).toEqual(['basementRoom']);
  });
});

describe('adjacent floor connections', () => {
  it('selects the correct local role on the shared ground floor', () => {
    const controller = makeController();
    const down = controller.preview(
      basement.geometry.centerX,
      basement.geometry.topZ - 0.6
    );
    expect(down).toMatchObject({
      floorId: 'basement',
      activeConnectionId: basement.id,
      descentOriginFloorId: 'ground',
      zone: 'explicitDescentCorridor',
    });
    const up = controller.preview(
      upstairs.geometry.centerX,
      upstairs.geometry.bottomZ - 1
    );
    expect(up).toMatchObject({
      floorId: 'ground',
      activeConnectionId: upstairs.id,
      descentOriginFloorId: null,
      zone: 'stairRampBody',
    });
    expect(controller.getState().activeConnectionId).toBeNull(); // Preview cannot mutate movement.
  });

  it('never chooses a nonadjacent connection at the same X/Z projection', () => {
    const controller = makeController('basement');
    const { centerX, topZ } = upstairs.geometry;
    expect(controller.preview(centerX, topZ)).toMatchObject({
      floorId: 'basement',
      activeConnectionId: null,
    });
    expect(controller.sampleHeight(centerX, topZ)).toBe(-5);
    controller.reset('upper');
    expect(
      controller.preview(
        basement.geometry.centerX,
        basement.geometry.topZ - 0.6
      )
    ).toMatchObject({ floorId: 'upper', activeConnectionId: null });
    expect(
      controller.sampleHeight(basement.geometry.centerX, basement.geometry.topZ)
    ).toBe(5);
  });

  it('retains every floor outside explicit transition zones', () => {
    const controller = makeController();
    for (const id of ['basement', 'ground', 'upper'] as const) {
      controller.reset(id);
      expect(controller.commitPosition(80, 80)).toMatchObject({
        floorId: id,
        activeConnectionId: null,
      });
      expect(controller.sampleHeight(80, 80)).toBe(getFloorTopElevation(id));
    }
  });

  it('rejects unregistered floor changes without modifying the current state', () => {
    const controller = makeController();
    expect(() => controller.reset('attic' as FloorId)).toThrow();
    expect(() => controller.preview(0, 0, 'toString' as FloorId)).toThrow();
    expect(() => controller.preview(NaN, 0)).toThrow(/Non-finite/);
    expect(controller.getState().floorId).toBe('ground');
  });

  it('rejects ambiguous overlapping corridors and inconsistent world elevations', () => {
    const floors = createFloorRegistry([
      floor('basement'),
      floor('ground'),
      floor('upper'),
    ]);
    const overlap = connection(
      'overlap',
      'basement',
      'ground',
      -1,
      upstairs.geometry.centerX
    );
    expect(() =>
      createFloorConnectionController({
        floors,
        connections: [upstairs, overlap],
        initialFloorId: 'ground',
      })
    ).toThrow(/Overlapping/);
    expect(() =>
      createFloorConnectionController({
        floors,
        connections: [{ ...basement, lowerFloorElevation: -10 }],
        initialFloorId: 'ground',
      })
    ).toThrow(/elevations/);
    expect(() =>
      createFloorConnectionController({
        floors,
        connections: [upstairs, { ...basement, sources: upstairs.sources }],
        initialFloorId: 'ground',
      })
    ).toThrow(/Duplicate connection source/);
  });

  it('returns detached deterministic debug snapshots for all connections', () => {
    const controller = makeController('basement');
    const first = controller.getSnapshot(0, 0);
    expect(
      first.connections.map((entry) => [entry.id, entry.adjacent])
    ).toEqual([
      ['upstairs', false],
      ['basement-stairs', true],
    ]);
    first.connections[0].geometry.centerX = 99;
    first.connections[0].sources.safety.push('changed');
    expect(controller.getSnapshot(0, 0).connections[0].geometry.centerX).toBe(
      12.4
    );
    expect(
      controller.getSnapshot(0, 0).connections[0].sources.safety
    ).toHaveLength(2);
  });
});

describe.each([1, -1] as const)(
  'connection-local traversal direction %s',
  (direction) => {
    describe.each([
      ['basement', 'ground', -5, 0],
      ['ground', 'upper', 7, 12],
    ] as const)(
      '%s to %s at world elevations %s / %s',
      (lowerId, upperId, lowerY, upperY) => {
        const stair = connection(
          'fixture',
          lowerId,
          upperId,
          direction,
          0,
          lowerY,
          upperY
        );
        const { geometry, behavior } = stair;
        const create = (initialFloorId: FloorId) =>
          createFloorConnectionController({
            floors: createFloorRegistry([
              floor(lowerId, lowerY),
              floor(upperId, upperY),
            ]),
            connections: [stair],
            initialFloorId,
          });

        it('ascends at exact lips then descends in slow bounded steps without floor flicker', () => {
          const controller = create(lowerId);
          const points = Array.from(
            { length: 308 },
            (_, index) => geometry.bottomZ + direction * index * 0.05
          );
          let previous = lowerY;
          let handoffs = 0;
          let previousFloor = lowerId as FloorId;
          for (const z of [
            ...points,
            geometry.topZ,
            geometry.topZ + direction * 0.1,
          ]) {
            const state = controller.commitPosition(0, z);
            const height = controller.sampleHeight(0, z);
            expect(Number.isFinite(height)).toBe(true);
            expect(height).toBeGreaterThanOrEqual(lowerY);
            expect(height).toBeLessThanOrEqual(upperY);
            expect(Math.abs(height - previous)).toBeLessThan(0.42);
            if (state.floorId !== previousFloor) handoffs += 1;
            previousFloor = state.floorId;
            previous = height;
          }
          expect(controller.getState().floorId).toBe(upperId);
          expect(handoffs).toBe(1);
          let descended = false;
          for (let index = 0; index <= 320; index += 1) {
            const z = geometry.topZ - direction * index * 0.05;
            const state = controller.commitPosition(0, z);
            const height = controller.sampleHeight(0, z);
            expect(Math.abs(height - previous)).toBeLessThan(0.1);
            if (state.floorId === lowerId) descended = true;
            if (descended) expect(state.floorId).toBe(lowerId);
            previous = height;
          }
          expect(descended).toBe(true);
          expect(controller.sampleHeight(0, geometry.bottomZ - direction)).toBe(
            lowerY
          );
        });

        it('retains descent origin during a slow reversal inside the lip blend', () => {
          const controller = create(upperId);
          let previous = upperY;
          for (const distance of [
            0.41, 0.46, 0.51, 0.56, 0.61, 0.56, 0.51, 0.46, 0.41, 0.36, 0.1, 0,
          ]) {
            const z = geometry.topZ - direction * distance;
            controller.commitPosition(0, z);
            const height = controller.sampleHeight(0, z);
            expect(Math.abs(height - previous)).toBeLessThan(0.12);
            previous = height;
          }
          expect(controller.getState()).toMatchObject({
            floorId: upperId,
            descentOriginFloorId: null,
          });
          expect(previous).toBe(upperY);
        });

        it('preserves upper floor for landing-edge, side, and back approaches', () => {
          const controller = create(upperId);
          for (const [x, z] of [
            [geometry.halfWidth - 0.1, geometry.topZ - direction * 0.7],
            [geometry.halfWidth + 0.3, (geometry.topZ + geometry.bottomZ) / 2],
            [0, geometry.bottomZ - direction * 0.5],
          ]) {
            expect(controller.commitPosition(x, z).floorId).toBe(upperId);
            expect(controller.sampleHeight(x, z)).toBe(upperY);
          }
          controller.reset(lowerId);
          expect(
            controller.sampleHeight(geometry.halfWidth + 1, geometry.topZ)
          ).toBe(lowerY);
          expect(
            controller.preview(geometry.halfWidth + 1, geometry.topZ).floorId
          ).toBe(lowerId);
          expect(behavior.descentCorridorInset).toBe(0.75);
        });
      }
    );
  }
);

describe('existing upstairs compatibility fixture', () => {
  it('matches the original helper floor and height decisions on and off the run', () => {
    const controller = makeController();
    for (const currentFloor of ['ground', 'upper'] as const) {
      for (const x of [7.4, 8.14, 12.4, 15.4, 17.4, 23]) {
        for (const z of [
          -33, -31, -26, -25.9, -25.5, -25.3, -25.1, -24.6, -18, -10.6, -9,
        ]) {
          controller.reset(currentFloor);
          expect(controller.preview(x, z).floorId).toBe(
            predictStairFloorId(
              upstairs.geometry,
              upstairs.behavior,
              x,
              z,
              currentFloor
            )
          );
          expect(controller.sampleHeight(x, z)).toBe(
            sampleStairSurfaceHeight({
              geometry: upstairs.geometry,
              behavior: upstairs.behavior,
              x,
              z,
              currentFloor,
              upperFloorElevation: 5,
            })
          );
        }
      }
    }
  });
});
