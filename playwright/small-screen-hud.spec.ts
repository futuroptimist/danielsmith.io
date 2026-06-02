import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const POI_IDLE_TIMEOUT_MS = 4_000;

type PoiTooltipState = {
  overlayVisiblePoiId: string | null;
  worldTooltipVisible: boolean;
};

type PortfolioPoiWindow = Window & {
  portfolio?: {
    poi?: {
      getTooltipState?: () => PoiTooltipState;
    };
  };
};

async function waitForImmersiveReady(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await page.waitForFunction(
    () => (window as PortfolioPoiWindow).portfolio?.poi?.getTooltipState
  );
}

async function getPoiTooltipState(page: Page): Promise<PoiTooltipState> {
  return page.evaluate(() => {
    const state = (
      window as PortfolioPoiWindow
    ).portfolio?.poi?.getTooltipState?.();
    return {
      overlayVisiblePoiId: state?.overlayVisiblePoiId ?? null,
      worldTooltipVisible: state?.worldTooltipVisible ?? false,
    };
  });
}

test.describe('small-screen HUD regression coverage', () => {
  test.describe('mobile viewport', () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 375, height: 667 },
    });

    test('keeps mobile HUD compact and panel state mutually exclusive', async ({
      page,
    }) => {
      test.slow();
      await waitForImmersiveReady(page);

      const hud = page.locator('#control-overlay');
      const hudMenu = page.locator('[data-role="hud-menu"]');
      const controlsButton = page.locator('[data-role="controls-button"]');
      const textButton = page.locator('[data-role="text-mode-button"]');
      const settingsButton = page.locator('[data-role="settings-button"]');
      const controlsPopover = page.locator('[data-role="controls-popover"]');
      const settingsModal = page.locator('.help-modal-backdrop');

      await expect(page.locator('html')).toHaveAttribute(
        'data-hud-layout',
        'mobile'
      );
      await expect(hud).toBeVisible();
      await expect(hudMenu).toBeVisible();
      await expect(hudMenu.getByRole('button')).toHaveCount(3);
      await expect(controlsButton).toHaveAccessibleName(/Open controls.*C/);
      await expect(textButton).toHaveAccessibleName(/text mode.*T/i);
      await expect(settingsButton).toHaveAccessibleName(
        /(?:Open settings|Settings).*H/
      );

      const hudBox = await hud.boundingBox();
      expect(hudBox).not.toBeNull();
      expect(hudBox?.x).toBeGreaterThanOrEqual(0);
      expect(hudBox?.y).toBeGreaterThanOrEqual(0);
      expect((hudBox?.x ?? 0) + (hudBox?.width ?? 0)).toBeLessThanOrEqual(375);

      await expect(controlsPopover).toBeHidden();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
      await expect(settingsModal).toBeHidden();

      await controlsButton.tap();
      await expect(controlsPopover).toBeVisible();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'true');
      await expect(settingsModal).toBeHidden();

      const popoverBox = await controlsPopover.boundingBox();
      expect(popoverBox).not.toBeNull();
      expect(popoverBox?.x).toBeGreaterThanOrEqual(0);
      expect(popoverBox?.y).toBeGreaterThanOrEqual(0);
      expect(
        (popoverBox?.x ?? 0) + (popoverBox?.width ?? 0)
      ).toBeLessThanOrEqual(375);
      expect(
        (popoverBox?.y ?? 0) + (popoverBox?.height ?? 0)
      ).toBeLessThanOrEqual(667);

      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(
          () =>
            document.activeElement?.closest(
              '[data-role="controls-popover"]'
            ) !== null
        )
      ).toBe(false);

      await settingsButton.tap();
      await expect(controlsPopover).toBeHidden();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
      await expect(settingsModal).toBeVisible();
      await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
      await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');

      await page.keyboard.press('Escape');
      await expect(settingsModal).toBeHidden();
      await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(settingsButton).toHaveAttribute('aria-pressed', 'false');

      await controlsButton.tap();
      await expect(controlsPopover).toBeVisible();
      await controlsButton.tap();
      await expect(controlsPopover).toBeHidden();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');

      await page.waitForTimeout(POI_IDLE_TIMEOUT_MS + 500);
      await expect
        .poll(async () => getPoiTooltipState(page))
        .toMatchObject({
          overlayVisiblePoiId: null,
          worldTooltipVisible: false,
        });
    });
  });

  test.describe('desktop viewport', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('keeps desktop keyboard HUD toggles mutually exclusive', async ({
      page,
    }) => {
      await waitForImmersiveReady(page);

      const controlsButton = page.locator('[data-role="controls-button"]');
      const settingsButton = page.locator('[data-role="settings-button"]');
      const controlsPopover = page.locator('[data-role="controls-popover"]');
      const settingsModal = page.locator('.help-modal-backdrop');

      await expect(page.locator('html')).toHaveAttribute(
        'data-hud-layout',
        'desktop'
      );
      await expect(page.locator('[data-role="hud-menu"]')).toBeVisible();
      await expect(controlsButton).toHaveAccessibleName(/Open controls.*C/);
      await expect(settingsButton).toHaveAccessibleName(
        /(?:Open settings|Settings).*H/
      );

      await expect(controlsPopover).toBeHidden();
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
      await expect(settingsModal).toBeVisible();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
      await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
      await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
