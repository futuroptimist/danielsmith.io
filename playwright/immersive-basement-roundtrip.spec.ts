import { mkdir, writeFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import type { PortfolioApi } from '../src/app/portfolioApi';
import { UPPER_FLOOR_PLAN } from '../src/assets/floorPlan';
import type { FloorId } from '../src/scene/level/floorElevations';

const URL = '/?mode=immersive&disablePerformanceFailover=1';
const SPAWN = { x: 0, z: -20 };
const LANDING = { x: 3.8, z: -11 };
const TOE = { x: 3.8, z: -32.5 };
const GROUND_TO_UPPER = [
  SPAWN,
  { x: -15, z: -20 },
  { x: -15, z: -7.1 },
  { x: -14.7, z: -7.1 },
  { x: -14.7, z: -6.8 },
  { x: -10.2, z: -6.8 },
  { x: -10.2, z: -5 },
  { x: -9.9, z: -5 },
  { x: -9.9, z: -4.7 },
  { x: -8.7, z: -4.7 },
  { x: -8.7, z: -4.4 },
  { x: -5.1, z: -4.4 },
  { x: -5.1, z: 0.7 },
  { x: -4.8, z: 0.7 },
  { x: -4.8, z: 1 },
  { x: 1.2, z: 1 },
  { x: 1.2, z: -1.1 },
  { x: 12.3, z: -1.1 },
  { x: 12.3, z: -10.1 },
  { x: 12.4, z: -10.3 },
];

async function ready(page: Page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.appMode === 'immersive' &&
      !!window.portfolio?.world,
    undefined,
    { timeout: 45_000 }
  );
  const safe = page.getByRole('button', {
    name: 'Continue in safe immersive',
    exact: true,
  });
  if (await safe.isVisible()) await safe.click();
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function walk(
  page: Page,
  points: { x: number; z: number }[],
  maxStep = 0.1,
  requiredFloor?: FloorId
) {
  return page.evaluate(
    async ({ points, maxStep, requiredFloor }) => {
      const p = window.portfolio as PortfolioApi;
      const w = p.world!;
      let previous = w.getPlayerPosition();
      let maxHeightChange = 0;
      let count = 0;
      const floors: string[] = [w.getActiveFloor()];
      const zones = new Set<string>();
      const connections = new Set<string>();
      for (const target of points) {
        let reached = false;
        for (let index = 0; index < 3000; index++) {
          const position = w.getPlayerPosition();
          const dx = Math.max(
            -maxStep,
            Math.min(maxStep, target.x - position.x)
          );
          const dz = Math.max(
            -maxStep,
            Math.min(maxStep, target.z - position.z)
          );
          if (Math.abs(dx) < 0.0001 && Math.abs(dz) < 0.0001) {
            reached = true;
            break;
          }
          const step = w.stepPlayerForTest({ dx, dz });
          if ((dx && !step.movedX) || (dz && !step.movedZ)) {
            throw new Error(
              `Blocked toward ${JSON.stringify(target)}: ${JSON.stringify(step)}`
            );
          }
          if (requiredFloor && step.activeFloor !== requiredFloor) {
            throw new Error(
              `Floor changed during same-floor path: ${JSON.stringify(step)}`
            );
          }
          const state = w.getFloorConnectionSnapshot();
          const visibility = w.getFloorVisibilitySnapshot();
          if (
            state.floorId !== step.activeFloor ||
            visibility.activeFloorId !== step.activeFloor
          ) {
            throw new Error(
              'Collision, connection, and visual floor disagreed'
            );
          }
          const visibleFloors = visibility.floors.filter(
            (floor) => floor.visible
          );
          if (
            visibleFloors.length !== 1 ||
            visibleFloors[0].id !== step.activeFloor
          ) {
            throw new Error(
              `Wrong visible floors: ${JSON.stringify(visibleFloors)}`
            );
          }
          for (const connection of visibility.connections) {
            if (connection.visible !== connection.adjacent)
              throw new Error('Unrelated stairs visible');
          }
          if (
            !Number.isFinite(step.position.y) ||
            step.position.y < -5.001 ||
            step.position.y > 5.001
          ) {
            throw new Error('Unbounded avatar height');
          }
          maxHeightChange = Math.max(
            maxHeightChange,
            Math.abs(step.position.y - previous.y)
          );
          previous = step.position;
          if (floors.at(-1) !== step.activeFloor) floors.push(step.activeFloor);
          zones.add(state.zone);
          if (state.activeConnectionId)
            connections.add(state.activeConnectionId);
          count++;
          if (count % 30 === 0)
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (!reached)
          throw new Error(`Unreached waypoint ${JSON.stringify(target)}`);
      }
      return {
        count,
        maxHeightChange,
        floors,
        zones: [...zones],
        connections: [...connections],
        position: w.getPlayerPosition(),
        floor: w.getActiveFloor(),
        coordinates: p.debugCoordinates!.getState(),
      };
    },
    { points, maxStep, requiredFloor }
  );
}

async function upperRoomPath(page: Page, target: { x: number; z: number }) {
  const path = await page.evaluate(
    ({ target }) => {
      const w = (window.portfolio as PortfolioApi).world!;
      const start = w.getPlayerPosition();
      const grid = 0.5;
      const queue = [{ x: start.x, z: start.z, parent: -1 }];
      const visited = new Set(['0,0']);
      let found = -1;
      for (let index = 0; index < queue.length && index < 20000; index++) {
        const point = queue[index];
        if (Math.hypot(point.x - target.x, point.z - target.z) < 0.6) {
          found = index;
          break;
        }
        for (const [dx, dz] of [
          [grid, 0],
          [-grid, 0],
          [0, grid],
          [0, -grid],
        ]) {
          const next = { x: point.x + dx, z: point.z + dz, parent: index };
          const key = `${Math.round((next.x - start.x) / grid)},${Math.round((next.z - start.z) / grid)}`;
          if (visited.has(key)) continue;
          visited.add(key);
          let clear = true;
          for (let sub = 1; sub <= 5; sub++) {
            const sample = {
              x: point.x + (dx * sub) / 5,
              z: point.z + (dz * sub) / 5,
              floorId: 'upper' as const,
            };
            if (
              !w.canOccupyPosition(sample) ||
              w.predictFloorAt({ ...sample, currentFloor: 'upper' }) !== 'upper'
            ) {
              clear = false;
              break;
            }
          }
          if (clear) queue.push(next);
        }
      }
      if (found < 0)
        throw new Error(`No upper route to ${JSON.stringify(target)}`);
      const path = [];
      for (let index = found; index >= 0; index = queue[index].parent)
        path.push(queue[index]);
      return path.reverse();
    },
    { target }
  );
  return walk(page, path, 0.1, 'upper');
}

async function checkpoint(page: Page, name: string) {
  await page.waitForTimeout(600);
  const snapshot = await page.evaluate(() => {
    const p = window.portfolio as PortfolioApi;
    return {
      floor: p.world!.getActiveFloor(),
      position: p.world!.getPlayerPosition(),
      camera: p.world!.getCameraState(),
      visibility: p.world!.getFloorVisibilitySnapshot(),
      renderer: p.performance?.getSnapshot().renderer,
    };
  });
  await mkdir(test.info().outputDir, { recursive: true });
  await writeFile(
    test.info().outputPath(`${name}.json`),
    JSON.stringify(snapshot, null, 2)
  );
  await test.info().attach(`${name}.json`, {
    body: JSON.stringify(snapshot, null, 2),
    contentType: 'application/json',
  });
  await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
  expect(snapshot.camera.focus.y).toBeCloseTo(snapshot.position.y + 0.75, 1);
  return snapshot;
}

test('walks fresh spawn through basement and every upper room, then reverses the journey', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await ready(page);
  const spawn = await checkpoint(page, 'fresh-spawn');
  expect(spawn.position).toMatchObject({ x: 0, y: 0 });
  expect(spawn.camera.cutawaySourceIds).toEqual([]);
  await walk(page, [{ x: 0, z: -11 }, LANDING]);
  const landing = await checkpoint(page, 'ground-landing-cutaway');
  expect(landing.camera.cutawaySourceIds).toEqual([
    'ground.living_room.north_wall',
  ]);
  const down = await walk(page, [TOE]);
  expect(down.floors).toEqual(['ground', 'basement']);
  expect(down.connections).toEqual(['basement-ground']);
  expect(down.zones).toContain('explicitDescentCorridor');
  expect(down.maxHeightChange).toBeLessThan(0.55);
  expect(down.coordinates.currentRoomId).toBe('careerMuseum');
  await checkpoint(page, 'basement-lower-toe');
  const museumLoop = [
    { x: -3, z: -32.5 },
    { x: -18, z: -32.5 },
    { x: -18, z: -15.5 },
    { x: -18, z: 4.5 },
    { x: 20, z: 4.5 },
    { x: 20, z: -17.5 },
    { x: 20, z: -32.5 },
    TOE,
  ];
  await walk(page, museumLoop, 0.12, 'basement');
  await walk(page, [LANDING, { x: 0, z: -11 }, SPAWN]);
  await walk(page, GROUND_TO_UPPER, 0.12, 'ground');
  const m = await page.evaluate(() =>
    window.portfolio!.world!.getStairMetrics()
  );
  await walk(page, [{ x: m.stairCenterX, z: m.stairTopZ - 0.05 }]);
  const lane = m.stairCenterX - m.stairHalfWidth + 0.75 * 0.75;
  const egress = [
    { x: lane, z: m.stairTopZ - 0.05 },
    { x: lane, z: -29 },
    { x: 3.25, z: -29 },
    { x: -8, z: -29 },
    { x: -8, z: -16 },
  ];
  await walk(page, egress, 0.12, 'upper');
  for (const id of ['loftLibrary', 'focusPods', 'creatorsStudio']) {
    const room = UPPER_FLOOR_PLAN.rooms.find((entry) => entry.id === id)!;
    const route = await upperRoomPath(page, {
      x: (room.bounds.minX + room.bounds.maxX) / 2,
      z: (room.bounds.minZ + room.bounds.maxZ) / 2,
    });
    expect(route.coordinates.currentRoomId).toBe(id);
    await checkpoint(page, `upper-${id}`);
  }
  await upperRoomPath(page, { x: -8, z: -16 });
  await walk(page, [...egress].reverse(), 0.12, 'upper');
  await walk(page, [
    { x: m.stairCenterX, z: m.stairTopZ - 0.05 },
    GROUND_TO_UPPER.at(-1)!,
  ]);
  await walk(page, [...GROUND_TO_UPPER].reverse(), 0.12, 'ground');
  // Repeat the upper-room circuit in the opposite order before reversing the
  // museum loop, so both halves of the complete house journey are bidirectional.
  await walk(page, GROUND_TO_UPPER, 0.12, 'ground');
  await walk(page, [{ x: m.stairCenterX, z: m.stairTopZ - 0.05 }]);
  await walk(page, egress, 0.12, 'upper');
  for (const id of ['focusPods', 'loftLibrary', 'creatorsStudio']) {
    const room = UPPER_FLOOR_PLAN.rooms.find((entry) => entry.id === id)!;
    const route = await upperRoomPath(page, {
      x: (room.bounds.minX + room.bounds.maxX) / 2,
      z: (room.bounds.minZ + room.bounds.maxZ) / 2,
    });
    expect(route.coordinates.currentRoomId).toBe(id);
  }
  await upperRoomPath(page, { x: -8, z: -16 });
  await walk(page, [...egress].reverse(), 0.12, 'upper');
  await walk(page, [
    { x: m.stairCenterX, z: m.stairTopZ - 0.05 },
    GROUND_TO_UPPER.at(-1)!,
  ]);
  await walk(page, [...GROUND_TO_UPPER].reverse(), 0.12, 'ground');
  await walk(page, [{ x: 0, z: -11 }, LANDING, TOE]);
  await walk(page, [...museumLoop].reverse(), 0.12, 'basement');
  await walk(page, [TOE, LANDING, { x: 0, z: -11 }, SPAWN]);
  const returned = await checkpoint(page, 'returned-spawn');
  expect(returned.floor).toBe('ground');
  expect(returned.position.y).toBe(0);
  expect(returned.camera.zoom).toBe(spawn.camera.zoom);
  expect(returned.camera.cutawaySourceIds).toEqual([]);
});

test('completes ten consecutive round trips with slow diagonal lips, stops and reversals', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await ready(page);
  await walk(page, [{ x: 0, z: -11 }, LANDING]);
  for (let trip = 0; trip < 10; trip++) {
    await walk(
      page,
      [
        { x: 3.8, z: -14.1 },
        { x: 4, z: -14.75 },
      ],
      0.035
    );
    await page.waitForTimeout(40);
    await walk(page, [{ x: 3.8, z: -14.1 }], 0.035);
    const down = await walk(page, [{ x: 3.7, z: -14.8 }, TOE], 0.07);
    expect(down.floor).toBe('basement');
    expect(down.position.y).toBe(-5);
    expect(down.maxHeightChange).toBeLessThan(0.55);
    await walk(
      page,
      [
        { x: 3.9, z: -29.2 },
        { x: 3.8, z: -29.6 },
      ],
      0.03,
      'basement'
    );
    await page.waitForTimeout(40);
    const up = await walk(page, [LANDING], 0.07);
    expect(up.floors).toEqual(['basement', 'ground']);
    expect(up.maxHeightChange).toBeLessThan(0.55);
    expect(up.position.y).toBe(0);
  }
  await checkpoint(page, 'ten-roundtrips-ground');
});

