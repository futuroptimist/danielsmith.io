import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_URL = '/?mode=immersive';

interface PerformanceSnapshot {
  averageFps: number;
  p95FrameMs: number;
  sampleCount: number;
  quality: {
    level: 'cinematic' | 'balanced' | 'performance';
    adaptive: { downgradeCount: number };
  };
  postprocessing: {
    bloomEnabled: boolean;
    composerEnabled: boolean;
    activePassCount: number;
  };
  mirror: {
    enabled: boolean;
    renderTargetSize: number;
    updateRate: number;
    renderCount: number;
    skippedCount: number;
  };
  lastFailoverReason: string | null;
}

declare global {
  interface Window {
    __performanceFailoverProbe?: { eventCount: number };
    portfolio?: {
      performance?: {
        getSnapshot(): PerformanceSnapshot;
      };
    };
  }
}

async function installFailoverProbe(page: Page) {
  await page.addInitScript(() => {
    window.__performanceFailoverProbe = { eventCount: 0 };
    window.addEventListener('performancefailover', () => {
      if (window.__performanceFailoverProbe) {
        window.__performanceFailoverProbe.eventCount += 1;
      }
    });
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
  await page.waitForFunction(() => Boolean(window.portfolio?.performance));
}

async function exerciseZoomAndPan(page: Page) {
  for (let index = 0; index < 24; index += 1) {
    await page.evaluate(
      (deltaY) => {
        const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
        canvas?.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY,
          })
        );
      },
      index % 2 === 0 ? -280 : 220
    );
    await page.keyboard.down(index % 2 === 0 ? 'ArrowUp' : 'ArrowRight');
    await page.waitForTimeout(80);
    await page.keyboard.up(index % 2 === 0 ? 'ArrowUp' : 'ArrowRight');
  }
  await page.waitForTimeout(750);
}

test.describe('immersive performance telemetry', () => {
  test.setTimeout(120_000);

  test('keeps normal CI zoom and pan immersive with production-safe diagnostics', async ({
    page,
  }) => {
    await installFailoverProbe(page);
    await waitForImmersive(page);
    await exerciseZoomAndPan(page);

    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'immersive'
    );
    await expect(page.locator('#app canvas')).toHaveCount(1);

    const failoverEvents = await page.evaluate(
      () => window.__performanceFailoverProbe?.eventCount ?? 0
    );
    expect(failoverEvents).toBe(0);

    const snapshot = await page.evaluate(() =>
      window.portfolio?.performance?.getSnapshot()
    );
    expect(snapshot).toBeDefined();
    expect(snapshot?.sampleCount).toBeGreaterThan(10);
    expect(snapshot?.averageFps ?? 0).toBeGreaterThan(12);
    expect(
      snapshot?.p95FrameMs ?? Number.POSITIVE_INFINITY
    ).toBeLessThanOrEqual(250);
    expect(snapshot?.lastFailoverReason).toBeNull();
    expect(
      snapshot?.postprocessing.activePassCount ?? -1
    ).toBeGreaterThanOrEqual(0);
    if (snapshot?.quality.level === 'performance') {
      expect(snapshot.postprocessing.bloomEnabled).toBe(false);
      expect(snapshot.postprocessing.composerEnabled).toBe(false);
      expect(snapshot.mirror.enabled).toBe(false);
    } else {
      expect(snapshot?.mirror.updateRate ?? 0).toBeLessThanOrEqual(15);
      expect(snapshot?.mirror.renderTargetSize ?? 0).toBeLessThanOrEqual(512);
      expect(snapshot?.mirror.skippedCount ?? 0).toBeGreaterThan(0);
    }
  });
});
