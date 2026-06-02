import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IDLE_THRESHOLD_BUFFER_MS = 4_500;

async function waitForImmersiveReady(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

async function getPoiTooltipState(page: Page) {
  return page.evaluate(() => window.portfolio?.poi?.getTooltipState?.());
}

test.describe('small-screen HUD regressions', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
    isMobile: true,
  });

  test('keeps the iPhone SE HUD compact and panel states exclusive', async ({
    page,
  }) => {
    test.slow();
    await waitForImmersiveReady(page);

    await expect(page.locator('html')).toHaveAttribute(
      'data-hud-layout',
      'mobile'
    );

    const hud = page.locator('#control-overlay');
    const menu = page.locator('[data-role="hud-menu"]');
    const controlsButton = page.locator('[data-role="controls-button"]');
    const settingsButton = page.locator('[data-role="settings-button"]');
    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const settingsModal = page.locator('.help-modal-backdrop');

    await expect(hud).toBeVisible();
    await expect(menu).toBeVisible();
    await expect(controlsButton).toBeVisible();
    await expect(controlsButton).toHaveAccessibleName(/Controls/i);
    await expect(settingsButton).toBeVisible();
    await expect(settingsButton).toHaveAccessibleName(/Settings/i);
    await expect(controlsPopover).toBeHidden();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');

    await controlsButton.tap();
    await expect(controlsPopover).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'true');

    const popoverBounds = await controlsPopover.boundingBox();
    expect(popoverBounds).not.toBeNull();
    expect(popoverBounds?.x).toBeGreaterThanOrEqual(0);
    expect(popoverBounds?.y).toBeGreaterThanOrEqual(0);
    expect(
      (popoverBounds?.x ?? 0) + (popoverBounds?.width ?? 0)
    ).toBeLessThanOrEqual(375);
    expect(
      (popoverBounds?.y ?? 0) + (popoverBounds?.height ?? 0)
    ).toBeLessThanOrEqual(667);

    await settingsButton.tap();
    await expect(controlsPopover).toBeHidden();
    await expect(settingsModal).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: /Close help/i }).click();
    await expect(settingsModal).toBeHidden();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');

    await controlsButton.tap();
    await expect(controlsPopover).toBeVisible();
    await controlsButton.tap();
    await expect(controlsPopover).toBeHidden();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');

    await page.waitForTimeout(IDLE_THRESHOLD_BUFFER_MS);
    const tooltipState = await getPoiTooltipState(page);
    expect(tooltipState).toMatchObject({
      overlayVisiblePoiId: null,
      worldTooltipVisible: false,
      visibleMarkerLabelCount: 0,
      activeInWorldTooltipCount: 0,
      totalInWorldTooltipCount: 0,
    });
    await expect(page.locator('.poi-tooltip-overlay')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });
});

test.describe('desktop HUD regressions', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('keeps keyboard shortcuts mutually exclusive across HUD panels', async ({
    page,
  }) => {
    test.slow();
    await waitForImmersiveReady(page);

    await expect(page.locator('html')).toHaveAttribute(
      'data-hud-layout',
      'desktop'
    );

    const menu = page.locator('[data-role="hud-menu"]');
    const controlsButton = page.locator('[data-role="controls-button"]');
    const settingsButton = page.locator('[data-role="settings-button"]');
    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const settingsModal = page.locator('.help-modal-backdrop');

    await expect(menu).toBeVisible();
    await expect(controlsButton).toBeVisible();
    await expect(controlsButton).toHaveAccessibleName(/Controls/i);
    await expect(settingsButton).toBeVisible();
    await expect(settingsButton).toHaveAccessibleName(/Settings/i);
    await expect(controlsPopover).toBeHidden();
    await expect(settingsModal).toBeHidden();

    await page.keyboard.press('KeyC');
    await expect(controlsPopover).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('KeyH');
    await expect(controlsPopover).toBeHidden();
    await expect(settingsModal).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');
  });
});
