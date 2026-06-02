import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IDLE_THRESHOLD_BUFFER_MS = 4_500;

interface PoiTooltipState {
  overlayVisiblePoiId: string | null;
  worldTooltipVisible: boolean;
  worldTooltipPoiId: string | null;
  markerLabelVisible: boolean;
  markerLabelPoiId: string | null;
  visibleMarkerLabelCount: number;
  activePoiMarkerLabelVisible: boolean;
  activeInWorldTooltipCount: number;
  totalInWorldTooltipCount: number;
}

interface PortfolioPoiWindow extends Window {
  portfolio?: {
    poi?: {
      getTooltipState?: () => PoiTooltipState;
    };
  };
}

async function waitForImmersiveReady(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

async function dismissSoftwareRendererWarning(page: Page) {
  const safeButton = page.getByRole('button', {
    name: /continue in safe immersive/i,
  });
  if ((await safeButton.count()) > 0) {
    await safeButton.click();
    await expect(
      page.locator('[data-software-renderer-warning="true"]')
    ).toBeHidden();
  }
}

async function pressShortcut(page: Page, key: string) {
  await page.keyboard.down(key);
  await page.waitForTimeout(150);
  await page.keyboard.up(key);
}

async function getTooltipState(page: Page): Promise<PoiTooltipState> {
  return page.evaluate(() => {
    const portfolioWindow = window as PortfolioPoiWindow;
    const state = portfolioWindow.portfolio?.poi?.getTooltipState?.();
    if (!state) {
      throw new Error('window.portfolio.poi.getTooltipState is unavailable.');
    }
    return state;
  });
}

test.describe('small-screen HUD behavior', () => {
  test('keeps the iPhone SE HUD compact and suppresses passive POI overlays', async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 320, height: 568 });
    await waitForImmersiveReady(page);

    const html = page.locator('html');
    const hudMenu = page.locator('[data-role="hud-menu"]');
    await dismissSoftwareRendererWarning(page);

    const controlsButton = page.locator('[data-role="controls-button"]');
    const settingsButton = page.locator('[data-role="settings-button"]');
    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const helpBackdrop = page.locator('.help-modal-backdrop');
    const poiOverlay = page.locator('.poi-tooltip-overlay');

    await expect(html).toHaveAttribute('data-hud-layout', 'mobile');
    await expect(hudMenu).toBeVisible();
    await expect(controlsButton).toBeVisible();
    await expect(settingsButton).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-label', /controls/i);
    await expect(settingsButton).toHaveAttribute('aria-label', /settings/i);
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'false');
    await expect(controlsPopover).toBeHidden();

    await controlsButton.click();
    await expect(controlsPopover).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'true');

    const popoverBounds = await controlsPopover.boundingBox();
    expect(popoverBounds).not.toBeNull();
    expect(popoverBounds?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect(popoverBounds?.y ?? -1).toBeGreaterThanOrEqual(0);
    expect(
      (popoverBounds?.x ?? 0) + (popoverBounds?.width ?? 0)
    ).toBeLessThanOrEqual(320);
    expect(
      (popoverBounds?.y ?? 0) + (popoverBounds?.height ?? 0)
    ).toBeLessThanOrEqual(568);

    await page.locator('[data-role="controls-close"]').focus();
    await page.keyboard.press('Tab');
    const focusInsideControls = await page.evaluate(
      () =>
        document.activeElement?.closest('[data-role="controls-popover"]') !==
        null
    );
    expect(focusInsideControls).toBe(false);

    await settingsButton.click();
    await expect(controlsPopover).toBeHidden();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
    await expect(helpBackdrop).toBeVisible();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');
    expect((await getTooltipState(page)).overlayVisiblePoiId).toBeNull();

    await page.getByRole('button', { name: /close/i }).click();
    await expect(helpBackdrop).toBeHidden();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'false');

    await controlsButton.click();
    await expect(controlsPopover).toBeVisible();
    await controlsButton.click();
    await expect(controlsPopover).toBeHidden();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');

    await page.waitForTimeout(IDLE_THRESHOLD_BUFFER_MS);
    await expect(poiOverlay).toHaveAttribute('aria-hidden', 'true');
    const tooltipState = await getTooltipState(page);
    expect(tooltipState.overlayVisiblePoiId).toBeNull();
    expect(tooltipState.worldTooltipVisible).toBe(false);
    expect(tooltipState.worldTooltipPoiId).toBeNull();
    expect(tooltipState.markerLabelVisible).toBe(false);
    expect(tooltipState.markerLabelPoiId).toBeNull();
    expect(tooltipState.visibleMarkerLabelCount).toBe(0);
    expect(tooltipState.activePoiMarkerLabelVisible).toBe(false);
    expect(tooltipState.activeInWorldTooltipCount).toBe(0);
    expect(tooltipState.totalInWorldTooltipCount).toBe(0);
  });

  test('toggles desktop HUD panels with keyboard shortcuts', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await waitForImmersiveReady(page);

    const html = page.locator('html');
    const hudMenu = page.locator('[data-role="hud-menu"]');
    await dismissSoftwareRendererWarning(page);

    const controlsButton = page.locator('[data-role="controls-button"]');
    const settingsButton = page.locator('[data-role="settings-button"]');
    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const helpBackdrop = page.locator('.help-modal-backdrop');

    await expect(html).toHaveAttribute('data-hud-layout', 'desktop');
    await expect(hudMenu).toBeVisible();
    await expect(controlsButton).toBeVisible();
    await expect(settingsButton).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-label', /controls/i);
    await expect(settingsButton).toHaveAttribute('aria-label', /settings/i);
    await expect(controlsPopover).toBeHidden();

    await pressShortcut(page, 'KeyC');
    await expect(controlsPopover).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'true');

    await pressShortcut(page, 'KeyH');
    await expect(controlsPopover).toBeHidden();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
    await expect(helpBackdrop).toBeVisible();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');

    await pressShortcut(page, 'KeyH');
    await expect(helpBackdrop).toBeHidden();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'false');
  });
});
