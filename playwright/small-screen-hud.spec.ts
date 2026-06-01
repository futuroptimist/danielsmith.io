import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL =
  '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=safe';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IDLE_THRESHOLD_BUFFER_MS = 4_500;

async function waitForImmersiveReady(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );

  const safeImmersiveButton = page.locator(
    '[data-action="continue-safe-immersive"]'
  );
  if ((await safeImmersiveButton.count()) > 0) {
    await safeImmersiveButton.click({ force: true });
    await expect(safeImmersiveButton).toHaveCount(0);
  }
}

async function getTooltipState(page: Page) {
  return page.evaluate(() => window.portfolio?.poi?.getTooltipState?.());
}

async function expectPopoverBoundedToViewport(page: Page) {
  const box = await page.evaluate(() => {
    const element = document.querySelector('[data-role="controls-popover"]');
    if (!(element instanceof HTMLElement)) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (!viewport) {
    return;
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

test.describe('small-screen HUD behavior', () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 320, height: 568 },
  });

  test('keeps controls compact and suppresses passive POI recommendations on mobile', async ({
    page,
  }) => {
    test.slow();
    await waitForImmersiveReady(page);

    const root = page.locator('html');
    const hud = page.locator('#control-overlay');
    const hudMenu = page.locator('[data-role="hud-menu"]');
    const controlsButton = page.locator('[data-role="controls-button"]');
    const settingsButton = page.locator('[data-role="settings-button"]');
    const textButton = page.locator('[data-role="text-mode-button"]');
    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const settingsModal = page.locator('.help-modal-backdrop');
    const tooltip = page.locator('.poi-tooltip-overlay');

    await expect(root).toHaveAttribute('data-hud-layout', 'mobile');
    await expect(hud).toBeVisible();
    await expect(hudMenu).toBeVisible();
    await expect(controlsButton).toBeVisible();
    await expect(settingsButton).toBeVisible();
    await expect(textButton).toBeVisible();
    await expect(controlsButton).toHaveAccessibleName(/open controls/i);
    await expect(settingsButton).toHaveAccessibleName(/settings and help/i);
    await expect(
      page.getByRole('button', { name: /text mode/i })
    ).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'false');
    await expect(controlsPopover).toBeHidden();

    await controlsButton.click({ force: true });
    await expect(controlsPopover).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'true');
    await expect(settingsModal).toBeHidden();
    await expectPopoverBoundedToViewport(page);

    await controlsButton.focus();
    await page.keyboard.press('Tab');
    await expect(textButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(settingsButton).toBeFocused();

    await settingsButton.click({ force: true });
    await expect(controlsPopover).toBeHidden();
    await expect(controlsButton).not.toHaveAttribute('aria-expanded', 'true');
    await expect(controlsButton).not.toHaveAttribute('aria-pressed', 'true');
    await expect(settingsModal).toBeVisible();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');

    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('.help-modal__close')?.click();
    });
    await expect(settingsModal).toBeHidden();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'false');

    await controlsButton.click({ force: true });
    await expect(controlsPopover).toBeVisible();
    await controlsButton.click({ force: true });
    await expect(controlsPopover).toBeHidden();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');

    await page.waitForTimeout(IDLE_THRESHOLD_BUFFER_MS);
    await expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    await expect(tooltip).not.toHaveAttribute('data-state', 'recommended');
    const tooltipState = await getTooltipState(page);
    expect(tooltipState?.overlayVisiblePoiId).toBeNull();
    expect(tooltipState?.worldTooltipVisible).toBe(false);
  });
});

test.describe('desktop HUD shortcuts', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('toggles controls with C and settings with H', async ({ page }) => {
    await waitForImmersiveReady(page);

    const hudMenu = page.locator('[data-role="hud-menu"]');
    const controlsButton = page.locator('[data-role="controls-button"]');
    const settingsButton = page.locator('[data-role="settings-button"]');
    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const settingsModal = page.locator('.help-modal-backdrop');

    await expect(page.locator('html')).toHaveAttribute(
      'data-hud-layout',
      'desktop'
    );
    await expect(hudMenu).toBeVisible();
    await expect(controlsPopover).toBeHidden();
    await expect(settingsModal).toBeHidden();

    await page.keyboard.press('KeyC');
    await expect(controlsPopover).toBeVisible();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('KeyC');
    await expect(controlsPopover).toBeHidden();
    await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');

    await page.keyboard.press('KeyC');
    await expect(controlsPopover).toBeVisible();
    await page.keyboard.press('KeyH');
    await expect(controlsPopover).toBeHidden();
    await expect(controlsButton).not.toHaveAttribute('aria-expanded', 'true');
    await expect(controlsButton).not.toHaveAttribute('aria-pressed', 'true');
    await expect(settingsModal).toBeVisible();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');
  });
});
