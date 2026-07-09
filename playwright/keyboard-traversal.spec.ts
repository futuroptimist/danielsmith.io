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

  test('cycles POIs while Controls remains open on desktop and mobile', async ({
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
      'data-controls-panel-open',
      ''
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-poi-detail-visible',
      ''
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

  test('shares mobile viewport between Controls and POI detail panels', async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForImmersiveReady(page);

    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const tooltip = page.locator('.poi-tooltip-overlay');

    await expect(page.locator('html')).toHaveAttribute(
      'data-hud-layout',
      'mobile'
    );
    await page.keyboard.press('KeyC');
    await page.keyboard.press('KeyE');

    await expect(controlsPopover).toBeVisible();
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');

    const boxes = await page.evaluate(() => {
      const controls = document.querySelector<HTMLElement>(
        '[data-role="controls-popover"]'
      );
      const tooltip = document.querySelector<HTMLElement>(
        '.poi-tooltip-overlay'
      );
      const canvas = document.querySelector<HTMLCanvasElement>('canvas');
      if (!controls || !tooltip || !canvas) {
        return null;
      }
      const toBox = (rect: DOMRect) => ({
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      });
      const controlRect = controls.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const overlapX = Math.max(
        0,
        Math.min(controlRect.right, tooltipRect.right) -
          Math.max(controlRect.left, tooltipRect.left)
      );
      const overlapY = Math.max(
        0,
        Math.min(controlRect.bottom, tooltipRect.bottom) -
          Math.max(controlRect.top, tooltipRect.top)
      );
      return {
        controls: toBox(controlRect),
        tooltip: toBox(tooltipRect),
        overlapArea: overlapX * overlapY,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        canvas: toBox(canvas.getBoundingClientRect()),
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
    expect(boxes!.canvas.width * boxes!.canvas.height).toBeGreaterThan(0);
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