test('preserves both stair handoffs through coarse slow-frame displacements', async ({
  page,
}) => {
  await ready(page);
  const results = await page.evaluate(() => {
    const w = window.portfolio!.world!;
    const results = [];
    for (const connection of w.getFloorConnectionSnapshot().connections) {
      for (const delta of [0.15, 0.16, 0.35]) {
        const g = connection.geometry;
        const upperZ = g.topZ + g.direction * 3;
        const lowerZ = g.bottomZ - g.direction * 2;
        // Each isolated fixture starts at a real landing. All crossings below
        // use the same runtime collision path as keyboard and touch movement.
        w.movePlayerTo({
          x: g.centerX,
          z: upperZ,
          floorId: connection.upperFloorId,
        });
        for (const target of [lowerZ, upperZ]) {
          const startFloor = w.getActiveFloor();
          const expectedFloor =
            target === lowerZ
              ? connection.lowerFloorId
              : connection.upperFloorId;
          const expectedY =
            target === lowerZ
              ? connection.lowerFloorElevation
              : connection.upperFloorElevation;
          const direction = Math.sign(target - w.getPlayerPosition().z);
          let velocity = 0;
          const floors = [startFloor];
          const samples = [];
          for (let frame = 0; frame < 80; frame++) {
            const before = w.getPlayerPosition();
            const remaining = Math.abs(target - before.z);
            if (remaining < 0.0001) break;
            // Match the runtime's speed and damped acceleration. At 150/160 ms,
            // endpoint-only movement skipped the entire intentional descent lip.
            velocity += (12 - velocity) * (1 - Math.exp(-8 * delta));
            const step = w.stepPlayerForTest({
              dx: 0,
              dz: direction * Math.min(velocity * delta, remaining),
            });
            if (!step.movedZ)
              throw new Error(
                `Coarse crossing blocked: ${JSON.stringify(step)}`
              );
            if (floors.at(-1) !== step.activeFloor)
              floors.push(step.activeFloor);
            const state = w.getFloorConnectionSnapshot();
            const visibility = w.getFloorVisibilitySnapshot();
            if (
              state.floorId !== step.activeFloor ||
              visibility.activeFloorId !== step.activeFloor
            )
              throw new Error('Coarse crossing floor/visibility disagreement');
            if (
              step.position.y < connection.lowerFloorElevation - 0.001 ||
              step.position.y > connection.upperFloorElevation + 0.001
            )
              throw new Error('Coarse crossing escaped its floor elevations');
            samples.push({ ...step.position, floor: step.activeFloor });
          }
          results.push({
            id: connection.id,
            delta,
            target,
            startFloor,
            expectedFloor,
            expectedY,
            floors,
            samples,
            position: w.getPlayerPosition(),
            floor: w.getActiveFloor(),
          });
        }
      }
    }
    return results;
  });
  await mkdir(test.info().outputDir, { recursive: true });
  await writeFile(
    test.info().outputPath('coarse-frame-crossings.json'),
    JSON.stringify(results, null, 2)
  );
  await test.info().attach('coarse-frame-crossings.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  for (const result of results) {
    expect(result.floor, JSON.stringify(result)).toBe(result.expectedFloor);
    expect(result.floors).toEqual([result.startFloor, result.expectedFloor]);
    expect(result.position.z).toBeCloseTo(result.target, 5);
    expect(result.position.y).toBeCloseTo(result.expectedY, 5);
  }
});

