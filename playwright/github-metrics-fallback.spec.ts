import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const LIVE_METRICS_PREVIEW_URL =
  '/?mode=immersive&disablePerformanceFailover=1&enableLiveGitHubMetrics=1';

async function waitForImmersive(page: Page) {
  await page.goto(LIVE_METRICS_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

test.describe('GitHub metrics fallback', () => {
  test('keeps immersive stable and suppresses fan-out when GitHub returns 403', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const githubWarnings: string[] = [];
    let githubApiRequests = 0;

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
      if (
        message.type() === 'warning' &&
        message.text().includes('[github-metrics]')
      ) {
        githubWarnings.push(message.text());
      }
    });

    await page.route('https://api.github.com/repos/**', async (route) => {
      githubApiRequests += 1;
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'API rate limit exceeded' }),
      });
    });

    await page.addInitScript(() => {
      window.addEventListener('performancefailover', () => {
        document.documentElement.dataset.githubMetricsPerformanceFailover = '1';
      });
    });

    await waitForImmersive(page);

    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);

    await page.keyboard.press('KeyE');
    const tooltip = page.locator('.poi-tooltip-overlay');
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    await expect(tooltip.locator('.poi-tooltip-overlay__title')).not.toHaveText(
      ''
    );
    await expect(
      tooltip.locator('.poi-tooltip-overlay__metric-value').first()
    ).not.toHaveText('');

    const diagnostics = await page.evaluate(() =>
      window.portfolio?.github?.getRepoMetricsDiagnostics()
    );

    expect(githubApiRequests).toBeLessThanOrEqual(1);
    expect(githubWarnings.length).toBeLessThanOrEqual(1);
    expect(
      consoleErrors.filter((message) => message.includes('[github-metrics]'))
    ).toEqual([]);
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-github-metrics-performance-failover',
      '1'
    );
    expect(diagnostics).toMatchObject({
      source: 'static-fallback',
      lastErrorStatus: 403,
      requestCount: 1,
    });
    expect(diagnostics?.backoffExpiresAt).toEqual(expect.any(Number));
  });
});
