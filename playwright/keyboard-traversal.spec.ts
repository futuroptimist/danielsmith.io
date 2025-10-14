import { expect, test } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

async function waitForImmersiveReady(page: import('@playwright/test').Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

test.describe('keyboard traversal macro', () => {
  test('cycles POIs and HUD overlays using keyboard input only', async ({
    page,
  }) => {
    test.slow();
    await waitForImmersiveReady(page);

    const tooltip = page.locator('.poi-tooltip-overlay');
    const tooltipTitle = tooltip.locator('.poi-tooltip-overlay__title');
    const visitedBadge = tooltip.locator('.poi-tooltip-overlay__visited');
    const helpButton = page.locator('[data-control="help"]');
    const helpBackdrop = page.locator('.help-modal-backdrop');

    await expect(tooltip).toHaveAttribute('data-state', 'hidden');

    // Cycle to the first POI using the keyboard-only binding (E).
    await page.keyboard.press('KeyE');
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');

    const firstTitle = (await tooltipTitle.textContent())?.trim() ?? '';
    expect(firstTitle.length).toBeGreaterThan(0);

    // Interact with the active POI using the default F binding.
    await page.keyboard.press('KeyF');
    await expect(visitedBadge).toHaveJSProperty('hidden', false);

    // Move to the next POI and confirm the overlay updates.
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(150);
    const secondTitle = (await tooltipTitle.textContent())?.trim() ?? '';
    expect(secondTitle.length).toBeGreaterThan(0);
    expect(secondTitle).not.toEqual(firstTitle);

    // Tab forward until the help/menu button receives focus.
    let attempts = 0;
    while (!(await helpButton.isFocused()) && attempts < 8) {
      await page.keyboard.press('Tab');
      attempts += 1;
    }
    await expect(helpButton).toBeFocused();

    // Open the help modal with Enter and ensure focus stays inside.
    await expect(helpBackdrop).toBeHidden();
    await page.keyboard.press('Enter');
    await expect(helpBackdrop).toBeVisible();

    await page.keyboard.press('Tab');
    const focusInsideModal = await page.evaluate(() => {
      return document.activeElement?.closest('.help-modal') !== null;
    });
    expect(focusInsideModal).toBe(true);

    // Close via Escape to finish the keyboard tour.
    await page.keyboard.press('Escape');
    await expect(helpBackdrop).toBeHidden();
  });
});
