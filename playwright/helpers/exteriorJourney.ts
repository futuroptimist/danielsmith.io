import { expect, type Page } from '@playwright/test';

export async function readyExterior(page: Page) {
  await page.goto('/?mode=immersive&disablePerformanceFailover=1', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.appMode === 'immersive' &&
      !!window.portfolio?.world?.getDoorSnapshots
  );
  const safe = page.locator('[data-action="continue-safe-immersive"]');
  if (await safe.isVisible()) await safe.click();
  await page.locator('#app canvas').focus();
}

/** Plans with read-only occupancy queries, then exercises each segment through runtime movement. */
export async function walkExteriorTo(
  page: Page,
  target: { x: number; z: number }
) {
  return page.evaluate(async (target) => {
    const world = window.portfolio!.world!;
    const start = world.getPlayerPosition();
    const grid = 0.2;
    // The actual pose is valid; rounding it onto a global grid can enter a solid.
    const startNode = {
      x: start.x,
      z: start.z,
      cellX: 0,
      cellZ: 0,
      parent: -1,
    };
    const queue = [startNode];
    const seen = new Set(['0,0']);
    let found = -1;
    for (let index = 0; index < queue.length && index < 300000; index++) {
      const node = queue[index];
      if (Math.hypot(node.x - target.x, node.z - target.z) < 0.3) {
        found = index;
        break;
      }
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const cellX = node.cellX + dx;
        const cellZ = node.cellZ + dz;
        const next = {
          x: start.x + cellX * grid,
          z: start.z + cellZ * grid,
          cellX,
          cellZ,
          parent: index,
        };
        const key = `${cellX},${cellZ}`;
        if (
          seen.has(key) ||
          next.x < -32 ||
          next.x > 80 ||
          next.z < -36 ||
          next.z > 48
        )
          continue;
        seen.add(key);
        if (!world.canOccupyPosition({ ...next, floorId: 'ground' })) continue;
        if (
          world.predictFloorAt({ ...next, currentFloor: 'ground' }) !== 'ground'
        )
          continue;
        const connection = world.getFloorConnectionSnapshot().connections;
        if (
          connection.some(
            (c) =>
              ![
                'outsideStairs',
                'safeUpperFloor',
                'upperLanding',
                'lowerStairEntrance',
              ].includes(
                world.getStairTransitionZone({
                  ...next,
                  currentFloor: 'ground',
                  connectionId: c.id,
                })
              )
          )
        )
          continue;
        queue.push(next);
      }
    }
    if (found < 0)
      throw new Error(
        `No ground route to ${JSON.stringify(target)} from ${JSON.stringify(start)}; ` +
          `reached ${queue.length} nodes, maxX ${Math.max(...queue.map((n) => n.x))}, ` +
          `maxZ ${Math.max(...queue.map((n) => n.z))}, ` +
          `targetFree ${world.canOccupyPosition({ ...target, floorId: 'ground' })}, ` +
          `prediction ${world.predictFloorAt({ ...target, currentFloor: 'ground' })}, ` +
          `zones ${JSON.stringify(
            world.getFloorConnectionSnapshot().connections.map((c) => [
              c.id,
              world.getStairTransitionZone({
                ...target,
                currentFloor: 'ground',
                connectionId: c.id,
              }),
            ])
          )}, nearest ${JSON.stringify(
            queue
              .sort(
                (a, b) =>
                  Math.hypot(a.x - target.x, a.z - target.z) -
                  Math.hypot(b.x - target.x, b.z - target.z)
              )
              .slice(0, 3)
          )}`
      );
    const path: Array<{ x: number; z: number; parent: number }> = [];
    for (let i = found; i >= 0; i = queue[i].parent) path.push(queue[i]);
    path.reverse();
    path.push({ ...target, parent: -1 });
    let samples = 0;
    for (const point of path) {
      for (let count = 0; count < 50; count++) {
        const before = world.getPlayerPosition();
        const dx = Math.max(-0.1, Math.min(0.1, point.x - before.x));
        const dz = Math.max(-0.1, Math.min(0.1, point.z - before.z));
        if (Math.abs(dx) + Math.abs(dz) < 0.0001) break;
        const next = world.stepPlayerForTest({ dx, dz });
        if (
          (dx && !next.movedX) ||
          (dz && !next.movedZ) ||
          next.activeFloor !== 'ground' ||
          Math.abs(next.position.y) > 0.01
        )
          throw new Error(
            `Exterior route blocked: ${JSON.stringify({ point, next })}`
          );
        if (++samples % 50 === 0)
          await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    return {
      samples,
      position: world.getPlayerPosition(),
      floor: world.getActiveFloor(),
    };
  }, target);
}

export async function waitDoor(page: Page, id: string, state: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          window
            .portfolio!.world!.getDoorSnapshots()
            .find((door) => door.id === id)?.state,
        id
      )
    )
    .toBe(state);
}
