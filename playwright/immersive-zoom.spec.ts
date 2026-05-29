import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';

async function waitForImmersive(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive'
  );
  await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function wheelZoom(page: Page) {
  const canvas = page.locator('#app canvas');
  await canvas.hover();
  for (const deltaY of [-360, -240, 180, 300, -180, 240]) {
    await page.evaluate((nextDeltaY) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
      canvas?.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: nextDeltaY,
        })
      );
    }, deltaY);
  }
}

test.describe('immersive orthographic zoom', () => {
  test.setTimeout(240_000);
  test('keeps a single clean immersive canvas while zooming with motion blur disabled', async ({
    page,
  }) => {
    await waitForImmersive(page);

    const initialMotionBlur = await page.evaluate(() =>
      window.portfolio?.graphics?.getMotionBlurState()
    );
    expect(initialMotionBlur).toMatchObject({
      enabled: false,
      damp: 0,
      intensity: 0,
    });

    await wheelZoom(page);
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);

    await page.evaluate(() => {
      window.portfolio?.graphics?.setMotionBlurIntensity(0);
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-accessibility-motion-blur',
      '0'
    );
    await wheelZoom(page);

    const disabledMotionBlur = await page.evaluate(() =>
      window.portfolio?.graphics?.getMotionBlurState()
    );
    expect(disabledMotionBlur).toMatchObject({
      enabled: false,
      damp: 0,
      intensity: 0,
    });
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);
  });

  test('clears afterimage history when nonzero blur returns to zero', async ({
    page,
  }) => {
    await waitForImmersive(page);

    await page.evaluate(() => {
      window.portfolio?.graphics?.setMotionBlurIntensity(0.5);
    });
    await page.waitForFunction(
      () => window.portfolio?.graphics?.getMotionBlurState().enabled === true
    );
    await wheelZoom(page);

    await page.evaluate(() => {
      window.portfolio?.graphics?.setMotionBlurIntensity(0);
    });
    await page.waitForFunction(
      () => window.portfolio?.graphics?.getMotionBlurState().enabled === false
    );
    await wheelZoom(page);

    const disabledMotionBlur = await page.evaluate(() =>
      window.portfolio?.graphics?.getMotionBlurState()
    );
    expect(disabledMotionBlur).toMatchObject({
      enabled: false,
      damp: 0,
      intensity: 0,
    });
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);
  });
});
