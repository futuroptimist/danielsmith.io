import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const PRODUCTION_LIKE_IMMERSIVE_URL = '/?mode=immersive';
const LOW_FPS_WINDOW_MS = 5_000;
const ZOOM_STRESS_DURATION_MS = LOW_FPS_WINDOW_MS + 1_500;
const ZOOM_STEP_DELAY_MS = 100;

interface NavigatorWithAutomationOverride extends Navigator {
  __defineGetter__?: (propertyName: string, getter: () => unknown) => unknown;
}

interface PerformanceFailoverProbe {
  eventCount: number;
  events: Array<unknown>;
}

interface PortfolioPerformanceWindow extends Window {
  portfolio?: {
    performance?: {
      getSnapshot(): {
        renderer: { isSoftwareRenderer: boolean };
      };
    };
  };
}

declare global {
  interface Window {
    __performanceFailoverProbe?: PerformanceFailoverProbe;
  }
}

async function installPerformanceFailoverProbe(page: Page) {
  const switchingWarnings: string[] = [];

  await page.addInitScript(() => {
    window.__performanceFailoverProbe = {
      eventCount: 0,
      events: [],
    };
    window.addEventListener('performancefailover', (event) => {
      const customEvent = event as CustomEvent<unknown>;
      window.__performanceFailoverProbe?.events.push(customEvent.detail);
      if (window.__performanceFailoverProbe) {
        window.__performanceFailoverProbe.eventCount += 1;
      }
    });
  });

  page.on('console', (message) => {
    if (
      message.type() === 'warning' &&
      message.text().includes('Switching to text fallback')
    ) {
      switchingWarnings.push(message.text());
    }
  });

  return {
    async expectNoFailover() {
      const probe = await page.evaluate(
        () => window.__performanceFailoverProbe
      );
      expect(probe?.eventCount ?? 0).toBe(0);
      expect(probe?.events ?? []).toEqual([]);
      expect(switchingWarnings).toEqual([]);
    },
  };
}

async function installProductionLikeBrowserHints(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('danielsmith.io:mode-preference');
      window.sessionStorage.removeItem('danielsmith.io:mode-preference');
    } catch {
      // Ignore inaccessible storage in hardened browser contexts.
    }

    const defineNavigatorGetter = (key: string, value: unknown) => {
      const getter = () => value;
      const navigatorTarget =
        window.navigator as NavigatorWithAutomationOverride;
      for (const target of [navigatorTarget, Navigator.prototype]) {
        try {
          Object.defineProperty(target, key, {
            configurable: true,
            get: getter,
          });
        } catch {
          // Ignore read-only browser hints that cannot be overridden.
        }
      }
      try {
        navigatorTarget.__defineGetter__?.(key, getter);
      } catch {
        // Ignore read-only browser hints that cannot be overridden.
      }
    };

    defineNavigatorGetter('webdriver', false);
    defineNavigatorGetter(
      'userAgent',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    );
    defineNavigatorGetter('hardwareConcurrency', 8);
    defineNavigatorGetter('deviceMemory', 8);
  });
}

async function waitForProductionLikeImmersive(page: Page) {
  await installProductionLikeBrowserHints(page);
  await page.goto(PRODUCTION_LIKE_IMMERSIVE_URL, {
    waitUntil: 'domcontentloaded',
  });
  await assertImmersiveCanvasOnly(page);
}

async function assertImmersiveCanvasOnly(page: Page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive',
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function wheelZoomForLongerThanFailoverWindow(page: Page) {
  await page.locator('#app canvas').hover();
  const deadline = Date.now() + ZOOM_STRESS_DURATION_MS;
  let direction = -1;

  while (Date.now() < deadline) {
    await page.mouse.wheel(0, direction * 420);
    direction *= -1;
    await page.waitForTimeout(ZOOM_STEP_DELAY_MS);
    await assertImmersiveCanvasOnly(page);
  }
}

test.describe('performance failover runtime zoom coverage', () => {
  test.setTimeout(150_000);

  test('keeps normal production-like zoom immersive while runtime failover is enabled', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    });
    const failoverProbe = await installPerformanceFailoverProbe(page);

    try {
      await waitForProductionLikeImmersive(page);
      const isSoftwareRenderer = await page.evaluate(
        () =>
          (
            window as PortfolioPerformanceWindow
          ).portfolio?.performance?.getSnapshot().renderer.isSoftwareRenderer ??
          false
      );
      test.skip(
        isSoftwareRenderer,
        'normal desktop failover coverage requires a hardware WebGL renderer'
      );
      await wheelZoomForLongerThanFailoverWindow(page);

      await failoverProbe.expectNoFailover();
      await assertImmersiveCanvasOnly(page);
    } finally {
      await context.close();
    }
  });
});
