import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL =
  '/?mode=immersive&disablePerformanceFailover=1&debugFps=1';

interface PortfolioWindow extends Window {
  portfolio?: {
    debugPerformance?: {
      getState(): { fpsEnabled: boolean; panelVisible: boolean };
      setFpsEnabled(enabled: boolean): void;
    };
  };
}

async function waitForImmersive(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

test.describe('debug performance overlay', () => {
  test('toggles stats.js FPS panel through the debug API without duplicates', async ({
    page,
  }) => {
    await waitForImmersive(page);

    await page.waitForFunction(() => {
      const api = (window as PortfolioWindow).portfolio?.debugPerformance;
      return api?.getState().fpsEnabled === true && api.getState().panelVisible;
    });

    await expect(page.locator('#debug-performance-stats')).toHaveCount(1);

    const initialState = await page.evaluate(() => {
      const api = (window as PortfolioWindow).portfolio?.debugPerformance;
      if (!api) {
        throw new Error('window.portfolio.debugPerformance is unavailable');
      }
      return api.getState();
    });
    expect(initialState).toEqual({ fpsEnabled: true, panelVisible: true });

    await page.evaluate(() => {
      (window as PortfolioWindow).portfolio?.debugPerformance?.setFpsEnabled(
        false
      );
    });
    await expect(page.locator('#debug-performance-stats')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as PortfolioWindow).portfolio?.debugPerformance?.getState()
        )
      )
      .toEqual({ fpsEnabled: false, panelVisible: false });

    await page.evaluate(() => {
      const api = (window as PortfolioWindow).portfolio?.debugPerformance;
      api?.setFpsEnabled(true);
      api?.setFpsEnabled(true);
    });
    await expect(page.locator('#debug-performance-stats')).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as PortfolioWindow).portfolio?.debugPerformance?.getState()
        )
      )
      .toEqual({ fpsEnabled: true, panelVisible: true });

    const pointerEvents = await page
      .locator('#debug-performance-stats')
      .evaluate((element) => getComputedStyle(element).pointerEvents);
    expect(pointerEvents).toBe('none');
  });
});
