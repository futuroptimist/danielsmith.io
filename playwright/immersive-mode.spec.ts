import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';

const collectConsoleErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  return errors;
};

const collectPageErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error instanceof Error ? error.message : String(error));
  });
  return errors;
};

const waitForImmersiveMode = async (page: Page) => {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
};

const expectPoiCycleWithControlsOpen = async (page: Page) => {
  const controlsPopover = page.locator('[data-role="controls-popover"]');
  const poiOverlay = page.locator('.poi-tooltip-overlay');
  const poiTitle = page.locator('.poi-tooltip-overlay__title');

  await page.keyboard.press('e');
  await expect(controlsPopover).toBeVisible();
  await expect(poiOverlay).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-hud-controls-open',
    ''
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-poi-detail-visible',
    ''
  );
  await expect(poiTitle).not.toHaveText('');
  const nextTitle = (await poiTitle.textContent())?.trim() ?? '';
  expect(nextTitle.length).toBeGreaterThan(0);

  await page.keyboard.press('q');
  await expect(controlsPopover).toBeVisible();
  await expect(poiOverlay).toBeVisible();
  await expect(poiTitle).not.toHaveText(nextTitle);
};

test.describe('immersive experience', () => {
  test('initializes without falling back to text mode', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const pageErrors = collectPageErrors(page);

    // Force immersive mode and bypass low-FPS failover heuristics used for production visitors.
    await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });

    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);
    await expect(page.locator('#control-overlay')).toBeVisible();

    const immersiveInitFailures = consoleErrors.filter((message) =>
      message.includes('Failed to initialize immersive scene')
    );

    expect.soft(immersiveInitFailures).toHaveLength(0);
    expect.soft(pageErrors).toHaveLength(0);
  });

  test('upper floor shows only when ascending stairs; ceilings are translucent', async ({
    page,
  }) => {
    await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    // Ground floor should be active at launch.
    await expect(page.locator('html')).toHaveAttribute(
      'data-active-floor',
      'ground'
    );

    // Read ceiling opacities via the exposed world API to ensure translucency.
    const opacities = await page.evaluate(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).portfolio?.world?.getCeilingOpacities?.() ?? []
    );
    expect(Array.isArray(opacities)).toBe(true);
    expect(opacities.length).toBeGreaterThan(0);
    for (const value of opacities) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeLessThan(0.2);
    }

    // Programmatically switch to upper floor using the test API.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).portfolio?.world?.setActiveFloor?.('upper');
    });

    // Verify DOM dataset reflects the change; renderer visibility is tied to this.
    await expect(page.locator('html')).toHaveAttribute(
      'data-active-floor',
      'upper'
    );

    // Switch back to ground to ensure toggling does not regress.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).portfolio?.world?.setActiveFloor?.('ground');
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-active-floor',
      'ground'
    );
  });

  test('HUD menu hides optional controls until opened', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    const menuButton = page.locator('[data-control="help"]');
    const audioHud = page.locator('.audio-hud');
    const graphicsControl = page.locator('.graphics-quality');
    const accessibilityControl = page.locator('.accessibility-presets');
    const modeToggle = page.locator('.mode-toggle');
    const poiOverlay = page.locator('.poi-tooltip-overlay');
    const lightingIndicator = page.locator('.lighting-debug-indicator');

    // Guided tour is opt-in by default, so idle recommendations stay hidden.
    await expect(poiOverlay).toHaveAttribute('data-state', 'hidden');
    await expect(poiOverlay).toHaveAttribute('aria-hidden', 'true');
    await expect(lightingIndicator).toBeHidden();

    await expect(audioHud).toHaveCount(1);
    await expect(graphicsControl).toHaveCount(1);
    await expect(accessibilityControl).toHaveCount(1);
    await expect(modeToggle).toHaveCount(1);

    await expect(audioHud).toBeHidden();
    await expect(graphicsControl).toBeHidden();
    await expect(accessibilityControl).toBeHidden();
    await expect(modeToggle).toBeHidden();

    await menuButton.click();

    const backdrop = page.locator('.help-modal-backdrop');
    await expect(backdrop).toBeVisible();
    await expect(audioHud).toBeVisible();
    await expect(graphicsControl).toBeVisible();
    await expect(accessibilityControl).toBeVisible();
    await expect(modeToggle).toBeVisible();

    await page.evaluate(() => {
      const button =
        document.querySelector<HTMLButtonElement>('.help-modal__close');
      button?.click();
    });
    await expect(backdrop).toBeHidden();
    await expect(audioHud).toBeHidden();
    await expect(graphicsControl).toBeHidden();
    await expect(accessibilityControl).toBeHidden();
    await expect(modeToggle).toBeHidden();
    // After closing help modal, overlay remains hidden until the tour is enabled.
    await expect(poiOverlay).toHaveAttribute('data-state', 'hidden');
  });
  test('cycles POI details while Controls is open', async ({ page }) => {
    await waitForImmersiveMode(page);

    const controlsPopover = page.locator('[data-role="controls-popover"]');

    await page.keyboard.press('c');
    await expect(controlsPopover).toBeVisible();
    await expectPoiCycleWithControlsOpen(page);
  });

  test('cycles POI details after opening Controls from the menu button', async ({
    page,
  }) => {
    await waitForImmersiveMode(page);

    const controlsButton = page.locator('[data-role="controls-button"]');
    const controlsPopover = page.locator('[data-role="controls-popover"]');

    await controlsButton.click();
    await expect(controlsPopover).toBeVisible();
    await expectPoiCycleWithControlsOpen(page);
  });

  test('keeps Settings open and conservative during POI cycling shortcuts', async ({
    page,
  }) => {
    await waitForImmersiveMode(page);

    const settingsBackdrop = page.locator('.help-modal-backdrop');
    const poiOverlay = page.locator('.poi-tooltip-overlay');

    await page.keyboard.press('h');
    await expect(settingsBackdrop).toBeVisible();

    await page.keyboard.press('e');
    await page.keyboard.press('q');
    await expect(settingsBackdrop).toBeVisible();
    await expect(poiOverlay).toHaveAttribute('data-state', 'hidden');
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-poi-detail-visible',
      ''
    );
  });

  test('fits Controls and POI details together on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await page.waitForFunction(
      () => document.documentElement.dataset.hudLayout === 'mobile',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    const controlsPopover = page.locator('[data-role="controls-popover"]');
    const poiOverlay = page.locator('.poi-tooltip-overlay');

    await page.keyboard.press('c');
    for (let index = 0; index < 4; index += 1) {
      await page.keyboard.press('e');
      if (await poiOverlay.isVisible()) {
        break;
      }
    }

    await expect(controlsPopover).toBeVisible();
    await expect(poiOverlay).toBeVisible();

    const boxes = await page.evaluate(() => {
      const controls = document.querySelector<HTMLElement>(
        '[data-role="controls-popover"]'
      );
      const poi = document.querySelector<HTMLElement>('.poi-tooltip-overlay');
      if (!controls || !poi) {
        return null;
      }
      const controlsBox = controls.getBoundingClientRect();
      const poiBox = poi.getBoundingClientRect();
      return {
        viewportHeight: window.innerHeight,
        controls: {
          top: controlsBox.top,
          bottom: controlsBox.bottom,
          height: controlsBox.height,
        },
        poi: {
          top: poiBox.top,
          bottom: poiBox.bottom,
          height: poiBox.height,
        },
        gutter: {
          height: poiBox.top - controlsBox.bottom,
          hasCanvasPoint: Array.from({ length: 7 }, (_, index) =>
            Math.round((window.innerWidth * (index + 1)) / 8)
          )
            .concat([4, window.innerWidth - 4])
            .some(
              (x) =>
                document.elementFromPoint(
                  x,
                  (controlsBox.bottom + poiBox.top) / 2
                )?.tagName === 'CANVAS'
            ),
        },
      };
    });

    if (!boxes) {
      throw new Error('Expected Controls and POI overlays to be mounted.');
    }
    expect(boxes.controls.bottom).toBeLessThanOrEqual(boxes.poi.top + 1);
    expect(boxes.controls.height).toBeLessThanOrEqual(
      boxes.viewportHeight * 0.5
    );
    expect(boxes.poi.height).toBeLessThanOrEqual(boxes.viewportHeight * 0.5);
    expect(boxes.controls.top).toBeGreaterThan(0);
    expect(boxes.poi.bottom).toBeLessThanOrEqual(boxes.viewportHeight);
    expect(boxes.controls.top).toBeGreaterThan(4);
    expect(boxes.gutter.height).toBeGreaterThan(8);
    expect(boxes.gutter.hasCanvasPoint).toBe(true);

    await page.keyboard.press('Escape');
    await expect(controlsPopover).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-hud-controls-open',
      ''
    );
    const poiState = await poiOverlay.getAttribute('data-state');
    if (poiState !== 'hidden') {
      await expect(page.locator('html')).toHaveAttribute(
        'data-poi-detail-visible',
        ''
      );
    } else {
      await expect(page.locator('html')).not.toHaveAttribute(
        'data-poi-detail-visible',
        ''
      );
    }
  });
});
