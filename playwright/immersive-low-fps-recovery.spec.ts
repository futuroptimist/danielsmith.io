import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_URL = '/?mode=immersive&disablePerformanceFailover=1';
const READY_TIMEOUT_MS = 45_000;

type TestWindow = Window & {
  portfolio?: {
    debugPerformance?: {
      forceLowFpsRecoveryPopup(): void;
      dismissLowFpsRecoveryPopup(nowMs?: number): void;
      recordLowFpsRecoveryFrame(deltaSeconds: number, nowMs?: number): void;
    };
    graphics?: {
      getLevel(): string;
      setLevel(level: string): void;
    };
    world?: {
      getPlayerPosition(): { x: number; y: number; z: number };
      stepPlayerForTest(step: { dx: number; dz: number }): unknown;
    };
  };
};

async function openImmersive(page: Page, graphicsLevel = 'balanced') {
  await page.addInitScript((level) => {
    window.localStorage.setItem('danielsmith:graphics-quality-level', level);
  }, graphicsLevel);
  await page.goto(IMMERSIVE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.appMode === 'immersive' &&
      (window as TestWindow).portfolio?.debugPerformance
        ?.forceLowFpsRecoveryPopup,
    undefined,
    { timeout: READY_TIMEOUT_MS }
  );
}

async function setGraphics(page: Page, level: string) {
  await page.evaluate((next) => {
    (window as TestWindow).portfolio?.graphics?.setLevel(next);
  }, level);
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.appMode === 'immersive' &&
      (window as TestWindow).portfolio?.debugPerformance
        ?.forceLowFpsRecoveryPopup,
    undefined,
    { timeout: READY_TIMEOUT_MS }
  );
}

async function showPopup(page: Page) {
  await page.evaluate(() => {
    (
      window as TestWindow
    ).portfolio?.debugPerformance?.forceLowFpsRecoveryPopup();
  });
  await expect(page.getByText('Low frame rate detected')).toBeVisible();
}

test.describe('immersive low-FPS recovery popup', () => {
  test('downgrades Cinematic to Balanced without resetting position or leaving immersive mode', async ({
    page,
  }) => {
    await openImmersive(page);
    await setGraphics(page, 'cinematic');
    test.skip(
      (await page.evaluate(() =>
        (window as TestWindow).portfolio?.graphics?.getLevel()
      )) !== 'cinematic',
      'Cinematic is unavailable under software-renderer safe mode.'
    );
    await page.evaluate(() => {
      (window as TestWindow).portfolio?.world?.stepPlayerForTest({
        dx: 1,
        dz: 0,
      });
    });
    const before = await page.evaluate(() =>
      (window as TestWindow).portfolio?.world?.getPlayerPosition()
    );

    await showPopup(page);
    await expect(
      page.getByRole('button', { name: 'Switch to Balanced' })
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'immersive'
    );
    expect(
      await page.evaluate(() =>
        (window as TestWindow).portfolio?.world?.getPlayerPosition()
      )
    ).toMatchObject(before!);

    await page.getByRole('button', { name: 'Switch to Balanced' }).click();
    await expect(page.getByText('Low frame rate detected')).toBeHidden();
    expect(
      await page.evaluate(() =>
        (window as TestWindow).portfolio?.graphics?.getLevel()
      )
    ).toBe('balanced');
    expect(
      await page.evaluate(() =>
        (window as TestWindow).portfolio?.world?.getPlayerPosition()
      )
    ).toMatchObject(before!);
  });

  test('uses Performance as the Balanced downgrade target', async ({
    page,
  }) => {
    await openImmersive(page);
    await setGraphics(page, 'balanced');
    test.skip(
      (await page.evaluate(() =>
        (window as TestWindow).portfolio?.graphics?.getLevel()
      )) !== 'balanced',
      'Balanced is unavailable under software-renderer safe mode.'
    );
    await showPopup(page);

    await page.getByRole('button', { name: 'Switch to Performance' }).click();

    expect(
      await page.evaluate(() =>
        (window as TestWindow).portfolio?.graphics?.getLevel()
      )
    ).toBe('performance');
  });

  test('omits the downgrade action in Performance mode', async ({ page }) => {
    await openImmersive(page);
    await setGraphics(page, 'performance');
    test.skip(
      (await page.evaluate(() =>
        (window as TestWindow).portfolio?.graphics?.getLevel()
      )) !== 'performance',
      'Performance is unavailable under software-renderer safe mode.'
    );
    await showPopup(page);
    test.skip(
      (await page.getByText('Software rendering detected').count()) > 0,
      'Software-renderer safe mode forces a protective graphics ladder.'
    );

    await expect(page.getByRole('button', { name: 'Dismiss' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Use non-immersive mode' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Switch to/ })).toHaveCount(
      0
    );
  });

  test('dismiss cooldown suppresses immediate redisplay and allows later redisplay', async ({
    page,
  }) => {
    await openImmersive(page);
    await showPopup(page);
    await page.evaluate(() => {
      (
        window as TestWindow
      ).portfolio?.debugPerformance?.dismissLowFpsRecoveryPopup(0);
    });
    await page.evaluate(() => {
      (
        window as TestWindow
      ).portfolio?.debugPerformance?.forceLowFpsRecoveryPopup();
    });
    await expect(page.getByText('Low frame rate detected')).toBeHidden();

    await page.evaluate(() => {
      const debug = (window as TestWindow).portfolio?.debugPerformance;
      for (let frame = 0; frame <= 41; frame += 1) {
        debug?.recordLowFpsRecoveryFrame(0.25, 31_000 + frame * 250);
      }
    });
    await expect(page.getByText('Low frame rate detected')).toBeVisible();
  });

  test('switches to non-immersive only after the user chooses it', async ({
    page,
  }) => {
    await openImmersive(page);
    await showPopup(page);
    await page.getByRole('button', { name: 'Use non-immersive mode' }).click();

    await expect(page.locator('#app')).toHaveAttribute('data-mode', 'text');
  });
});
