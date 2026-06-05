import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_GITHUB_METRICS_URL =
  '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=safe';

const RUNTIME_CACHE_REPOS = [
  'futuroptimist/danielsmith.io',
  'futuroptimist/token.place',
  'futuroptimist/gabriel',
  'futuroptimist/flywheel',
  'futuroptimist/jobbot3000',
  'futuroptimist/gitshelves',
  'futuroptimist/f2clipboard',
  'futuroptimist/sigma',
  'futuroptimist/wove',
  'democratizedspace/dspace',
  'futuroptimist/pr-reaper',
] as const;

const createRuntimeCacheRepos = () =>
  Object.fromEntries(
    RUNTIME_CACHE_REPOS.map((key, index) => {
      const [owner, repo] = key.split('/');
      return [
        key,
        {
          owner,
          repo,
          stars: 77 + index,
          watchers: 1,
          forks: 2,
          openIssues: 0,
          pushedAt: '2026-06-03T00:00:00Z',
          fetchedAt: '2026-06-03T00:00:00.000Z',
          htmlUrl: `https://github.com/${key}`,
        },
      ];
    })
  );

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
    let releaseRuntimeCache!: () => void;
    const runtimeCacheReady = new Promise<void>((resolve) => {
      releaseRuntimeCache = resolve;
    });
    await page.route('**/runtime/github-metrics.json', async (route) => {
      await runtimeCacheReady;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          schemaVersion: 1,
          generatedAt: '2026-06-03T00:00:00.000Z',
          expiresAt: '2999-06-03T01:15:00.000Z',
          source: 'github-api',
          repos: createRuntimeCacheRepos(),
          errors: {},
        }),
      });
    });
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
    const tooltip = page.locator('.poi-tooltip-overlay');
    const starsMetric = tooltip
      .locator('.poi-tooltip-overlay__metric')
      .filter({ hasText: 'Stars' })
      .first();

    await page.keyboard.press('KeyE');
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    await expect(tooltip.locator('.poi-tooltip-overlay__title')).toHaveText(
      'Futuroptimist'
    );
    await expect(
      starsMetric.locator('.poi-tooltip-overlay__metric-value')
    ).toHaveText('Syncing from GitHub…');

    releaseRuntimeCache();
    await page.waitForFunction(
      (expectedRepoCount) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).portfolio?.githubMetrics?.getDiagnostics?.()
          ?.cachedRepoCount === expectedRepoCount,
      RUNTIME_CACHE_REPOS.length,
      { timeout: 10_000 }
    );
    await expect(
      starsMetric.locator('.poi-tooltip-overlay__metric-value')
    ).toHaveText('77 stars');

    const diagnostics = await page.evaluate<GitHubMetricsDiagnostics>(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).portfolio.githubMetrics.getDiagnostics();
    });

    expect(diagnostics).toMatchObject({
      requestCount: 0,
      lastErrorStatus: null,
      cachedRepoCount: RUNTIME_CACHE_REPOS.length,
    });
    expect(['runtime-cache', 'cached']).toContain(diagnostics.source);
    expect(liveRequests).toEqual([]);
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(tooltip).toHaveCount(1);
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
