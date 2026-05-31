import { expect, test } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';

interface PoiTooltipStateApi {
  getTooltipState(): {
    overlayPoiId: string | null;
    overlayVisible: boolean;
    overlayTitle: string;
    overlaySummary: string;
    overlayOutcome: string;
    overlayMetrics: string[];
    worldTooltipPoiId: string | null;
    worldTooltipVisible: boolean;
    worldTooltipTitle: string | null;
    activeMarkerLabelVisible: boolean;
    activeInWorldTooltipCount: number;
  };
}

interface PortfolioWindow extends Window {
  portfolio?: {
    poi?: PoiTooltipStateApi;
  };
}

test.describe('POI tooltips', () => {
  test('keeps rich details in the overlay and one title-only in-world cue', async ({
    page,
  }) => {
    await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    const overlay = page.locator('.poi-tooltip-overlay');
    await expect(overlay).toHaveAttribute(
      'data-state',
      /recommended|hovered|selected/
    );
    await expect(overlay).toHaveAttribute('aria-hidden', 'false');

    await page.waitForFunction(
      () =>
        (window as PortfolioWindow).portfolio?.poi?.getTooltipState()
          .activeInWorldTooltipCount === 1,
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    const state = await page.evaluate(() =>
      (window as PortfolioWindow).portfolio?.poi?.getTooltipState()
    );
    expect(state).toBeTruthy();
    expect(state?.overlayVisible).toBe(true);
    expect(state?.overlayPoiId).toBe(state?.worldTooltipPoiId);
    expect(state?.worldTooltipVisible).toBe(true);
    expect(state?.worldTooltipTitle).toBe(state?.overlayTitle);
    expect(state?.activeMarkerLabelVisible).toBe(false);
    expect(state?.activeInWorldTooltipCount).toBe(1);
    expect(state?.overlaySummary.length).toBeGreaterThan(0);
    expect(
      state?.overlayOutcome.length || state?.overlayMetrics.join('').length
    ).toBeGreaterThan(0);
  });
});
