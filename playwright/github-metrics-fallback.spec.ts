import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_GITHUB_METRICS_URL = `${IMMERSIVE_PREVIEW_URL}&enableLiveGitHubMetrics=1`;

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

const waitForImmersiveReady = async (page: Page) => {
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
};

test.describe('GitHub repo metrics fallback', () => {
  test('keeps immersive stable and suppresses fan-out when GitHub returns 403', async ({
    page,
  }) => {
    const consoleMessages = collectConsole(page);
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
    await waitForImmersiveReady(page);
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

  test('updates a POI tooltip from neutral copy to runtime cache stars', async ({
    page,
  }) => {
    let releaseRuntimeCache: (() => void) | undefined;
    const runtimeCacheRequested = new Promise<void>((resolve) => {
      page.route('/runtime/github-metrics.json', async (route) => {
        resolve();
        await new Promise<void>((release) => {
          releaseRuntimeCache = release;
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schemaVersion: 1,
            generatedAt: '2026-06-03T00:00:00.000Z',
            expiresAt: '2027-06-03T01:15:00.000Z',
            source: 'github-api',
            repos: {
              'futuroptimist/danielsmith.io': {
                owner: 'futuroptimist',
                repo: 'danielsmith.io',
                stars: 42,
                watchers: 7,
                forks: 3,
                openIssues: 1,
                pushedAt: '2026-06-03T00:00:00Z',
                fetchedAt: '2026-06-03T00:00:00.000Z',
                htmlUrl: 'https://github.com/futuroptimist/danielsmith.io',
              },
            },
          }),
        });
      });
    });
    await page.route('https://api.github.com/repos/**', (route) =>
      route.abort('blockedbyclient')
    );

    await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
    await waitForImmersiveReady(page);
    await runtimeCacheRequested;

    await page.keyboard.press('KeyE');
    const tooltip = page.locator('.poi-tooltip-overlay');
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    await expect(tooltip).toContainText('Syncing');

    releaseRuntimeCache?.();
    await page.waitForFunction(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).portfolio?.githubMetrics?.getDiagnostics?.()?.source ===
        'runtime-cache',
      undefined,
      { timeout: 10_000 }
    );

    await expect(tooltip).toContainText('42 stars');
    const diagnostics = await page.evaluate<GitHubMetricsDiagnostics>(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).portfolio.githubMetrics.getDiagnostics();
    });
    expect(diagnostics).toMatchObject({
      source: 'runtime-cache',
      requestCount: 0,
    });
  });
});
