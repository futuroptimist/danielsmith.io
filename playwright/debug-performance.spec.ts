import { expect, test } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

type PortfolioDebugPerformanceWindow = Window & {
  portfolio?: {
    debugPerformance?: {
      getState(): { fpsEnabled: boolean; panelVisible: boolean };
      setFpsEnabled(enabled: boolean): void;
    };
  };
};

test('toggles the immersive stats.js FPS panel through URL and API', async ({
  page,
}) => {
  await page.goto(`${IMMERSIVE_PREVIEW_URL}&debugFps=1`);
  await page.waitForFunction(
    () =>
      Boolean(
        (window as PortfolioDebugPerformanceWindow).portfolio?.debugPerformance
          ?.getState
      ),
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as PortfolioDebugPerformanceWindow
          ).portfolio?.debugPerformance?.getState().fpsEnabled
      )
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as PortfolioDebugPerformanceWindow
          ).portfolio?.debugPerformance?.getState().panelVisible
      )
    )
    .toBe(true);
  await expect(
    page.locator('[data-debug-performance-panel="fps"]')
  ).toHaveCount(1);

  await page.evaluate(() => {
    (
      window as PortfolioDebugPerformanceWindow
    ).portfolio?.debugPerformance?.setFpsEnabled(false);
  });

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as PortfolioDebugPerformanceWindow
          ).portfolio?.debugPerformance?.getState().panelVisible
      )
    )
    .toBe(false);
  await expect(
    page.locator('[data-debug-performance-panel="fps"]')
  ).toHaveCount(0);
});
