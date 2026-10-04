import { expect, test, type Page } from '@playwright/test';

import { createGarageDoorDefinitions } from '../src/scene/level/garageLayout';
import type { DoorSnapshot } from '../src/systems/doors/controller';

import {
  readyExterior,
  waitDoor,
  walkExteriorTo,
} from './helpers/exteriorJourney';
import { pressNativeMovementChord } from './helpers/nativeMovementChord';

async function operate(page: Page, id: string, state: 'open' | 'closed') {
  const button = page.locator(
    `[data-exterior-door-control][data-door-id="${id}"]`
  );
  await expect(button).toBeVisible();
  await waitDoor(page, id, state === 'open' ? 'closed' : 'open');
  await button.click();
  await waitDoor(page, id, state);
}
async function closeApproachingDoor(page: Page, id: string) {
  await waitDoor(page, id, 'open');
  await operate(page, id, 'closed');
}
async function enterGarage(page: Page) {
  await walkExteriorTo(page, { x: 29, z: -2 });
  await closeApproachingDoor(page, 'house-garage-door');
  await expect(
    page.locator('[data-exterior-door-control]')
  ).toHaveAccessibleName('Open House–garage door');
  await operate(page, 'house-garage-door', 'open');
  await walkExteriorTo(page, { x: 41, z: 4 });
  expect(
    await page.evaluate(
      () => window.portfolio!.debugCoordinates!.getState().currentRoomId
    )
  ).toBe('garage');
}

