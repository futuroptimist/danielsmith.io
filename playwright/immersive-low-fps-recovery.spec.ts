import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_URL = '/?mode=immersive&disablePerformanceFailover=1';
const READY_TIMEOUT_MS = 45_000;

type TestWindow = Window & {
  portfolio?: {
    debugPerformance?: {
      forceLowFpsRecoveryPopup(): void;
      dismissLowFpsRecoveryPopup(nowMs?: number): void;
      recordLowFpsRecoveryFrame(deltaSeconds: number, nowMs?: number): void;
      getQualityState?(): {
        adaptivePolicy: unknown;
        adaptiveDowngradeCount: number;
      };
    };
    performance?: {
      getSnapshot(): {
        quality: { adaptivePolicy: unknown; adaptiveDowngradeCount: number };
      };
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
  const softwareWarningContinue = page.locator(
    '[data-software-renderer-warning] [data-action="continue-safe-immersive"]'
  );
  if (await softwareWarningContinue.isVisible()) {
    await softwareWarningContinue.click();
  }
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
  const softwareWarningContinue = page.locator(
    '[data-software-renderer-warning] [data-action="continue-safe-immersive"]'
  );
  if (await softwareWarningContinue.isVisible()) {
    await softwareWarningContinue.click();
  }
}

function trackReloads(page: Page) {
  let navigations = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigations += 1;
    }
  });
  return () => navigations;
}

async function expectNoSceneDetailReloadHandoff(page: Page) {
  expect(page.url()).not.toContain('sceneDetailReloadLevel');
  expect(
    await page.evaluate(() =>
      window.sessionStorage.getItem(
        'portfolio::pending-scene-detail-reload-level'
      )
    )
  ).toBeNull();
}

async function showPopup(page: Page) {
  await page.evaluate(() => {
    (
      window as TestWindow
    ).portfolio?.debugPerformance?.forceLowFpsRecoveryPopup();
  });
  await expect(
    page.getByRole('heading', { name: 'Low frame rate detected' })
  ).toBeVisible();
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

    const reloadCount = trackReloads(page);

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
    expect(
      await page.evaluate(() =>
        (window as TestWindow).portfolio?.graphics?.getLevel()
      )
    ).toBe('cinematic');
    expect(reloadCount()).toBe(0);
    await expectNoSceneDetailReloadHandoff(page);

    await page.getByRole('button', { name: 'Switch to Balanced' }).click();
    await expect(
      page.getByRole('heading', { name: 'Low frame rate detected' })
    ).toBeHidden();
    expect(reloadCount()).toBe(0);
    await expectNoSceneDetailReloadHandoff(page);
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

  test('uses Performance as the Balanced downgrade target and rebuilds scene detail', async ({
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
    await page.evaluate(() => {
      (window as TestWindow).portfolio?.world?.stepPlayerForTest({
        dx: 1,
        dz: 0,
      });
    });
    const before = await page.evaluate(() =>
      (window as TestWindow).portfolio?.world?.getPlayerPosition()
    );
    const reloadCount = trackReloads(page);
    await showPopup(page);

    await page.getByRole('button', { name: 'Switch to Performance' }).click();

    await page.waitForFunction(
      () =>
        document.documentElement.dataset.appMode === 'immersive' &&
        (window as TestWindow).portfolio?.graphics?.getLevel() ===
          'performance',
      undefined,
      { timeout: READY_TIMEOUT_MS }
    );
    expect(reloadCount()).toBeGreaterThan(0);
    await expectNoSceneDetailReloadHandoff(page);
    expect(
      await page.evaluate(() =>
        (window as TestWindow).portfolio?.world?.getPlayerPosition()
      )
    ).toMatchObject(before!);
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
    await expect(
      page.getByRole('button', { name: /Switch to (Balanced|Performance)/ })
    ).toHaveCount(0);
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
    await expect(
      page.getByRole('heading', { name: 'Low frame rate detected' })
    ).toBeHidden();

    await page.evaluate(() => {
      const debug = (window as TestWindow).portfolio?.debugPerformance;
      for (let frame = 0; frame <= 41; frame += 1) {
        debug?.recordLowFpsRecoveryFrame(0.25, 31_000 + frame * 250);
      }
    });
    await expect(
      page.getByRole('heading', { name: 'Low frame rate detected' })
    ).toBeVisible();
  });

  test('keeps Cinematic through low-FPS frames until popup action', async ({
    page,
  }) => {
    await openImmersive(page, 'cinematic');
    test.skip(
      (await page.evaluate(() =>
        (window as TestWindow).portfolio?.graphics?.getLevel()
      )) !== 'cinematic',
      'Cinematic is unavailable under software-renderer safe mode.'
    );
    const reloadCount = trackReloads(page);
    await page.evaluate(() => {
      (window as TestWindow).portfolio?.world?.stepPlayerForTest({
        dx: 0.5,
        dz: 0.5,
      });
    });
    const before = await page.evaluate(() =>
      (window as TestWindow).portfolio?.world?.getPlayerPosition()
    );

    await page.evaluate(() => {
      const debug = (window as TestWindow).portfolio?.debugPerformance;
      for (let frame = 0; frame < 7; frame += 1) {
        debug?.recordLowFpsRecoveryFrame(0.25, frame * 250);
      }
    });

    expect(
      await page.evaluate(() =>
        (window as TestWindow).portfolio?.graphics?.getLevel()
      )
    ).toBe('cinematic');
    await expect(
      page.getByRole('heading', { name: 'Low frame rate detected' })
    ).toBeHidden();
    expect(reloadCount()).toBe(0);
    await expectNoSceneDetailReloadHandoff(page);

    await page.evaluate(() => {
      const debug = (window as TestWindow).portfolio?.debugPerformance;
      for (let frame = 7; frame <= 41; frame += 1) {
        debug?.recordLowFpsRecoveryFrame(0.25, frame * 250);
      }
    });

    await expect(
      page.getByRole('heading', { name: 'Low frame rate detected' })
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        (window as TestWindow).portfolio?.graphics?.getLevel()
      )
    ).toBe('cinematic');
    expect(
      await page.evaluate(() =>
        (window as TestWindow).portfolio?.world?.getPlayerPosition()
      )
    ).toMatchObject(before!);
    expect(reloadCount()).toBe(0);
    await expectNoSceneDetailReloadHandoff(page);
    expect(
      await page.evaluate(
        () =>
          (window as TestWindow).portfolio?.performance?.getSnapshot().quality
            .adaptivePolicy
      )
    ).toBeNull();
  });

  test('switches to non-immersive only after the user chooses it', async ({
    page,
  }) => {
    await openImmersive(page);
    await showPopup(page);
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'immersive'
    );
    await page.getByRole('button', { name: 'Use non-immersive mode' }).click();

    await expect(page.locator('#app')).toHaveAttribute('data-mode', 'text');
  });
});