test('blocks coarse displacements through side and back stair rails', async ({
  page,
}) => {
  await ready(page);
  const fixtures = [
    { floorId: 'ground' as const, x: 0, z: -20, dx: 12, dz: 0 },
    { floorId: 'ground' as const, x: 8, z: -20, dx: -12, dz: 0 },
    { floorId: 'basement' as const, x: 0, z: -20, dx: 12, dz: 0 },
    { floorId: 'basement' as const, x: 8, z: -20, dx: -12, dz: 0 },
    { floorId: 'ground' as const, x: 0.5, z: -30.8, dx: 12, dz: 1 },
    { floorId: 'basement' as const, x: 3.8, z: -7, dx: 0, dz: -12 },
  ];
  for (const fixture of fixtures) {
    const result = await page.evaluate((fixture) => {
      const w = window.portfolio!.world!;
      w.movePlayerTo(fixture);
      return w.stepPlayerForTest(fixture);
    }, fixture);
    expect(result.activeFloor, JSON.stringify(fixture)).toBe(fixture.floorId);
    expect(result.blockedBy?.length).toBeGreaterThan(0);
    expect(
      Math.hypot(result.position.x - fixture.x, result.position.z - fixture.z)
    ).toBeLessThan(2);
  }
});

test('blocks genuine side and back attempts without floor hopping on either local role', async ({
  page,
}) => {
  await ready(page);
  const cases = [
    { floorId: 'ground' as const, x: 0, z: -20, dx: 0.1, dz: 0 },
    { floorId: 'ground' as const, x: 7.8, z: -20, dx: -0.1, dz: 0 },
    { floorId: 'ground' as const, x: 0.5, z: -30.8, dx: 0.1, dz: 0.05 },
    { floorId: 'basement' as const, x: 0, z: -20, dx: 0.1, dz: 0 },
    { floorId: 'basement' as const, x: 8, z: -20, dx: -0.1, dz: 0 },
    { floorId: 'basement' as const, x: 3.8, z: -7, dx: 0, dz: -0.1 },
    { floorId: 'basement' as const, x: 0, z: -11, dx: 0.1, dz: 0 },
  ];
  for (const fixture of cases) {
    const result = await page.evaluate((fixture) => {
      const w = (window.portfolio as PortfolioApi).world!;
      w.movePlayerTo(fixture); // Isolated start only; the attempted crossing uses runtime movement.
      let blocked = false;
      const floors = new Set<string>();
      for (let index = 0; index < 60; index++) {
        const step = w.stepPlayerForTest(fixture);
        floors.add(step.activeFloor);
        if ((fixture.dx && !step.movedX) || (fixture.dz && !step.movedZ))
          blocked = true;
      }
      return { blocked, floors: [...floors], y: w.getPlayerPosition().y };
    }, fixture);
    expect(result.blocked, JSON.stringify(fixture)).toBe(true);
    expect(result.floors).toEqual([fixture.floorId]);
    expect(result.y).toBe(fixture.floorId === 'basement' ? -5 : 0);
  }
});

