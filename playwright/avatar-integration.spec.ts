import { expect, test } from '@playwright/test';

const url = '/?mode=immersive&disablePerformanceFailover=1';
test('approved avatar loads, gait toggles and nearby lounge seating exits safely', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(
    () =>
      (window.portfolio?.avatar?.getAnimationState?.() as { loaded?: boolean })
        ?.loaded,
    null,
    { timeout: 60_000 }
  );
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await page.keyboard.press('CapsLock');
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'run'
  );
  await page.keyboard.press('CapsLock');
  await page.evaluate(() =>
    window.portfolio?.world?.movePlayerTo({
      x: -30.13,
      z: -22.8,
      floorId: 'ground',
    })
  );
  const chair = page.locator('[data-avatar-chair-control]');
  await expect(chair).toBeVisible();
  await chair.click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.portfolio?.avatar?.getSeatingState?.().phase
        ),
      { timeout: 15_000 }
    )
    .toBe('seated');
  await page.screenshot({ path: 'test-results/avatar-seated.png' });
  await chair.click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.portfolio?.avatar?.getSeatingState?.().phase
        ),
      { timeout: 15_000 }
    )
    .toBe('free');
  await page.screenshot({ path: 'test-results/avatar-standing.png' });
  expect(errors).toEqual([]);
});

test('asset failure keeps the existing mannequin available', async ({
  page,
}) => {
  await page.route('**/daniel-animated-avatar.glb', (route) => route.abort());
  await page.goto(url);
  await page.waitForFunction(() =>
    Boolean(window.portfolio?.avatar?.getAnimationState)
  );
  expect(
    await page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
  ).toEqual({ loaded: false });
  await expect(page.locator('[data-avatar-chair-control]')).toBeHidden();
});

test('leaving immersive mode during avatar loading does not attach to a disposed scene', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/daniel-animated-avatar.glb', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(url);
  await page.waitForFunction(() =>
    Boolean(window.portfolio?.avatar?.getAnimationState)
  );
  await page.keyboard.press('Escape');
  await page.keyboard.press('t');
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  release();
  await page.waitForTimeout(250);
  expect(errors).toEqual([]);
});

test('reduced motion supports the other lounge and reading chair without trapping movement', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await page.waitForFunction(
    () =>
      (window.portfolio?.avatar?.getAnimationState?.() as { loaded?: boolean })
        ?.loaded
  );
  await page.keyboard.press('Escape');
  for (const point of [
    { x: -27.73, z: -15.9 },
    { x: 20.68, z: 11.5 },
  ]) {
    await page.evaluate(
      (p) => window.portfolio?.world?.movePlayerTo({ ...p, floorId: 'ground' }),
      point
    );
    const chair = page.locator('[data-avatar-chair-control]');
    await expect(chair).toBeVisible();
    await chair.click();
    await expect
      .poll(() =>
        page.evaluate(() => window.portfolio?.avatar?.getSeatingState?.().phase)
      )
      .toBe('seated');
    await page.keyboard.down('w');
    await expect
      .poll(() =>
        page.evaluate(() => window.portfolio?.avatar?.getSeatingState?.().phase)
      )
      .toBe('free');
    await page.keyboard.up('w');
  }
});
