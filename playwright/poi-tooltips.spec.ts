import { expect, test } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';

test.describe('POI tooltip surfaces', () => {
  test('keeps rich details in the overlay and one title-only in-world cue', async ({
    page,
  }) => {
    await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    await page.keyboard.press('E');

    const overlay = page.locator('.poi-tooltip-overlay');
    await expect(overlay).toHaveAttribute('aria-hidden', 'false');
    await expect(overlay).toHaveAttribute('data-state', 'hovered');
    await expect(
      overlay.locator('.poi-tooltip-overlay__title')
    ).not.toBeEmpty();
    await expect(
      overlay.locator('.poi-tooltip-overlay__summary')
    ).not.toBeEmpty();
    await expect(
      overlay.locator('.poi-tooltip-overlay__metrics')
    ).toBeVisible();

    await page.waitForFunction(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = (window as any).portfolio?.poi?.getTooltipState?.();
      return state?.activeInWorldTooltipCount === 1;
    });

    const tooltipState = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).portfolio?.poi?.getTooltipState?.();
    });
    const overlayTitle =
      (
        await overlay.locator('.poi-tooltip-overlay__title').textContent()
      )?.trim() ?? '';

    expect(tooltipState.overlayPoiId).toBeTruthy();
    expect(tooltipState.worldTooltipVisible).toBe(true);
    expect(tooltipState.markerLabelVisible).toBe(false);
    expect(tooltipState.activeInWorldTooltipCount).toBe(1);
    expect(tooltipState.worldTooltipPoiId).toBe(tooltipState.overlayPoiId);
    expect(tooltipState.worldTooltipTitle).toBe(overlayTitle);
  });
});
