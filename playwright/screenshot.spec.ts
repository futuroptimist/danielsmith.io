import { test } from '@playwright/test';
const screenshotPath = 'docs/assets/game-launch.png';

const WAIT_FOR_RENDER_MS = 2000;

test('capture launch state screenshot', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(WAIT_FOR_RENDER_MS);
  await page.screenshot({ path: screenshotPath, fullPage: true });
});