async function keyboardAxis(
  page: Page,
  keys: string[],
  axis: 'x' | 'z',
  target: number
) {
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  const direction = Math.sign(target - before[axis]);
  // Release before the target to allow the real damped velocity to coast to rest.
  const releaseTarget = target - direction * 1.2;
  await Promise.all(keys.map((key) => page.keyboard.down(key)));
  try {
    await page.waitForFunction(
      ({ axis, target, direction }) => {
        const position = window.portfolio!.world!.getPlayerPosition();
        return direction > 0
          ? position[axis] >= target
          : position[axis] <= target;
      },
      { axis, target: releaseTarget, direction },
      { timeout: 30_000, polling: 'raf' }
    );
  } finally {
    await Promise.all(keys.map((key) => page.keyboard.up(key)));
  }
  await page.waitForTimeout(600);
}

test('uses genuine keyboard controls through the basement stairs in both directions', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await ready(page);
  // Isolated landing fixture, matching the touch case. Both full stair crossings
  // use browser keyboard input; the separate integrated journey starts at fresh spawn.
  await page.evaluate(() =>
    window.portfolio!.world!.movePlayerTo({ x: 3.8, z: -11, floorId: 'ground' })
  );
  await keyboardAxis(page, ['KeyW', 'KeyD'], 'z', -32);
  const bottom = await checkpoint(page, 'keyboard-basement');
  expect(bottom.floor).toBe('basement');
  expect(bottom.position.y).toBe(-5);
  await keyboardAxis(page, ['KeyS', 'KeyA'], 'z', -11);
  expect((await checkpoint(page, 'keyboard-ground')).floor).toBe('ground');
});

