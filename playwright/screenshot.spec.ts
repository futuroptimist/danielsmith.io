import { expect, test } from '@playwright/test';

const screenshotPath = 'docs/assets/game-launch.png';
const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const WAIT_FOR_RENDER_MS = 2000;

test('capture launch state screenshot', async ({ page }) => {
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

  await page.waitForTimeout(WAIT_FOR_RENDER_MS);
  await page.screenshot({ path: screenshotPath, fullPage: true });
});
