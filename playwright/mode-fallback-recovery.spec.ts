import { expect, test } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const DEBUG_IMMERSIVE_URL = '/?mode=immersive&disablePerformanceFailover=1';
const TEXT_FALLBACK_SELECTOR = '#app[data-mode="text"] .text-fallback';

async function waitForImmersive(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function waitForTextFallback(page: import('@playwright/test').Page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  await expect(page.locator(TEXT_FALLBACK_SELECTOR)).toBeVisible();
}

test.describe('mode and fallback recovery', () => {
  test('T toggles from forced immersive to text mode and back to immersive', async ({
    page,
  }) => {
    await page.goto(DEBUG_IMMERSIVE_URL, { waitUntil: 'domcontentloaded' });
    await waitForImmersive(page);

    await page.keyboard.press('T');
    await waitForTextFallback(page);

    await page.keyboard.press('T');
    await waitForImmersive(page);
    await expect(page).toHaveURL(/mode=immersive/);
  });

  test('manual text mode exposes a recovery link back to immersive', async ({
    page,
  }) => {
    await page.goto('/?mode=text', { waitUntil: 'domcontentloaded' });
    await waitForTextFallback(page);

    await page.getByRole('link', { name: /try immersive again/i }).click();
    await waitForImmersive(page);
    await expect(page).toHaveURL(/mode=immersive/);
  });

  test('immersive query override wins over saved text preference', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('danielsmith.io:mode-preference', 'text');
    });

    await page.goto('/?mode=immersive', { waitUntil: 'domcontentloaded' });
    await waitForImmersive(page);
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  });

  test('debug immersive URL remains valid for collection', async ({ page }) => {
    await page.goto(DEBUG_IMMERSIVE_URL, { waitUntil: 'domcontentloaded' });
    await waitForImmersive(page);
    await expect(page).toHaveURL(/mode=immersive/);
    await expect(page).toHaveURL(/disablePerformanceFailover=1/);
  });
});
