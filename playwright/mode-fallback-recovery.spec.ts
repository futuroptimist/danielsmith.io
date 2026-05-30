import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_DEBUG_URL = '/?mode=immersive&disablePerformanceFailover=1';
const TEXT_URL = '/?mode=text';

async function waitForImmersive(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function waitForTextFallback(page: Page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  await expect(
    page.locator('#app[data-mode="text"] .text-fallback')
  ).toBeVisible();
}

test.describe('mode fallback recovery', () => {
  test('pressing T toggles from immersive to text and back to immersive', async ({
    page,
  }) => {
    await page.goto(IMMERSIVE_DEBUG_URL, { waitUntil: 'domcontentloaded' });
    await waitForImmersive(page);

    await page.keyboard.press('T');
    await waitForTextFallback(page);
    await expect(page.locator('[data-action="immersive"]')).toContainText(
      'Try immersive again'
    );

    await page.keyboard.press('T');
    await waitForImmersive(page);
  });

  test('Try immersive again from explicit text mode returns to immersive', async ({
    page,
  }) => {
    await page.goto(TEXT_URL, { waitUntil: 'domcontentloaded' });
    await waitForTextFallback(page);

    await page.getByRole('link', { name: 'Try immersive again' }).click();
    await expect(page).toHaveURL(/mode=immersive/);
    await waitForImmersive(page);
  });

  test('explicit immersive URL wins over stored text preference', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('danielsmith.io:mode-preference', 'text');
    });

    await page.goto('/?mode=immersive', { waitUntil: 'domcontentloaded' });
    await waitForImmersive(page);
  });

  test('debug force-immersive URL remains valid for collection', async ({
    page,
  }) => {
    await page.goto(IMMERSIVE_DEBUG_URL, { waitUntil: 'domcontentloaded' });
    await waitForImmersive(page);

    await expect(page).toHaveURL(/mode=immersive/);
    await expect(page).toHaveURL(/disablePerformanceFailover=1/);
  });
});