for (const side of ['house', 'garage'] as const) {
  test(`records the shared wall and sliding pocket from the ${side}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await readyExterior(page);
    await walkExteriorTo(page, { x: 29, z: -2 });
    await waitDoor(page, 'house-garage-door', 'open');
    if (side === 'garage') await walkExteriorTo(page, { x: 35, z: -2 });
    for (const state of ['closed', 'open'] as const) {
      await operate(page, 'house-garage-door', state);
      await expect(page.locator('#app canvas').first()).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath(`shared-wall-${side}-${state}.png`),
      });
    }
    expect(
      await page.evaluate(() => window.portfolio!.world!.getActiveFloor())
    ).toBe('ground');
  });
}

test('walks the entire house, garage, driveway and front-entry loop in both directions', async ({
  page,
}) => {
  // Both complete directions retain their door operations and native crossing.
  test.setTimeout(180000);
  await readyExterior(page);
  await walkExteriorTo(page, { x: 29, z: -2 });
  await closeApproachingDoor(page, 'house-garage-door');
  expect(
    await page.evaluate(() =>
      window.portfolio!.world!.canOccupyPosition({
        x: 32,
        z: -2,
        floorId: 'ground',
      })
    )
  ).toBe(false);
  await operate(page, 'house-garage-door', 'open');
  expect(
    await page.evaluate(() =>
      window.portfolio!.world!.canOccupyPosition({
        x: 32,
        z: -2,
        floorId: 'ground',
      })
    )
  ).toBe(true);
  await walkExteriorTo(page, { x: 47, z: 4 });
  await closeApproachingDoor(page, 'garage-door');
  expect(
    await page.evaluate(() =>
      window.portfolio!.world!.canOccupyPosition({
        x: 50,
        z: 4,
        floorId: 'ground',
      })
    )
  ).toBe(false);
  expect(
    await page.evaluate(
      () => window.portfolio!.world!.getCameraState().cutawaySourceIds
    )
  ).toContain('ground.garage.vehicleDoor');
  await page.screenshot({
    path: test.info().outputPath('garage-interior-closed.png'),
  });
  await operate(page, 'garage-door', 'open');
  // Native camera-relative keyboard movement crosses the actual garage aperture.
  await page.locator('#app canvas').focus();
  await page.keyboard.down('KeyS');
  await page.keyboard.down('KeyD');
  try {
    await page.waitForFunction(
      () => window.portfolio!.world!.getPlayerPosition().x >= 53,
      undefined,
      { timeout: 15000 }
    );
  } finally {
    await page.keyboard.up('KeyS');
    await page.keyboard.up('KeyD');
  }
  await page.waitForTimeout(600);
  await walkExteriorTo(page, { x: 55, z: -15 });
  await walkExteriorTo(page, { x: 35, z: -15 });
  await waitDoor(page, 'front-door', 'open');
  await walkExteriorTo(page, { x: 0, z: -20 });
  // Reverse the complete loop; close/reopen each aperture from its opposite side.
  await walkExteriorTo(page, { x: 29, z: -15 });
  await operate(page, 'front-door', 'closed');
  await operate(page, 'front-door', 'open');
  await walkExteriorTo(page, { x: 55, z: -15 });
  await walkExteriorTo(page, { x: 53, z: 4 });
  await operate(page, 'garage-door', 'closed');
  await operate(page, 'garage-door', 'open');
  await walkExteriorTo(page, { x: 35, z: -2 });
  await operate(page, 'house-garage-door', 'closed');
  await operate(page, 'house-garage-door', 'open');
  await walkExteriorTo(page, { x: 29, z: -2 });
  await walkExteriorTo(page, { x: 0, z: -20 });
  expect(
    await page.evaluate(() => window.portfolio!.world!.getActiveFloor())
  ).toBe('ground');
});

const occupiedThresholdTitle =
  'matches intermediate headroom and protects an occupied ' +
  'overhead threshold during native input';
test(occupiedThresholdTitle, async ({ page }) => {
  test.setTimeout(120000);
  await readyExterior(page);
  await enterGarage(page);
  await walkExteriorTo(page, { x: 47, z: 4 });
  await closeApproachingDoor(page, 'garage-door');
  await page.locator('[data-exterior-door-control]').click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window
            .portfolio!.world!.getDoorSnapshots()
            .find((door) => door.id === 'garage-door')!.progress
      )
    )
    .toBeGreaterThan(0);
  const intermediate = await page.evaluate(() => {
    const door = window
      .portfolio!.world!.getDoorSnapshots()
      .find((door) => door.id === 'garage-door')!;
    return {
      door,
      canCross: window.portfolio!.world!.canOccupyPosition({
        x: 50,
        z: 4,
        floorId: 'ground',
      }),
    };
  });
  expect(intermediate.canCross).toBe(!intermediate.door.blocked);
  expect(intermediate.door.blocked).toBe(
    intermediate.door.progress < 3.1 / 4.8
  );
  await waitDoor(page, 'garage-door', 'open');
  await walkExteriorTo(page, { x: 50, z: 4 });
  for (let i = 0; i < 3; i++)
    await page.locator('[data-exterior-door-control]').click();
  expect(
    await page.evaluate(() =>
      window
        .portfolio!.world!.getDoorSnapshots()
        .find((door) => door.id === 'garage-door')
    )
  ).toMatchObject({ state: 'open', target: 1, occupied: true, blocked: false });
  // Start inside the protected threshold so native movement does not race a
  // legitimate unoccupied closure while browser input commands are dispatched.
  await walkExteriorTo(page, { x: 51.25, z: 4 });
  const occupiedApproach = await page.evaluate(() => ({
    position: window.portfolio!.world!.getPlayerPosition(),
    door: window
      .portfolio!.world!.getDoorSnapshots()
      .find((door) => door.id === 'garage-door')!,
  }));
  expect(occupiedApproach.position.x).toBeCloseTo(51.25, 1);
  expect(occupiedApproach.position.z).toBeCloseTo(4, 1);
  expect(occupiedApproach.door).toMatchObject({
    state: 'open',
    blocked: false,
  });
  await page.locator('[data-exterior-door-control]').click();
  expect(
    await page.evaluate(() =>
      window
        .portfolio!.world!.getDoorSnapshots()
        .find((door) => door.id === 'garage-door')
    )
  ).toMatchObject({ occupied: true, target: 1, blocked: false, state: 'open' });
  await page.locator('#app canvas').focus();
  const observation = await page.evaluateHandle(() => {
    const world = window.portfolio!.world!;
    const read = () => ({
      position: world.getPlayerPosition(),
      door: world.getDoorSnapshots().find((door) => door.id === 'garage-door')!,
    });
    const samples = [read()];
    let active = true;
    const record = () => {
      if (!active) return;
      samples.push(read());
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
    return {
      stop: () => {
        active = false;
        return samples;
      },
    };
  });
  let nativeSamples: Array<{
    position: { x: number; z: number };
    door: DoorSnapshot;
  }> = [];
  try {
    await expect
      .poll(
        async () => {
          await pressNativeMovementChord(page, ['KeyW', 'KeyA'], 100);
          return page.evaluate(
            () => window.portfolio!.world!.getPlayerPosition().x
          );
        },
        { timeout: 15000 }
      )
      .toBeLessThanOrEqual(50.5);
  } finally {
    nativeSamples = await observation.evaluate((record) => record.stop());
    await observation.dispose();
    await test.info().attach('native-occupied-door-motion', {
      body: JSON.stringify(nativeSamples, null, 2),
      contentType: 'application/json',
    });
  }
  const threshold = createGarageDoorDefinitions(2).find(
    (door) => door.id === 'garage-door'
  )!.threshold;
  const radius = 0.75;
  const occupiedSamples = nativeSamples.filter(
    ({ position }) =>
      position.x >= threshold.minX - radius &&
      position.x <= threshold.maxX + radius &&
      position.z >= threshold.minZ - radius &&
      position.z <= threshold.maxZ + radius
  );
  expect(occupiedSamples.length).toBeGreaterThan(0);
  expect(
    occupiedSamples.every(({ door }) => !door.blocked && door.target === 1)
  ).toBe(true);
  // Each native pulse releases its keys before reading the endpoint. Departure
  // beyond the hold zone may still close the door. Re-approach through real
  // movement for the final occupied snapshot.
  await walkExteriorTo(page, { x: 47, z: 4 });
  await waitDoor(page, 'garage-door', 'open');
  await walkExteriorTo(page, { x: 50, z: 4 });
  await waitDoor(page, 'garage-door', 'open');
  expect(
    await page.evaluate(
      () =>
        window
          .portfolio!.world!.getDoorSnapshots()
          .find((door) => door.id === 'garage-door')!.target
    )
  ).toBe(1);
  await page.screenshot({
    path: test.info().outputPath('garage-occupied-reopen.png'),
  });
});

test('operates both garage doors by touch and preserves reduced-motion occupancy guards', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await readyExterior(page);
  await walkExteriorTo(page, { x: 29, z: -2 });
  await closeApproachingDoor(page, 'house-garage-door');
  await page.locator('[data-exterior-door-control]').tap();
  await waitDoor(page, 'house-garage-door', 'open');
  await walkExteriorTo(page, { x: 47, z: 4 });
  await closeApproachingDoor(page, 'garage-door');
  await page.locator('[data-exterior-door-control]').tap();
  await waitDoor(page, 'garage-door', 'open');
  await walkExteriorTo(page, { x: 50, z: 4 });
  await page.locator('[data-exterior-door-control]').tap();
  expect(
    await page.evaluate(
      () =>
        window
          .portfolio!.world!.getDoorSnapshots()
          .find((door) => door.id === 'garage-door')!.blocked
    )
  ).toBe(false);
  await walkExteriorTo(page, { x: 53, z: 4 });
  await page.locator('[data-exterior-door-control]').tap();
  await waitDoor(page, 'garage-door', 'closed');
  await page.screenshot({
    path: test.info().outputPath('garage-touch-closed.png'),
  });
  await context.close();
});

for (const viewport of [
  { width: 844, height: 390 },
  { width: 360, height: 720 },
]) {
  test(`keeps the taller garage control reachable at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await readyExterior(page);
    await enterGarage(page);
    await walkExteriorTo(page, { x: 47, z: 4 });
    await closeApproachingDoor(page, 'garage-door');
    const button = page.locator('[data-exterior-door-control]');
    await expect(button).toHaveAccessibleName('Open Garage door');
    const box = (await button.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await operate(page, 'garage-door', 'open');
    await walkExteriorTo(page, { x: 53, z: 4 });
    await page.screenshot({
      path: test
        .info()
        .outputPath(`garage-${viewport.width}-${viewport.height}.png`),
    });
  });
}
