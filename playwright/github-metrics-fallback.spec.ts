import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_GITHUB_METRICS_URL =
  '/?mode=immersive&disablePerformanceFailover=1&enableLiveGitHubMetrics=1';

interface GitHubMetricsDiagnostics {
  source:
    | 'runtime-cache'
    | 'runtime-cache-stale'
    | 'browser-live'
    | 'cached'
    | 'static-neutral';
  requestCount: number;
  suppressedRequestCount: number;
  lastErrorStatus: number | 'network' | null;
  backoffExpiresAt: string | null;
}

const collectConsole = (page: Page) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
    if (message.type() === 'warning') {
      warnings.push(message.text());
    }
  });
  return { errors, warnings };
};

test.describe('GitHub repo metrics fallback', () => {
  test('keeps immersive stable and suppresses fan-out when GitHub returns 403', async ({
    page,
  }) => {
    const consoleMessages = collectConsole(page);
    await page.route('**/runtime/github-metrics.json', (route) => {
      const generatedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          schemaVersion: 1,
          generatedAt,
          expiresAt,
          source: 'github-api',
          repos: {},
          errors: {},
        }),
      });
    });
    await page.route('https://api.github.com/repos/**', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'API rate limit exceeded' }),
      })
    );
    await page.addInitScript(() => {
      window.localStorage.removeItem(
        'danielsmith.io:github-repo-stats:backoff'
      );
      window.sessionStorage.removeItem(
        'danielsmith.io:github-repo-stats:warning-shown'
      );
      window.addEventListener('performancefailover', () => {
        document.documentElement.dataset.performanceFailoverEvent = '1';
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
    await page.waitForFunction(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).portfolio?.githubMetrics?.getDiagnostics?.()
          ?.lastErrorStatus === 403,
      undefined,
      { timeout: 10_000 }
    );

    const diagnostics = await page.evaluate<GitHubMetricsDiagnostics>(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).portfolio.githubMetrics.getDiagnostics();
    });

    expect(diagnostics).toMatchObject({
      source: 'static-neutral',
      requestCount: 1,
      lastErrorStatus: 403,
    });
    expect(diagnostics.suppressedRequestCount).toBe(0);
    expect(diagnostics.backoffExpiresAt).toEqual(expect.any(String));
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('.poi-tooltip-overlay')).toHaveCount(1);
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-performance-failover-event',
      '1'
    );
    expect(
      consoleMessages.errors.filter(
        (message) => !message.includes('Failed to load resource')
      )
    ).toEqual([]);
    expect(consoleMessages.errors).toHaveLength(1);
    expect(
      consoleMessages.warnings.filter((message) =>
        message.includes('[github-metrics]')
      )
    ).toHaveLength(1);
  });
});
