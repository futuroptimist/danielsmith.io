import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

declare global {
  interface Window {
    portfolio?: {
      graphics?: {
        getMotionBlurDebugState(): {
          enabled: boolean;
          damp: number;
          intensity: number;
        };
        setMotionBlurIntensity(intensity: number): void;
      };
    };
  }
}
const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';

async function waitForImmersive(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await page.waitForFunction(
    () => Boolean(window.portfolio?.graphics?.getMotionBlurDebugState),
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

async function wheelZoomSequence(page: Page) {
  const canvas = page.locator('#app canvas');
  await expect(canvas).toHaveCount(1);
  for (const deltaY of [-420, -360, -240, 240, 360, 420]) {
    await canvas.dispatchEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY,
    });
    await page.waitForTimeout(50);
  }
}

test.describe('immersive zoom rendering', () => {
  test('wheel zoom stays immersive and motion blur zero disables feedback', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await waitForImmersive(page);

    await expect(page.locator('#app canvas')).toHaveCount(1);
    await expect(page.locator('#app[data-mode="text"]')).toHaveCount(0);
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');

    await wheelZoomSequence(page);

    await expect(page.locator('#app canvas')).toHaveCount(1);
    await expect(page.locator('#app[data-mode="text"]')).toHaveCount(0);

    await page.evaluate(() =>
      window.portfolio?.graphics?.setMotionBlurIntensity(0)
    );
    const disabledState = await page.evaluate(() =>
      window.portfolio?.graphics?.getMotionBlurDebugState()
    );
    expect(disabledState).toEqual({ enabled: false, damp: 0, intensity: 0 });

    await wheelZoomSequence(page);

    await expect(page.locator('#app canvas')).toHaveCount(1);
    await expect(page.locator('#app[data-mode="text"]')).toHaveCount(0);
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  });
});
