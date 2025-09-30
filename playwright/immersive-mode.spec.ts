import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

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

    await page.goto('/', { waitUntil: 'domcontentloaded' });

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
});
