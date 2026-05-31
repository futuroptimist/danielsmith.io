import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_GITHUB_METRICS_URL =
  '/?mode=immersive&disablePerformanceFailover=1&enableLiveGitHubMetrics=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

const collectConsoleMessages = (
  page: Page,
  type: 'error' | 'warning'
): string[] => {
  const messages: string[] = [];
  page.on('console', (message) => {
    if (message.type() === type) {
      messages.push(message.text());
    }
  });
  return messages;
};

test.describe('GitHub repo metrics fallback', () => {
  test('keeps immersive usable and quiet when unauthenticated API calls return 403', async ({
    page,
  }) => {
    const consoleErrors = collectConsoleMessages(page, 'error');
    const consoleWarnings = collectConsoleMessages(page, 'warning');
    const failoverEvents: string[] = [];
    let githubRequestCount = 0;

    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.addEventListener('performancefailover', (event) => {
        const customEvent = event as CustomEvent<{ reason?: string }>;
        (
          window as Window & { __githubMetricsFailovers?: string[] }
        ).__githubMetricsFailovers ??= [];
        (
          window as Window & { __githubMetricsFailovers: string[] }
        ).__githubMetricsFailovers.push(
          customEvent.detail?.reason ?? 'unknown'
        );
      });
    });

    await page.route('https://api.github.com/repos/**', async (route) => {
      githubRequestCount += 1;
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'API rate limit exceeded' }),
      });
    });

    await page.goto(IMMERSIVE_GITHUB_METRICS_URL, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);
    await expect(page.locator('#control-overlay')).toBeVisible();
    await expect(page.locator('.poi-tooltip-overlay')).toHaveCount(1);

    const diagnostics = await page.evaluate(() =>
      window.portfolio?.github?.getRepoMetricsDiagnostics()
    );
    failoverEvents.push(
      ...(await page.evaluate(
        () =>
          (window as Window & { __githubMetricsFailovers?: string[] })
            .__githubMetricsFailovers ?? []
      ))
    );

    expect(githubRequestCount).toBe(1);
    expect(failoverEvents).toEqual([]);
    const githubResourceErrors = consoleErrors.filter(
      (message) =>
        message.includes('api.github.com') ||
        message.includes('Failed to load resource')
    );
    const appConsoleErrors = consoleErrors.filter(
      (message) => !githubResourceErrors.includes(message)
    );
    expect(appConsoleErrors).toEqual([]);
    expect(githubResourceErrors.length).toBeLessThanOrEqual(1);
    expect(
      consoleWarnings.filter((message) =>
        message.includes('GitHub repository metrics')
      )
    ).toHaveLength(1);
    expect(diagnostics).toMatchObject({
      source: 'static-fallback',
      lastErrorStatus: 403,
      requestCount: 1,
      suppressedRequestCount: expect.any(Number),
      warnedThisSession: true,
    });
    expect(diagnostics?.suppressedRequestCount ?? 0).toBeGreaterThan(0);
  });
});