test('uses genuine touch joystick input for a phone basement stair round trip', async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await ready(page);
  // Start-only fixture isolates joystick alignment; both crossings are real touch input.
  await page.evaluate(() =>
    window.portfolio!.world!.movePlayerTo({
      ...{ x: 3.8, z: -11 },
      floorId: 'ground',
    })
  );
  const session = await context.newCDPSession(page);
  for (const direction of [-1, 1]) {
    const target = direction === -1 ? -32 : -11;
    const origin = { x: 100, y: 500 };
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [origin],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: origin.x - direction * 48,
          y: origin.y + direction * 48,
        },
      ],
    });
    try {
      await page.waitForFunction(
        ({ target, direction }) => {
          const z = window.portfolio!.world!.getPlayerPosition().z;
          return direction < 0 ? z <= target : z >= target;
        },
        { target, direction },
        { timeout: 45_000, polling: 'raf' }
      );
    } finally {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    }
    await page.waitForTimeout(180);
    const state = await checkpoint(
      page,
      direction < 0 ? 'touch-basement' : 'touch-ground'
    );
    expect(state.floor).toBe(direction < 0 ? 'basement' : 'ground');
  }
  await context.close();
});

test('measures radius-adjusted circulation lanes and turning pads against live colliders', async ({
  page,
}) => {
  await ready(page);
  const result = await page.evaluate(() => {
    const w = window.portfolio!.world!;
    const regions = [
      {
        name: 'ground west circulation',
        floorId: 'ground' as const,
        minX: -3,
        maxX: 0.1,
        minZ: -21,
        maxZ: -13.1,
      },
      {
        name: 'ground landing turn',
        floorId: 'ground' as const,
        minX: 2.3,
        maxX: 5.3,
        minZ: -12.5,
        maxZ: -9.5,
      },
      {
        name: 'ground west landing entry',
        floorId: 'ground' as const,
        minX: -0.5,
        maxX: 2.5,
        minZ: -12.5,
        maxZ: -9.5,
      },
      {
        name: 'basement lower turn',
        floorId: 'basement' as const,
        minX: 2.3,
        maxX: 5.3,
        minZ: -34.5,
        maxZ: -31.5,
      },
      {
        name: 'basement stair clear width',
        floorId: 'basement' as const,
        minX: 2.25,
        maxX: 5.35,
        minZ: -28.8,
        maxZ: -14.8,
      },
    ];
    return regions.map((region) => {
      const blocked = [];
      let samples = 0;
      for (let x = region.minX; x <= region.maxX + 0.001; x += 0.1) {
        for (let z = region.minZ; z <= region.maxZ + 0.001; z += 0.1) {
          samples++;
          if (!w.canOccupyPosition({ x, z, floorId: region.floorId }))
            blocked.push({ x, z });
        }
      }
      return { ...region, samples, blocked };
    });
  });
  await mkdir(test.info().outputDir, { recursive: true });
  await writeFile(
    test.info().outputPath('runtime-clearances.json'),
    JSON.stringify(result, null, 2)
  );
  await test.info().attach('runtime-clearances.json', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
  for (const region of result) expect(region.blocked, region.name).toEqual([]);
});

for (const profile of [
  {
    name: 'large desktop reduced motion',
    width: 1600,
    height: 900,
    reducedMotion: 'reduce' as const,
  },
  {
    name: 'small phone portrait',
    width: 360,
    height: 740,
    reducedMotion: 'no-preference' as const,
  },
  {
    name: 'phone landscape',
    width: 844,
    height: 390,
    reducedMotion: 'no-preference' as const,
  },
]) {
  test(`keeps basement height and visibility correct on ${profile.name}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      reducedMotion: profile.reducedMotion,
    });
    const page = await context.newPage();
    await ready(page);
    await walk(page, [{ x: 0, z: -11 }, LANDING, TOE]);
    expect(
      (await checkpoint(page, `basement-${profile.width}x${profile.height}`))
        .floor
    ).toBe('basement');
    await walk(page, [LANDING, { x: 0, z: -11 }, SPAWN]);
    expect(
      (await checkpoint(page, `ground-${profile.width}x${profile.height}`))
        .floor
    ).toBe('ground');
    await context.close();
  });
}
