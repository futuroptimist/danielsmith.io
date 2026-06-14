import { expect, test } from '@playwright/test';

type PortfolioDebugPerformanceWindow = Window & {
  portfolio?: {
    debugPerformance?: {
      getState(): { fpsEnabled: boolean; panelVisible: boolean };
      setFpsEnabled(enabled: boolean): void;
    };
  };
};

const immersiveDebugUrl =
  '/?mode=immersive&disablePerformanceFailover=1&debugFps=1';

test('FPS counter debug API toggles the non-interactive stats panel', async ({
  page,
}) => {
  await page.goto(immersiveDebugUrl);
  await page.waitForFunction(
    () =>
      Boolean(
        (window as PortfolioDebugPerformanceWindow).portfolio?.debugPerformance
          ?.getState
      ),
    null,
    { timeout: 15_000 }
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

  await expect(page.locator('[data-debug-fps-counter="true"]')).toHaveCount(1);
  await expect(page.locator('[data-debug-fps-counter="true"]')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const panel = document.querySelector<HTMLElement>(
          '[data-debug-fps-counter="true"]'
        );
        return panel ? getComputedStyle(panel).pointerEvents : null;
      })
    )
    .toBe('none');

  await page.evaluate(() => {
    (
      window as PortfolioDebugPerformanceWindow
    ).portfolio?.debugPerformance?.setFpsEnabled(false);
  });

  await expect
    .poll(() =>
      page.evaluate(() => {
        const api = (window as PortfolioDebugPerformanceWindow).portfolio
          ?.debugPerformance;
        return {
          panelCount: document.querySelectorAll(
            '[data-debug-fps-counter="true"]'
          ).length,
          state: api?.getState(),
        };
      })
    )
    .toEqual({
      panelCount: 1,
      state: { fpsEnabled: false, panelVisible: false },
    });

  await page.evaluate(() => {
    const api = (window as PortfolioDebugPerformanceWindow).portfolio
      ?.debugPerformance;
    api?.setFpsEnabled(true);
    api?.setFpsEnabled(false);
    api?.setFpsEnabled(true);
  });

  await expect
    .poll(() =>
      page.evaluate(() => ({
        panelCount: document.querySelectorAll('[data-debug-fps-counter="true"]')
          .length,
        state: (
          window as PortfolioDebugPerformanceWindow
        ).portfolio?.debugPerformance?.getState(),
      }))
    )
    .toEqual({
      panelCount: 1,
      state: { fpsEnabled: true, panelVisible: true },
    });
});
