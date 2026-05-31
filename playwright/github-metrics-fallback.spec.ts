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
  test('keeps immersive stable and suppresses repo fan-out after GitHub 403', async ({
    page,
  }) => {
    const consoleErrors = collectConsoleMessages(page, 'error');
    const consoleWarnings = collectConsoleMessages(page, 'warning');
    const performanceFailovers: unknown[] = [];
    let githubRequestCount = 0;

    await page.addInitScript(() => {
      window.localStorage.clear();
      window.addEventListener('performancefailover', (event) => {
        (
          window as unknown as { __githubMetricsFailovers: unknown[] }
        ).__githubMetricsFailovers.push((event as CustomEvent).detail);
      });
      (
        window as unknown as { __githubMetricsFailovers: unknown[] }
      ).__githubMetricsFailovers = [];
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

    const diagnostics = await page.waitForFunction(() => {
      const snapshot = window.portfolio?.githubMetrics?.getDiagnostics?.();
      return snapshot?.lastErrorStatus === 403 ? snapshot : null;
    });
    const diagnosticsValue = await diagnostics.jsonValue();
    performanceFailovers.push(
      ...(await page.evaluate(
        () =>
          (window as unknown as { __githubMetricsFailovers: unknown[] })
            .__githubMetricsFailovers
      ))
    );

    expect(githubRequestCount).toBe(1);
    expect(diagnosticsValue).toMatchObject({
      source: 'static-fallback',
      lastErrorStatus: 403,
      requestCount: 1,
      warningCount: 1,
    });
    expect(performanceFailovers).toEqual([]);
    expect(
      consoleErrors.filter(
        (message) => !message.includes('Failed to load resource')
      )
    ).toEqual([]);
    expect(
      consoleWarnings.filter((message) =>
        message.includes('GitHub repo metrics are temporarily unavailable')
      )
    ).toHaveLength(1);
    await expect(page.locator('#control-overlay')).toBeVisible();
  });
});
