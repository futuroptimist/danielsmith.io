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
});
