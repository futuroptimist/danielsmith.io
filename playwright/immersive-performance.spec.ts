import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_URL = '/?mode=immersive';

interface PerformanceFailoverProbe {
  eventCount: number;
  events: Array<unknown>;
}

interface PerformanceSnapshot {
  averageFps: number;
  p95FrameMs: number;
  sampleCount: number;
  rendererSize: {
    pixelRatio: number;
    viewport: { width: number; height: number };
    drawingBuffer: { width: number; height: number };
  };
  quality: {
    level: 'cinematic' | 'balanced' | 'performance';
    adaptiveDowngradeCount: number;
  };
  features: {
    bloomEnabled: boolean;
    composerEnabled: boolean;
    activePostprocessingPassCount: number;
    mirrorEnabled: boolean;
    mirrorRenderTargetSize: number;
    mirrorUpdateRateFps: number;
    mirrorRenderCount: number;
  };
  renderer: {
    isSoftwareRenderer: boolean;
    riskLevel: 'normal' | 'software' | 'unknown';
  };
  lastFailoverReason: string | null;
}

interface PortfolioWindow extends Window {
  __performanceFailoverProbe?: PerformanceFailoverProbe;
  portfolio?: {
    performance?: {
      getSnapshot(): PerformanceSnapshot;
    };
    graphics?: {
      setCameraPanForTest?(input: { x: number; y: number }): void;
    };
  };
}

async function installProductionLikeHints(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('danielsmith.io:mode-preference');
      window.localStorage.removeItem('danielsmith:graphics-quality-level');
      window.sessionStorage.removeItem('danielsmith.io:mode-preference');
    } catch {
      // Ignore inaccessible storage in hardened browser contexts.
    }

    window.__performanceFailoverProbe = { eventCount: 0, events: [] };
    window.addEventListener('performancefailover', (event) => {
      const customEvent = event as CustomEvent<unknown>;
      window.__performanceFailoverProbe?.events.push(customEvent.detail);
      if (window.__performanceFailoverProbe) {
        window.__performanceFailoverProbe.eventCount += 1;
      }
    });

    const defineNavigatorGetter = (key: string, value: unknown) => {
      for (const target of [window.navigator, Navigator.prototype]) {
        try {
          Object.defineProperty(target, key, {
            configurable: true,
            get: () => value,
          });
        } catch {
          // Ignore read-only browser hints that cannot be overridden.
        }
      }
    };

    defineNavigatorGetter('webdriver', false);
    defineNavigatorGetter('hardwareConcurrency', 8);
    defineNavigatorGetter('deviceMemory', 8);
  });
}

async function waitForImmersive(page: Page) {
  await page.goto(IMMERSIVE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive',
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function exerciseZoomPan(page: Page) {
  const canvas = page.locator('#app canvas');
  await canvas.hover();
  const deadline = Date.now() + 4_000;
  let direction = -1;
  while (Date.now() < deadline) {
    await page.mouse.wheel(0, direction * 360);
    await page.evaluate((nextDirection) => {
      (window as PortfolioWindow).portfolio?.graphics?.setCameraPanForTest?.({
        x: 0.35 * nextDirection,
        y: 0.2,
      });
    }, direction);
    direction *= -1;
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => {
    (window as PortfolioWindow).portfolio?.graphics?.setCameraPanForTest?.({
      x: 0,
      y: 0,
    });
  });
}

async function getSnapshot(page: Page): Promise<PerformanceSnapshot> {
  const snapshot = await page.evaluate(() =>
    (window as PortfolioWindow).portfolio?.performance?.getSnapshot()
  );
  expect(snapshot).toBeDefined();
  return snapshot as PerformanceSnapshot;
}

test.describe('immersive performance diagnostics', () => {
  test.setTimeout(120_000);

  test('keeps normal desktop interaction immersive and exposes low-cost feature state', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await installProductionLikeHints(page);

    try {
      await waitForImmersive(page);
      await exerciseZoomPan(page);
      await page.waitForTimeout(500);

      await expect(page.locator('html')).toHaveAttribute(
        'data-app-mode',
        'immersive'
      );
      await expect(page.locator('#app canvas')).toHaveCount(1);

      const probe = await page.evaluate(
        () => (window as PortfolioWindow).__performanceFailoverProbe
      );
      expect(probe?.eventCount ?? 0).toBe(0);

      const snapshot = await getSnapshot(page);
      expect(snapshot.sampleCount).toBeGreaterThan(10);
      expect(snapshot.p95FrameMs).toBeLessThan(250);
      expect(snapshot.lastFailoverReason).toBeNull();
      expect(snapshot.rendererSize.pixelRatio).toBeLessThanOrEqual(1.25);
      expect(snapshot.quality.level).not.toBe('cinematic');
      expect(snapshot.features.mirrorRenderTargetSize).toBeLessThanOrEqual(320);
      if (snapshot.quality.level === 'performance') {
        expect(snapshot.features.bloomEnabled).toBe(false);
        expect(snapshot.features.composerEnabled).toBe(false);
        expect(snapshot.features.mirrorEnabled).toBe(false);
      }
    } finally {
      await context.close();
    }
  });
});
