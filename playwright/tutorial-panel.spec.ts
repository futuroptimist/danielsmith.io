import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    portfolio?: {
      tutorial?: {
        recordMovementProgress(input: {
          right: number;
          forward: number;
          deltaSeconds: number;
          moved: boolean;
        }): void;
        recordZoomProgress(snapshot: {
          currentZoom?: number;
          targetZoom?: number;
          minZoom: number;
          maxZoom: number;
        }): void;
        recordFullZoomRange(): void;
        syncVisitedPois(visitedPoiIds: string[]): void;
        markGitshelvesVisited(): void;
      };
    };
  }
}

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL =
  '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous';

// Three stable, non-Gitshelves POI IDs from the registry.
const STABLE_POI_IDS = [
  'futuroptimist-living-room-tv',
  'tokenplace-studio-cluster',
  'gabriel-studio-sentry',
] as const;
const GITSHELVES_POI_ID = 'gitshelves-living-room-installation';

async function mockHardwareRenderer(page: Page) {
  await page.addInitScript(() => {
    const patchGetParameter = (
      prototype: WebGLRenderingContext | WebGL2RenderingContext
    ) => {
      const original = prototype.getParameter;
      Object.defineProperty(prototype, 'getParameter', {
        configurable: true,
        value(parameter: number) {
          if (parameter === this.RENDERER) {
            return 'WebGL';
          }
          if (parameter === this.VENDOR) {
            return 'Google Inc.';
          }
          if (parameter === 0x9246) {
            return 'ANGLE (NVIDIA, NVIDIA GeForce RTX, OpenGL)';
          }
          if (parameter === 0x9245) {
            return 'NVIDIA';
          }
          return original.call(this, parameter);
        },
      });
    };
    patchGetParameter(WebGLRenderingContext.prototype);
    if (typeof WebGL2RenderingContext !== 'undefined') {
      patchGetParameter(WebGL2RenderingContext.prototype);
    }
  });
}

const waitForImmersiveMode = async (page: Page) => {
  await mockHardwareRenderer(page);
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
};

const openPoiDetail = async (page: Page) => {
  const poiOverlay = page.locator('.poi-tooltip-overlay');
  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press('e');
    if (await poiOverlay.isVisible()) {
      break;
    }
  }
  await expect(poiOverlay).toBeVisible();
};

const expectTwoColumnHudMenu = async (page: Page) => {
  const menuButtons = page.locator('[data-role="hud-menu"] button');
  await expect(menuButtons).toHaveCount(4);
  await expect(page.locator('[data-hud-menu-label]')).toHaveText([
    'Controls',
    'Tutorial',
    'Text',
    'Settings',
  ]);

  const grid = await menuButtons.evaluateAll((buttons) => {
    const boxes = buttons.map((button) => button.getBoundingClientRect());
    return {
      firstRowTop: Math.round(boxes[0].top),
      secondRowTop: Math.round(boxes[2].top),
      firstColumnLeft: Math.round(boxes[0].left),
      secondColumnLeft: Math.round(boxes[1].left),
      thirdLeft: Math.round(boxes[2].left),
      fourthLeft: Math.round(boxes[3].left),
    };
  });
  expect(grid.secondColumnLeft).toBeGreaterThan(grid.firstColumnLeft);
  expect(grid.secondRowTop).toBeGreaterThan(grid.firstRowTop);
  expect(grid.thirdLeft).toBe(grid.firstColumnLeft);
  expect(grid.fourthLeft).toBe(grid.secondColumnLeft);
};

