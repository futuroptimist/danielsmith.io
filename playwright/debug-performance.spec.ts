import { expect, test } from '@playwright/test';

type PortfolioDebugPerformanceWindow = Window & {
  portfolio?: {
    debugPerformance?: {
      getState(): { fpsEnabled: boolean; panelVisible: boolean };
      setFpsEnabled(enabled: boolean): void;
    };
  };
};

test('debug FPS counter toggles through URL and debug API', async ({
  page,
}) => {
  await page.goto('/?mode=immersive&disablePerformanceFailover=1&debugFps=1');
  await page.waitForFunction(
    () =>
      (window as PortfolioDebugPerformanceWindow).portfolio?.debugPerformance
        ?.getState
  );

  await expect
    .poll(async () =>
      page.evaluate(() =>
        (
          window as PortfolioDebugPerformanceWindow
        ).portfolio?.debugPerformance?.getState()
      )
    )
    .toMatchObject({ fpsEnabled: true, panelVisible: true });

  await expect(
    page.locator('[data-debug-performance-panel="fps"]')
  ).toHaveCount(1);

  await page.evaluate(() => {
    (
      window as PortfolioDebugPerformanceWindow
    ).portfolio?.debugPerformance?.setFpsEnabled(false);
  });

  await expect
    .poll(async () =>
      page.evaluate(() =>
        (
          window as PortfolioDebugPerformanceWindow
        ).portfolio?.debugPerformance?.getState()
      )
    )
    .toMatchObject({ fpsEnabled: false, panelVisible: false });
  await expect(
    page.locator('[data-debug-performance-panel="fps"]')
  ).toHaveCount(0);
});
