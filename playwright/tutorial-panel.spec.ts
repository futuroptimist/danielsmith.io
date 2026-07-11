import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL =
  '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous';

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

  test('does not overlap POI details on mobile', async ({ page }) => {
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

    const boxes = await page.evaluate(() => {
      const tutorial = document.querySelector<HTMLElement>('#tutorial-panel');
      const poi = document.querySelector<HTMLElement>('.poi-tooltip-overlay');
      if (!tutorial || !poi) return null;
      const tutorialBox = tutorial.getBoundingClientRect();
      const poiBox = poi.getBoundingClientRect();
      return {
        viewportHeight: window.innerHeight,
        tutorial: { top: tutorialBox.top, bottom: tutorialBox.bottom },
        poi: { top: poiBox.top, bottom: poiBox.bottom },
      };
    });

    if (!boxes) {
      throw new Error('Expected Tutorial and POI overlays to be mounted.');
    }
    expect(boxes.tutorial.bottom).toBeLessThanOrEqual(boxes.poi.top + 1);
    expect(boxes.tutorial.top).toBeGreaterThan(0);
    expect(boxes.poi.bottom).toBeLessThanOrEqual(boxes.viewportHeight);
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
  test('tracks tutorial completion through stable persisted state', async ({
    page,
  }) => {
    await waitForImmersiveMode(page);
    const tutorialPanel = page.locator('#tutorial-panel');
    await expect(tutorialPanel).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem(
        'danielsmith.io:tutorial:v1:progress',
        JSON.stringify({
          version: 1,
          currentPageId: 'welcomeMovement',
          unlockedPageIds: ['welcomeMovement', 'zoom'],
          completedPageIds: ['welcomeMovement'],
          progress: {
            movement: {
              forwardSeconds: 0.25,
              leftSeconds: 0.25,
              backwardSeconds: 0.25,
              rightSeconds: 0.25,
              forwardComplete: true,
              leftComplete: true,
              backwardComplete: true,
              rightComplete: true,
            },
            zoom: { zoomInComplete: false, zoomOutComplete: false },
            pois: { visitedPoiIds: [], visitedCountGoal: 3 },
            gitshelves: { completed: false },
          },
        })
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await expect(
      page.locator('[data-testid="tutorial-step-zoom"]')
    ).toBeEnabled();

    await page.evaluate(() => {
      localStorage.setItem(
        'danielsmith.io:tutorial:v1:progress',
        JSON.stringify({
          version: 1,
          currentPageId: 'zoom',
          unlockedPageIds: ['welcomeMovement', 'zoom', 'visitPois'],
          completedPageIds: ['welcomeMovement', 'zoom'],
          progress: {
            movement: {
              forwardSeconds: 0.25,
              leftSeconds: 0.25,
              backwardSeconds: 0.25,
              rightSeconds: 0.25,
              forwardComplete: true,
              leftComplete: true,
              backwardComplete: true,
              rightComplete: true,
            },
            zoom: { zoomInComplete: true, zoomOutComplete: true },
            pois: { visitedPoiIds: [], visitedCountGoal: 3 },
            gitshelves: { completed: false },
          },
        })
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await expect(
      page.locator('[data-testid="tutorial-step-visitPois"]')
    ).toBeEnabled();

    await page.evaluate(() => {
      localStorage.setItem(
        'danielsmith.io:tutorial:v1:progress',
        JSON.stringify({
          version: 1,
          currentPageId: 'findGitshelves',
          unlockedPageIds: [
            'welcomeMovement',
            'zoom',
            'visitPois',
            'findGitshelves',
          ],
          completedPageIds: [
            'welcomeMovement',
            'zoom',
            'visitPois',
            'findGitshelves',
          ],
          progress: {
            movement: {
              forwardSeconds: 0.25,
              leftSeconds: 0.25,
              backwardSeconds: 0.25,
              rightSeconds: 0.25,
              forwardComplete: true,
              leftComplete: true,
              backwardComplete: true,
              rightComplete: true,
            },
            zoom: { zoomInComplete: true, zoomOutComplete: true },
            pois: {
              visitedPoiIds: [
                'alpha',
                'beta',
                'gamma',
                'gitshelves-living-room-installation',
              ],
              visitedCountGoal: 3,
            },
            gitshelves: { completed: true },
          },
        })
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await expect(
      page.locator('[data-testid="tutorial-gitshelves-status"]')
    ).toContainText('✓');
  });
});