test.describe('Tutorial panel', () => {
  test('keeps the HUD menu in DOM and visual two-column order', async ({
    page,
  }) => {
    await waitForImmersiveMode(page);
    await expectTwoColumnHudMenu(page);

    await page.setViewportSize({ width: 390, height: 740 });
    await page.waitForFunction(
      () => document.documentElement.dataset.hudLayout === 'mobile',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await expectTwoColumnHudMenu(page);
  });

  test('auto-opens by default, dismisses without changing preference, and reopens with R', async ({
    page,
  }) => {
    await waitForImmersiveMode(page);

    const tutorialPanel = page.locator('#tutorial-panel');
    const tutorialButton = page.locator('[data-role="tutorial-button"]');
    const showOnStartup = page.locator(
      '[data-testid="tutorial-show-on-startup"]'
    );
    await expect(tutorialPanel).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'data-hud-tutorial-open',
      ''
    );
    await expect(tutorialButton).not.toBeFocused();
    await expect(showOnStartup).toBeChecked();

    await page.locator('[data-testid="tutorial-dismiss"]').click();
    await expect(tutorialPanel).toBeHidden();
    await expect(showOnStartup).toBeChecked();

    await page.keyboard.press('r');
    await expect(tutorialPanel).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(tutorialPanel).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-hud-tutorial-open',
      ''
    );
  });

  test('honors disabled show-on-startup preference after refresh', async ({
    page,
  }) => {
    await waitForImmersiveMode(page);

    const tutorialPanel = page.locator('#tutorial-panel');
    const showOnStartup = page.locator(
      '[data-testid="tutorial-show-on-startup"]'
    );
    await expect(tutorialPanel).toBeVisible();
    await showOnStartup.uncheck();
    await expect(showOnStartup).not.toBeChecked();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await expect(tutorialPanel).toBeHidden();

    await page.keyboard.press('r');
    await expect(tutorialPanel).toBeVisible();
  });

  test('keeps POI shortcuts active and lets Escape close Tutorial first', async ({
    page,
  }) => {
    await waitForImmersiveMode(page);

    const tutorialPanel = page.locator('#tutorial-panel');
    const poiOverlay = page.locator('.poi-tooltip-overlay');
    const poiTitle = page.locator('.poi-tooltip-overlay__title');

    await expect(tutorialPanel).toBeVisible();
    await openPoiDetail(page);
    const firstTitle = (await poiTitle.textContent())?.trim() ?? '';
    expect(firstTitle.length).toBeGreaterThan(0);

    await page.locator('[data-testid="tutorial-sidebar-collapse"]').focus();
    await page.keyboard.press('q');
    await expect(poiOverlay).toBeVisible();
    await expect(poiTitle).not.toHaveText(firstTitle);

    await page.keyboard.press('Escape');
    await expect(tutorialPanel).toBeHidden();
    await expect(poiOverlay).toBeVisible();
  });

  async function assertPanelBoundsNoOverlap(page: Page) {
    const boxes = await page.evaluate(() => {
      const tutorial = document.querySelector<HTMLElement>('#tutorial-panel');
      const poi = document.querySelector<HTMLElement>('.poi-tooltip-overlay');
      if (!tutorial || !poi) return null;
      const tutorialBox = tutorial.getBoundingClientRect();
      const poiBox = poi.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        tutorial: {
          top: tutorialBox.top,
          bottom: tutorialBox.bottom,
          left: tutorialBox.left,
          right: tutorialBox.right,
        },
        poi: {
          top: poiBox.top,
          bottom: poiBox.bottom,
          left: poiBox.left,
          right: poiBox.right,
        },
      };
    });
    if (!boxes) {
      throw new Error('Expected Tutorial and POI overlays to be mounted.');
    }
    // Tutorial must be inside the viewport (±1 px rounding tolerance on every edge).
    expect(boxes.tutorial.top).toBeGreaterThanOrEqual(-1);
    expect(boxes.tutorial.bottom).toBeLessThanOrEqual(boxes.viewportHeight + 1);
    expect(boxes.tutorial.left).toBeGreaterThanOrEqual(-1);
    expect(boxes.tutorial.right).toBeLessThanOrEqual(boxes.viewportWidth + 1);
    // POI must be inside the viewport.
    expect(boxes.poi.top).toBeGreaterThanOrEqual(0);
    expect(boxes.poi.bottom).toBeLessThanOrEqual(boxes.viewportHeight + 1);
    // Panels must not substantially overlap: tutorial bottom <= POI top.
    expect(boxes.tutorial.bottom).toBeLessThanOrEqual(boxes.poi.top + 1);
    // Visible scene area must exist outside the union of both panels.
    const unionTop = Math.min(boxes.tutorial.top, boxes.poi.top);
    const unionBottom = Math.max(boxes.tutorial.bottom, boxes.poi.bottom);
    const sceneAreaFraction =
      (boxes.viewportHeight - (unionBottom - unionTop)) / boxes.viewportHeight;
    expect(sceneAreaFraction).toBeGreaterThan(0.05);
    return boxes;
  }

  test('does not overlap POI details on mobile (portrait 390×740)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await waitForImmersiveMode(page);
    await page.waitForFunction(
      () => document.documentElement.dataset.hudLayout === 'mobile',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    await page.keyboard.press('c');
    await openPoiDetail(page);
    await page.keyboard.press('f');
    if (!(await page.locator('#tutorial-panel').isVisible())) {
      await page.keyboard.press('r');
    }
    await expect(page.locator('#tutorial-panel')).toBeVisible();
    await assertPanelBoundsNoOverlap(page);
  });

  test('does not overlap POI details on mobile (landscape 740×390)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 740, height: 390 });
    await waitForImmersiveMode(page);
    await page.waitForFunction(
      () => document.documentElement.dataset.hudLayout === 'mobile',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    await page.keyboard.press('c');
    await openPoiDetail(page);
    await page.keyboard.press('f');
    if (!(await page.locator('#tutorial-panel').isVisible())) {
      await page.keyboard.press('r');
    }
    await expect(page.locator('#tutorial-panel')).toBeVisible();
    await assertPanelBoundsNoOverlap(page);
  });

  test('Dismiss clears active and ARIA state', async ({ page }) => {
    await waitForImmersiveMode(page);

    const html = page.locator('html');
    const tutorialButton = page.locator('[data-role="tutorial-button"]');
    await expect(page.locator('#tutorial-panel')).toBeVisible();
    await expect(tutorialButton).toHaveAttribute('aria-expanded', 'true');

    await page.locator('[data-testid="tutorial-dismiss"]').click();

    await expect(page.locator('#tutorial-panel')).toBeHidden();
    await expect(html).not.toHaveAttribute('data-hud-tutorial-open', '');
    await expect(html).not.toHaveAttribute('data-active-hud-panel', 'tutorial');
    await expect(tutorialButton).toHaveAttribute('aria-expanded', 'false');
    await expect(tutorialButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('R closes an open Tutorial then reopens it', async ({ page }) => {
    await waitForImmersiveMode(page);

    const tutorialPanel = page.locator('#tutorial-panel');
    await expect(tutorialPanel).toBeVisible();

    // R should close the already-open Tutorial.
    await page.keyboard.press('r');
    await expect(tutorialPanel).toBeHidden();

    // R should reopen it.
    await page.keyboard.press('r');
    await expect(tutorialPanel).toBeVisible();
  });
});

test.describe('Tutorial progression hooks', () => {
  async function completeAllSteps(page: Page) {
    const tutorial = page.locator('#tutorial-panel');

    // Complete movement in all four directions.
    await page.evaluate(() => {
      const api = window.portfolio?.tutorial;
      if (!api) throw new Error('Tutorial portfolio API unavailable');
      api.recordMovementProgress({
        right: 0,
        forward: 1,
        deltaSeconds: 0.25,
        moved: true,
      });
      api.recordMovementProgress({
        right: -1,
        forward: 0,
        deltaSeconds: 0.25,
        moved: true,
      });
      api.recordMovementProgress({
        right: 0,
        forward: -1,
        deltaSeconds: 0.25,
        moved: true,
      });
      api.recordMovementProgress({
        right: 1,
        forward: 0,
        deltaSeconds: 0.25,
        moved: true,
      });
    });

    await expect(
      page.locator('[data-testid="tutorial-step-zoom"]')
    ).toBeEnabled();
    await page.locator('[data-testid="tutorial-step-zoom"]').click();

    // Complete zoom using the scene's own min/max constants via the helper.
    await page.evaluate(() => {
      const api = window.portfolio?.tutorial;
      if (!api) throw new Error('Tutorial portfolio API unavailable');
      api.recordFullZoomRange();
    });

    await expect(
      page.locator('[data-testid="tutorial-step-visitPois"]')
    ).toBeEnabled();
    await page.locator('[data-testid="tutorial-step-visitPois"]').click();

    // Mark three real stable POIs visited through the shared poiVisitedState.
    await page.evaluate(
      (ids) => {
        const api = window.portfolio?.tutorial;
        if (!api) throw new Error('Tutorial portfolio API unavailable');
        api.syncVisitedPois(ids);
      },
      [...STABLE_POI_IDS]
    );

    await expect(
      page.locator('[data-testid="tutorial-poi-counter"]')
    ).toContainText('3/3');
    await expect(
      page.locator('[data-testid="tutorial-step-findGitshelves"]')
    ).toBeEnabled();
    await page.locator('[data-testid="tutorial-step-findGitshelves"]').click();

    // Mark Gitshelves visited through syncVisitedPois so it flows through poiVisitedState.
    await page.evaluate((id) => {
      const api = window.portfolio?.tutorial;
      if (!api) throw new Error('Tutorial portfolio API unavailable');
      api.syncVisitedPois([id]);
    }, GITSHELVES_POI_ID);

    await expect(
      page.locator('[data-testid="tutorial-gitshelves-status"]')
    ).toContainText('✓');
    return tutorial;
  }

  test('completes all steps via portfolio API and persists after reload', async ({
    page,
  }) => {
    await waitForImmersiveMode(page);
    await completeAllSteps(page);

    // Reload and verify persisted progress.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    // Navigate to POI page and assert 3/3 count renders.
    await page.locator('[data-testid="tutorial-step-visitPois"]').click();
    await expect(
      page.locator('[data-testid="tutorial-poi-counter"]')
    ).toContainText('3/3');

    // Navigate to Gitshelves page and assert completion chip.
    await page.locator('[data-testid="tutorial-step-findGitshelves"]').click();
    await expect(
      page.locator('[data-testid="tutorial-gitshelves-status"]')
    ).toContainText('✓');

    // All four steps must remain enabled after reload.
    for (const stepId of [
      'welcomeMovement',
      'zoom',
      'visitPois',
      'findGitshelves',
    ]) {
      await expect(
        page.locator(`[data-testid="tutorial-step-${stepId}"]`)
      ).toBeEnabled();
    }
  });

  test('progress persists across dismiss and reopen without changing show-on-startup', async ({
    page,
  }) => {
    await waitForImmersiveMode(page);
    await completeAllSteps(page);

    const tutorialPanel = page.locator('#tutorial-panel');
    const showOnStartup = page.locator(
      '[data-testid="tutorial-show-on-startup"]'
    );
    await expect(showOnStartup).toBeChecked();

    // Dismiss the Tutorial.
    await page.locator('[data-testid="tutorial-dismiss"]').click();
    await expect(tutorialPanel).toBeHidden();
    // show-on-startup must not have been modified by the dismiss.
    await expect(showOnStartup).toBeChecked();

    // Reopen and verify all steps remain complete.
    await page.keyboard.press('r');
    await expect(tutorialPanel).toBeVisible();

    await page.locator('[data-testid="tutorial-step-visitPois"]').click();
    await expect(
      page.locator('[data-testid="tutorial-poi-counter"]')
    ).toContainText('3/3');

    await page.locator('[data-testid="tutorial-step-findGitshelves"]').click();
    await expect(
      page.locator('[data-testid="tutorial-gitshelves-status"]')
    ).toContainText('✓');
  });
});
