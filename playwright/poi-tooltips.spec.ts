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

test.describe('POI tooltip surfaces', () => {
  test('keeps the 2D details overlay and one title-only in-world cue', async ({
    page,
  }) => {
    await waitForImmersiveReady(page);

    const tooltip = page.locator('.poi-tooltip-overlay');
    await page.keyboard.press('KeyE');
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');

    const title = (
      await tooltip.locator('.poi-tooltip-overlay__title').textContent()
    )?.trim();
    expect(title?.length).toBeGreaterThan(0);
    await expect(
      tooltip.locator('.poi-tooltip-overlay__summary')
    ).not.toBeEmpty();
    await expect(
      tooltip.locator('.poi-tooltip-overlay__metrics')
    ).toBeVisible();

    await page.waitForFunction(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = (window as any).portfolio?.poi?.getTooltipState?.();
        return (
          state?.worldTooltipVisible && state?.activeInWorldTooltipCount === 1
        );
      },
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    const state = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).portfolio?.poi?.getTooltipState?.();
    });

    expect(state.overlayPoiId).toBeTruthy();
    expect(state.worldTooltipPoiId).toBe(state.overlayPoiId);
    expect(state.worldTooltipTitle).toBe(title);
    expect(state.activeMarkerLabelVisible).toBe(false);
    expect(state.activeInWorldTooltipCount).toBe(1);
  });
});
