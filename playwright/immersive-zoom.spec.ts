import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL =
  '/?mode=immersive&disablePerformanceFailover=1&pauseImmersiveAnimationForTests=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

type PortfolioWorldApi = {
  getCameraZoom?: () => number;
  getCameraZoomTarget?: () => number;
  getMotionBlurIntensity?: () => number;
  getMotionBlurPassEnabled?: () => boolean;
  setMotionBlurIntensity?: (intensity: number) => void;
};

declare global {
  interface Window {
    portfolio?: {
      world?: PortfolioWorldApi;
    };
  }
}

async function waitForImmersiveReady(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

async function wheelZoom(page: Page, deltaY: number, repetitions = 6) {
  const canvas = page.locator('#app canvas').first();
  await expect(canvas).toBeVisible();
  await page.evaluate(
    ({ wheelDeltaY, count }) => {
      const target = document.querySelector<HTMLCanvasElement>('#app canvas');
      for (let index = 0; index < count; index += 1) {
        target?.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY: wheelDeltaY,
          })
        );
      }
    },
    { wheelDeltaY: deltaY, count: repetitions }
  );
}

test.describe('immersive zoom rendering', () => {
  test('zooms without fallback or retained afterimage buffers', async ({
    page,
  }) => {
    await waitForImmersiveReady(page);

    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app[data-mode="text"]')).toHaveCount(0);
    await expect(page.locator('#app canvas')).toHaveCount(1);

    await page.waitForFunction(() =>
      Boolean(window.portfolio?.world?.getCameraZoom)
    );

    const initialState = await page.evaluate(() => ({
      motionBlurEnabled:
        window.portfolio?.world?.getMotionBlurPassEnabled?.() ?? true,
      motionBlurIntensity:
        window.portfolio?.world?.getMotionBlurIntensity?.() ?? 1,
      zoom: window.portfolio?.world?.getCameraZoomTarget?.() ?? 0,
    }));
    expect(initialState.motionBlurIntensity).toBe(0);
    expect(initialState.motionBlurEnabled).toBe(false);

    await wheelZoom(page, -240);
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'immersive'
    );
    await expect(page.locator('#app[data-mode="text"]')).toHaveCount(0);

    const zoomedIn = await page.evaluate(
      () => window.portfolio?.world?.getCameraZoomTarget?.() ?? 0
    );
    expect(zoomedIn).toBeGreaterThan(initialState.zoom);

    await page.evaluate(() =>
      window.portfolio?.world?.setMotionBlurIntensity?.(0.7)
    );
    await page.waitForFunction(
      () => window.portfolio?.world?.getMotionBlurPassEnabled?.() === true
    );

    await page.evaluate(() =>
      window.portfolio?.world?.setMotionBlurIntensity?.(0)
    );
    await page.waitForFunction(
      () => window.portfolio?.world?.getMotionBlurPassEnabled?.() === false
    );

    await wheelZoom(page, 240);
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'immersive'
    );
    await expect(page.locator('#app[data-mode="text"]')).toHaveCount(0);
    await expect(page.locator('#app canvas')).toHaveCount(1);

    const finalState = await page.evaluate(() => ({
      motionBlurEnabled:
        window.portfolio?.world?.getMotionBlurPassEnabled?.() ?? true,
      motionBlurIntensity:
        window.portfolio?.world?.getMotionBlurIntensity?.() ?? 1,
      zoom: window.portfolio?.world?.getCameraZoomTarget?.() ?? 0,
    }));
    expect(finalState.motionBlurIntensity).toBe(0);
    expect(finalState.motionBlurEnabled).toBe(false);
    expect(finalState.zoom).toBeLessThan(zoomedIn);
  });
});
