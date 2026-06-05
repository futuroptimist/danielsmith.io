import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_GITHUB_METRICS_URL =
  '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_DEBUG_GITHUB_METRICS_URL = `${IMMERSIVE_GITHUB_METRICS_URL}&enableLiveGitHubMetrics=1`;

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
  test('updates a POI tooltip from runtime cache without browser fan-out', async ({
    page,
  }) => {
    await page.route('/runtime/github-metrics.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          schemaVersion: 1,
          generatedAt: '2026-06-03T00:00:00.000Z',
          expiresAt: '2999-06-03T01:15:00.000Z',
          source: 'github-api',
          repos: {
            'futuroptimist/danielsmith.io': {
              owner: 'futuroptimist',
              repo: 'danielsmith.io',
              stars: 1234,
              watchers: 5,
              forks: 6,
              openIssues: 7,
              pushedAt: '2026-06-03T00:00:00Z',
              fetchedAt: '2026-06-03T00:00:00.000Z',
              htmlUrl: 'https://github.com/futuroptimist/danielsmith.io',
            },
          },
          errors: {},
        }),
      })
    );
    const liveRequests: string[] = [];
    await page.route('https://api.github.com/repos/**', (route) => {
      liveRequests.push(route.request().url());
      return route.abort();
    });

    await page.goto(IMMERSIVE_GITHUB_METRICS_URL, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );

    const tooltip = page.locator('.poi-tooltip-overlay');
    await page.keyboard.press('KeyE');
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    await expect(
      tooltip.locator('.poi-tooltip-overlay__metrics')
    ).toContainText(/1\.2K stars|1,234 stars/i);

    const diagnostics = await page.evaluate<GitHubMetricsDiagnostics>(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).portfolio.githubMetrics.getDiagnostics();
    });
    expect(diagnostics).toMatchObject({
      source: 'runtime-cache',
      requestCount: 0,
      lastErrorStatus: null,
    });
    expect(liveRequests).toEqual([]);
  });

  test('keeps immersive stable and suppresses fan-out when GitHub returns 403 in debug live mode', async ({
    page,
  }) => {
    const consoleMessages = collectConsole(page);
    await page.route('/runtime/github-metrics.json', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{}',
      })
    );
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

    await page.goto(IMMERSIVE_DEBUG_GITHUB_METRICS_URL, {
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
    expect(consoleMessages.errors).toHaveLength(2);
    expect(
      consoleMessages.warnings.filter((message) =>
        message.includes('[github-metrics]')
      )
    ).toHaveLength(1);
  });
});
