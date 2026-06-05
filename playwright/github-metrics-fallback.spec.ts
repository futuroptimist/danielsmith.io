import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_GITHUB_METRICS_URL =
  '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=safe';

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
  cachedRepoCount: number;
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
  test('loads pod-local runtime cache without browser GitHub API fan-out', async ({
    page,
  }) => {
    const consoleMessages = collectConsole(page);
    const liveRequests: string[] = [];
    await page.route('https://api.github.com/repos/**', (route) => {
      liveRequests.push(route.request().url());
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'unexpected browser live fetch' }),
      });
    });
    await page.route('**/runtime/github-metrics.json', (route) =>
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
              stars: 77,
              watchers: 1,
              forks: 2,
              openIssues: 0,
              pushedAt: '2026-06-03T00:00:00Z',
              fetchedAt: '2026-06-03T00:00:00.000Z',
              htmlUrl: 'https://github.com/futuroptimist/danielsmith.io',
            },
          },
          errors: {},
        }),
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
          ?.cachedRepoCount === 1,
      undefined,
      { timeout: 10_000 }
    );

    const diagnostics = await page.evaluate<GitHubMetricsDiagnostics>(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).portfolio.githubMetrics.getDiagnostics();
    });

    expect(diagnostics).toMatchObject({
      requestCount: 0,
      lastErrorStatus: null,
      cachedRepoCount: 1,
    });
    expect(['runtime-cache', 'cached']).toContain(diagnostics.source);
    expect(liveRequests).toEqual([]);
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
    expect(
      consoleMessages.warnings.filter((message) =>
        message.includes('[github-metrics]')
      )
    ).toHaveLength(0);
  });
});
