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

test('debug FPS panel does not overlap debug coordinates', async ({ page }) => {
  await page.goto(
    '/?mode=immersive&disablePerformanceFailover=1&debugCoordinates=1&debugFps=1'
  );

  const fpsPanel = page.locator('[data-debug-performance-panel="fps"]');
  const coordinatesPanel = page.locator('.debug-coordinates');
  await expect(fpsPanel).toHaveCount(1);
  await expect(coordinatesPanel).toBeVisible();

  const boxes = await Promise.all([
    fpsPanel.boundingBox(),
    coordinatesPanel.boundingBox(),
  ]);
  const [fpsBox, coordinatesBox] = boxes;
  expect(fpsBox).not.toBeNull();
  expect(coordinatesBox).not.toBeNull();

  const intersects =
    fpsBox!.x < coordinatesBox!.x + coordinatesBox!.width &&
    fpsBox!.x + fpsBox!.width > coordinatesBox!.x &&
    fpsBox!.y < coordinatesBox!.y + coordinatesBox!.height &&
    fpsBox!.y + fpsBox!.height > coordinatesBox!.y;

  expect(intersects).toBe(false);
});
