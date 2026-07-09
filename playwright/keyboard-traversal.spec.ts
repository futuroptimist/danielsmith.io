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
  test('cycles POIs while the Controls popover remains open', async ({
    page,
  }) => {
    test.slow();
    await waitForImmersiveReady(page);

    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const tooltip = page.locator('.poi-tooltip-overlay');
    const tooltipTitle = tooltip.locator('.poi-tooltip-overlay__title');

    await page.keyboard.press('KeyC');
    await expect(controlsPopover).toBeVisible();

    await page.keyboard.press('KeyE');
    await expect(controlsPopover).toBeVisible();
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('html')).toHaveAttribute(
      'data-hud-combined-panels',
      'true'
    );
    const firstTitle = (await tooltipTitle.textContent())?.trim() ?? '';
    expect(firstTitle.length).toBeGreaterThan(0);

    await page.keyboard.press('KeyE');
    await expect(controlsPopover).toBeVisible();
    const secondTitle = (await tooltipTitle.textContent())?.trim() ?? '';
    expect(secondTitle.length).toBeGreaterThan(0);
    expect(secondTitle).not.toEqual(firstTitle);

    await page.keyboard.press('KeyQ');
    await expect(controlsPopover).toBeVisible();
    await expect(tooltipTitle).toHaveText(firstTitle);
  });

  test('fits Controls and POI details together on mobile', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 390, height: 700 });
    await waitForImmersiveReady(page);

    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const tooltip = page.locator('.poi-tooltip-overlay');

    await page.keyboard.press('KeyC');
    await page.keyboard.press('KeyE');

    await expect(controlsPopover).toBeVisible();
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('html')).toHaveAttribute(
      'data-hud-layout',
      'mobile'
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-hud-combined-panels',
      'true'
    );

    const boxes = await page.evaluate(() => {
      const controls = document.querySelector('[data-role="controls-popover"]');
      const tooltip = document.querySelector('.poi-tooltip-overlay');
      const canvas = document.querySelector('canvas');
      if (!controls || !tooltip || !canvas) {
        return null;
      }
      const c = controls.getBoundingClientRect();
      const t = tooltip.getBoundingClientRect();
      const v = { width: window.innerWidth, height: window.innerHeight };
      const overlapX = Math.max(
        0,
        Math.min(c.right, t.right) - Math.max(c.left, t.left)
      );
      const overlapY = Math.max(
        0,
        Math.min(c.bottom, t.bottom) - Math.max(c.top, t.top)
      );
      const overlapArea = overlapX * overlapY;
      const canvasRect = canvas.getBoundingClientRect();
      return {
        controls: { top: c.top, bottom: c.bottom, height: c.height },
        tooltip: { top: t.top, bottom: t.bottom, height: t.height },
        viewport: v,
        overlapArea,
        canvas: { width: canvasRect.width, height: canvasRect.height },
      };
    });

    expect(boxes).not.toBeNull();
    expect(boxes!.overlapArea).toBeLessThan(24);
    expect(boxes!.controls.height).toBeLessThanOrEqual(
      boxes!.viewport.height * 0.5
    );
    expect(boxes!.tooltip.height).toBeLessThanOrEqual(
      boxes!.viewport.height * 0.5
    );
    expect(boxes!.tooltip.top - boxes!.controls.bottom).toBeGreaterThan(16);
    expect(boxes!.canvas.width * boxes!.canvas.height).toBeGreaterThan(0);
  });
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

    // Guided tour is opt-in by default, so idle recommendations stay hidden.
    await expect(tooltip).toHaveAttribute('data-state', 'hidden');

    // Cycle to the first POI using the keyboard-only binding (E).
    await page.keyboard.press('KeyE');
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');

    const firstTitle = (await tooltipTitle.textContent())?.trim() ?? '';
    expect(firstTitle.length).toBeGreaterThan(0);

    // Interact with the active POI using the default Enter binding.
    await page.keyboard.press('Enter');
    await expect(visitedBadge).toHaveJSProperty('hidden', false);

    // Move to the next POI and confirm the overlay updates.
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(150);
    const secondTitle = (await tooltipTitle.textContent())?.trim() ?? '';
    expect(secondTitle.length).toBeGreaterThan(0);
    expect(secondTitle).not.toEqual(firstTitle);

    // Tab forward until the help/menu button receives focus.
    let attempts = 0;
    while (
      !(await helpButton.evaluate(
        (element) => element === document.activeElement
      )) &&
      attempts < 8
    ) {
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
  test('keeps POI tooltip details in overlay and one title-only in-world cue', async ({
    page,
  }) => {
    test.slow();
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
    ).not.toBeEmpty();

    const state = await page.waitForFunction(() => {
      const tooltipState = window.portfolio?.poi?.getTooltipState?.();
      if (!tooltipState || !tooltipState.worldTooltipVisible) {
        return null;
      }
      if (tooltipState.activePoiMarkerLabelVisible) {
        return null;
      }
      if (tooltipState.activeInWorldTooltipCount !== 1) {
        return null;
      }
      if (tooltipState.visibleMarkerLabelCount !== 0) {
        return null;
      }
      if (tooltipState.totalInWorldTooltipCount !== 1) {
        return null;
      }
      return tooltipState;
    });
    const tooltipState = await state.jsonValue();

    expect(tooltipState.overlayVisiblePoiId).toBeTruthy();
    expect(tooltipState.worldTooltipVisible).toBe(true);
    expect(tooltipState.worldTooltipPoiId).toBe(
      tooltipState.overlayVisiblePoiId
    );
    expect(tooltipState.worldTooltipTitle).toBe(title);
    expect(tooltipState.activePoiMarkerLabelVisible).toBe(false);
    expect(tooltipState.markerLabelVisible).toBe(false);
    expect(tooltipState.markerLabelPoiId).toBeNull();
    expect(tooltipState.visibleMarkerLabelCount).toBe(0);
    expect(tooltipState.visibleMarkerLabelPoiIds).toEqual([]);
    expect(tooltipState.activeInWorldTooltipCount).toBe(1);
    expect(tooltipState.totalInWorldTooltipCount).toBe(1);
  });
});
