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
  const softwareNotice = page.locator(
    '[data-action="continue-safe-immersive"]'
  );
  if (await softwareNotice.isVisible()) await softwareNotice.click();
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'run'
  );
  // CDP does not emulate the OS lock LED; use the browser's real modifier-event API.
  const reportLock = async (
    caps: boolean,
    key = 'CapsLock',
    code = 'CapsLock'
  ) =>
    page.evaluate(
      ({ caps, key, code }) => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            code,
            modifierCapsLock: caps,
            bubbles: true,
          })
        );
        window.dispatchEvent(
          new KeyboardEvent('keyup', {
            key,
            code,
            modifierCapsLock: caps,
            bubbles: true,
          })
        );
      },
      { caps, key, code }
    );
  await reportLock(true);
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await reportLock(true, 'Shift', 'ShiftLeft');
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await reportLock(false);
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'run'
  );
  await page.locator('[data-avatar-gait-control]').click();
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await reportLock(false, 'ArrowUp', 'ArrowUp');
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'run'
  );
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await reportLock(true, 'Z', 'KeyW');
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await reportLock(false);
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

test('changing quality while seated reloads at a clear standing position', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await page.waitForFunction(
    () =>
      (window.portfolio?.avatar?.getAnimationState?.() as { loaded?: boolean })
        ?.loaded,
    null,
    { timeout: 60_000 }
  );
  await page.keyboard.press('Escape');
  await page.evaluate(() =>
    window.portfolio!.world!.movePlayerTo({
      x: -30.13,
      z: -22.8,
      floorId: 'ground',
    })
  );
  await page.locator('[data-avatar-chair-control]').click();
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getSeatingState?.().phase)
    )
    .toBe('seated');
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(() => {
      const graphics = window.portfolio!.graphics as {
        getLevel(): string;
        setLevel(level: string): void;
      };
      graphics.setLevel(
        graphics.getLevel() === 'performance' ? 'balanced' : 'performance'
      );
    }),
  ]);
  await page.waitForFunction(
    () =>
      (window.portfolio?.avatar?.getAnimationState?.() as { loaded?: boolean })
        ?.loaded,
    null,
    { timeout: 60_000 }
  );
  expect(
    await page.evaluate(
      () => window.portfolio?.avatar?.getSeatingState?.().phase
    )
  ).toBe('free');
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  await page.keyboard.down('w');
  try {
    await expect
      .poll(() =>
        page.evaluate((start) => {
          const p = window.portfolio!.world!.getPlayerPosition();
          return Math.hypot(p.x - start.x, p.z - start.z);
        }, before)
      )
      .toBeGreaterThan(0.1);
  } finally {
    await page.keyboard.up('w');
  }
});

test('asset failure keeps the existing mannequin available', async ({
  page,
}) => {
  await page.route('**/daniel-animated-avatar.glb', (route) => route.abort());
  await page.goto(url);
  await page.waitForFunction(() =>
    Boolean(window.portfolio?.avatar?.getAnimationState)
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
    )
    .toMatchObject({
      loaded: false,
      presentation: 'fallback',
      fallbackVisible: true,
      loadingMarkerVisible: false,
    });
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  await page.keyboard.down('w');
  try {
    await expect
      .poll(() =>
        page.evaluate((start) => {
          const p = window.portfolio!.world!.getPlayerPosition();
          return Math.hypot(p.x - start.x, p.z - start.z);
        }, before)
      )
      .toBeGreaterThan(0.1);
  } finally {
    await page.keyboard.up('w');
  }
  await expect(page.locator('[data-avatar-chair-control]')).toBeHidden();
});

test('cold slow load shows only a marker, times out safely, and accepts a late rig', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/daniel-animated-avatar.glb', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(url);
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
    )
    .toMatchObject({
      loaded: false,
      presentation: 'pending',
      fallbackVisible: false,
      loadingMarkerVisible: true,
    });
  await page.screenshot({ path: 'test-results/avatar-loading-marker.png' });
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
  ).toMatchObject({
    presentation: 'pending',
    fallbackVisible: false,
    loadingMarkerVisible: true,
  });
  await expect
    .poll(
      () =>
        page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.()),
      { timeout: 20_000 }
    )
    .toMatchObject({
      presentation: 'fallback',
      fallbackVisible: true,
      loadingMarkerVisible: false,
    });
  release();
  await expect
    .poll(
      () =>
        page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.()),
      { timeout: 30_000 }
    )
    .toMatchObject({
      loaded: true,
      presentation: 'ready',
      fallbackVisible: false,
      loadingMarkerVisible: false,
    });
});

test('reload retries a failed rig with a fresh loading presentation', async ({
  page,
}) => {
  await page.route('**/daniel-animated-avatar.glb', (route) => route.abort());
  await page.goto(url);
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
    )
    .toMatchObject({ presentation: 'fallback', fallbackVisible: true });
  await page.unroute('**/daniel-animated-avatar.glb');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/daniel-animated-avatar.glb', async (route) => {
    await gate;
    await route.continue();
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
    )
    .toMatchObject({
      presentation: 'pending',
      fallbackVisible: false,
      loadingMarkerVisible: true,
    });
  release();
  await expect
    .poll(
      () =>
        page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.()),
      { timeout: 30_000 }
    )
    .toMatchObject({
      loaded: true,
      presentation: 'ready',
      fallbackVisible: false,
      loadingMarkerVisible: false,
    });
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
