import { expect, test } from '@playwright/test';

import { readyExterior } from './helpers/exteriorJourney';
import { pressNativeMovementChord } from './helpers/nativeMovementChord';

test('walks at native full speed both ways below the upper staircase and retains ground height', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await readyExterior(page);
  await page.evaluate(() =>
    window.portfolio!.world!.movePlayerTo({ x: 23, z: -23, floorId: 'ground' })
  );
  const observer = await page.evaluateHandle(() => {
    const samples: Array<{
      x: number;
      y: number;
      z: number;
      floor: string;
      connection: string | null;
    }> = [];
    const record = () => {
      const w = window.portfolio!.world!;
      samples.push({
        ...w.getPlayerPosition(),
        floor: w.getActiveFloor(),
        connection: w.getFloorConnectionSnapshot().activeConnectionId,
      });
      frame = requestAnimationFrame(record);
    };
    let frame = requestAnimationFrame(record);
    return {
      stop() {
        cancelAnimationFrame(frame);
        return samples;
      },
    };
  });
  let samples;
  try {
    await pressNativeMovementChord(page, ['KeyW', 'KeyA'], 2000);
    let west = await page.evaluate(() =>
      window.portfolio!.world!.getPlayerPosition()
    );
    const westDeadline = Date.now() + 15_000;
    while (west.x >= 9 && Date.now() < westDeadline) {
      await pressNativeMovementChord(page, ['KeyW', 'KeyA'], 300);
      west = await page.evaluate(() =>
        window.portfolio!.world!.getPlayerPosition()
      );
    }
    expect(west.x).toBeLessThan(9);
    expect(west.x).toBeGreaterThan(7);
    expect(west.z).toBeCloseTo(-23, 0);
    await pressNativeMovementChord(page, ['KeyS', 'KeyD'], 2000);
    let east = await page.evaluate(() =>
      window.portfolio!.world!.getPlayerPosition()
    );
    const eastDeadline = Date.now() + 15_000;
    while (east.x <= 22.9 && Date.now() < eastDeadline) {
      await pressNativeMovementChord(page, ['KeyS', 'KeyD'], 300);
      east = await page.evaluate(() =>
        window.portfolio!.world!.getPlayerPosition()
      );
    }
    expect(east.x).toBeGreaterThan(22.9);
    expect(east.z).toBeCloseTo(-23, 0);
  } finally {
    samples = await observer.evaluate((handle) => handle.stop());
    await observer.dispose();
    await test.info().attach('native-under-stair-samples.json', {
      body: JSON.stringify(samples, null, 2),
      contentType: 'application/json',
    });
  }
  expect(samples.length).toBeGreaterThan(3);
  expect(samples.some(({ x }) => x > 10 && x < 15)).toBe(true);
  expect(
    samples.every(
      ({ y, floor, connection }) =>
        Math.abs(y) < 0.001 && floor === 'ground' && connection === null
    )
  ).toBe(true);
  await page.evaluate(() => {
    const w = window.portfolio!.world!;
    w.movePlayerTo({ x: 12.4, z: -23, floorId: 'ground' });
    const s = w.stepPlayerForTest({ dx: 0, dz: 8 });
    if (
      s.position.z > -21.5 ||
      s.position.y !== 0 ||
      s.activeConnectionId !== null
    )
      throw new Error(`Low-headroom boundary failed: ${JSON.stringify(s)}`);
  });
  await page.evaluate(() =>
    window.portfolio!.world!.movePlayerTo({
      x: 12.4,
      z: -23,
      floorId: 'ground',
    })
  );
  await page.screenshot({
    path: test.info().outputPath('ground-under-upper-stair.png'),
  });
});
